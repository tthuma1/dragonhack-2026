package com.example.mobile_tracker.service

import android.app.*
import android.content.Context
import android.content.Intent
import android.location.Location
import android.os.IBinder
import android.os.Looper
import android.util.Log
import androidx.core.app.NotificationCompat
import com.example.mobile_tracker.R
import com.example.mobile_tracker.data.AppDatabase
import com.example.mobile_tracker.data.LocationEntry
import com.example.mobile_tracker.network.OverpassResponse
import com.example.mobile_tracker.network.OverpassService
import com.google.android.gms.location.*
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import com.example.mobile_tracker.data.SessionManager
import com.example.mobile_tracker.network.ApiClient
import com.example.mobile_tracker.network.LocationRaw

class  LocationService : Service() {

    companion object {
        private val _isRunning = MutableStateFlow(false)
        val isRunning = _isRunning.asStateFlow()
    }

    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private lateinit var locationCallback: LocationCallback
    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    
    private val overpassService: OverpassService by lazy {
        val client = OkHttpClient.Builder()
            .addInterceptor { chain ->
                val request = chain.request().newBuilder()
                    .header("User-Agent", "MobileTracker/1.0 (Android; contact: developer@example.com)")
                    .header("Accept", "application/json")
                    .build()
                chain.proceed(request)
            }
            .build()

        Retrofit.Builder()
            .baseUrl("https://overpass-api.de/")
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(OverpassService::class.java)
    }

    override fun onCreate() {
        super.onCreate()
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)
        
        locationCallback = object : LocationCallback() {
            override fun onLocationResult(locationResult: LocationResult) {
                locationResult.lastLocation?.let { location ->
                    processLocation(location)
                }
            }
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        _isRunning.value = true
        startForegroundService()
        requestLocationUpdates()
        return START_STICKY
    }

    private fun startForegroundService() {
        val channelId = "location_channel"
        val channelName = "Location Tracking"
        val channel = NotificationChannel(channelId, channelName, NotificationManager.IMPORTANCE_LOW)
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.createNotificationChannel(channel)

        val notification = NotificationCompat.Builder(this, channelId)
            .setContentTitle("Tracking Location")
            .setContentText("Identifying nearby places...")
            .setSmallIcon(R.mipmap.ic_launcher)
            .build()

        startForeground(1, notification)
    }

    private fun requestLocationUpdates() {
        val locationRequest = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 10000)
            .setMinUpdateIntervalMillis(5000)
            .build()

        try {
            fusedLocationClient.requestLocationUpdates(
                locationRequest,
                locationCallback,
                Looper.getMainLooper()
            )
        } catch (e: SecurityException) {
            Log.e("LocationService", "Permission denied", e)
        }
    }

    private fun processLocation(location: Location) {
        serviceScope.launch {
            val db = AppDatabase.getDatabase(applicationContext)
            val locationDao = db.locationDao()

            // Check if we already have a POI for this location (or very close to it)
            val existingPoi = locationDao.getNearbyExistingPoi(location.latitude, location.longitude)
            
            val poiInfo = if (existingPoi != null) {
                Log.d("LocationService", "Using cached POI for ${location.latitude}, ${location.longitude}: ${existingPoi.poiName}")
                Pair(existingPoi.poiType, existingPoi.poiName)
            } else {
                fetchNearbyPOI(location.latitude, location.longitude)
            }

            val entry = LocationEntry(
                latitude = location.latitude,
                longitude = location.longitude,
                timestamp = System.currentTimeMillis(),
                poiType = poiInfo?.first,
                poiName = poiInfo?.second
            )
            locationDao.insert(entry)
            serviceScope.launch {
                try {
                    val payload = LocationRaw(
                        number = SessionManager.nextUploadNumber(applicationContext),
                        pal_id_r = SessionManager.getPalIdR(applicationContext),
                        longitude = entry.longitude,
                        latitude = entry.latitude,
                        time = (entry.timestamp / 1000).toInt(),
                        event_type = "location",
                        event_name = "gps",
                        poi_type = entry.poiType,
                        poi_name = entry.poiName
                    )
                    ApiClient.service.uploadLocation(payload)
                } catch (e: Exception) {
                    Log.e("LocationService", "Failed uploading location", e)
                }
            }
            Log.d("LocationService", "Saved location: ${location.latitude}, ${location.longitude} - POI: ${poiInfo?.second}")
        }
    }

    private suspend fun fetchNearbyPOI(lat: Double, lon: Double): Pair<String?, String?>? {
        return try {
            // Overpass query for various POI types within 50m
            val query = "[out:json];(node(around:50,$lat,$lon)[amenity];way(around:50,$lat,$lon)[amenity];node(around:50,$lat,$lon)[shop];way(around:50,$lat,$lon)[shop];node(around:50,$lat,$lon)[leisure];way(around:50,$lat,$lon)[leisure];node(around:50,$lat,$lon)[tourism];way(around:50,$lat,$lon)[tourism];);out tags center 1;"
            val response = overpassService.getNearbyPOIs(query)
            val element = response.elements.firstOrNull()
            if (element != null) {
                val tags = element.tags
                val name = tags?.get("name")
                val type = tags?.get("amenity") 
                    ?: tags?.get("shop") 
                    ?: tags?.get("leisure") 
                    ?: tags?.get("tourism") 
                    ?: "poi"
                Pair(type, name)
            } else null
        } catch (e: Exception) {
            Log.e("LocationService", "Error fetching POI", e)
            null
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        super.onDestroy()
        _isRunning.value = false
        fusedLocationClient.removeLocationUpdates(locationCallback)
        serviceScope.cancel()
    }
}
