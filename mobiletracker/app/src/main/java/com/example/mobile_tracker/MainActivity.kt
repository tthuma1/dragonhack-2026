package com.example.mobile_tracker

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.widget.Button
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import com.example.mobile_tracker.data.AppDatabase
import com.example.mobile_tracker.service.LocationService
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.GoogleMap
import com.google.android.gms.maps.OnMapReadyCallback
import com.google.android.gms.maps.SupportMapFragment
import com.google.android.gms.maps.model.LatLng
import com.google.android.gms.maps.model.PolylineOptions
import com.google.android.gms.maps.model.TileOverlayOptions
import com.google.maps.android.heatmaps.HeatmapTileProvider
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

class MainActivity : AppCompatActivity(), OnMapReadyCallback {

    private lateinit var mMap: GoogleMap
    private val database by lazy { AppDatabase.getDatabase(this) }

    private val requestPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        if (permissions[Manifest.permission.ACCESS_FINE_LOCATION] == true) {
            startTrackingService()
        } else {
            Toast.makeText(this, "Location permission required", Toast.LENGTH_SHORT).show()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        val mapFragment = supportFragmentManager
            .findFragmentById(R.id.map) as SupportMapFragment
        mapFragment.getMapAsync(this)

        lifecycleScope.launch {
            repeatOnLifecycle(Lifecycle.State.STARTED) {
                LocationService.isRunning.collect { isRunning ->
                    val btnToggle = findViewById<Button>(R.id.btnToggle)
                    btnToggle.text = if (isRunning) "Stop Tracking" else "Start Tracking"
                }
            }
        }

        findViewById<Button>(R.id.btnToggle).setOnClickListener {
            if (LocationService.isRunning.value) {
                stopService(Intent(this, LocationService::class.java))
            } else {
                checkPermissionsAndStart()
            }
        }

        observeLocations()
    }

    override fun onMapReady(googleMap: GoogleMap) {
        mMap = googleMap
        mMap.moveCamera(CameraUpdateFactory.newLatLngZoom(LatLng(0.0, 0.0), 2f))
    }

    private fun checkPermissionsAndStart() {
        val permissions = mutableListOf(
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION
        )
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissions.add(Manifest.permission.POST_NOTIFICATIONS)
        }
        
        val missingPermissions = permissions.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }

        if (missingPermissions.isEmpty()) {
            startTrackingService()
        } else {
            requestPermissionLauncher.launch(missingPermissions.toTypedArray())
        }
    }

    private fun startTrackingService() {
        val intent = Intent(this, LocationService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(intent)
        } else {
            startService(intent)
        }
    }

    private fun observeLocations() {
        lifecycleScope.launch {
            database.locationDao().getAllLocations().collectLatest { locations ->
                if (locations.isNotEmpty()) {
                    val latLngs = locations.map { LatLng(it.latitude, it.longitude) }
                    updateMap(latLngs)
                    // Center map on last location if it's the first update
                    val last = locations.first()
                    mMap.animateCamera(CameraUpdateFactory.newLatLngZoom(LatLng(last.latitude, last.longitude), 15f))
                }
            }
        }
    }

    private fun updateMap(latLngs: List<LatLng>) {
        if (latLngs.isEmpty()) return

        mMap.clear()

        // Add Heatmap
        val provider = HeatmapTileProvider.Builder()
            .data(latLngs)
            .radius(50)
            .build()
        mMap.addTileOverlay(TileOverlayOptions().tileProvider(provider))

        // Add Path (Polyline)
        // latLngs are from newest to oldest (DESC), so reverse for chronological path
        val path = latLngs.reversed()
        if (path.size >= 2) {
            mMap.addPolyline(
                PolylineOptions()
                    .addAll(path)
                    .width(8f)
                    .color(Color.BLUE)
                    .geodesic(true)
            )
        }
    }
}
