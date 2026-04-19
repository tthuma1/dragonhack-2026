package com.example.mobile_tracker

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.content.res.ColorStateList
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.util.TypedValue
import android.view.HapticFeedbackConstants
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import com.example.mobile_tracker.data.AppDatabase
import com.example.mobile_tracker.data.SessionManager
import com.example.mobile_tracker.network.ApiClient
import com.example.mobile_tracker.service.LocationService
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.GoogleMap
import com.google.android.gms.maps.OnMapReadyCallback
import com.google.android.gms.maps.SupportMapFragment
import com.google.android.gms.maps.model.LatLng
import com.google.android.gms.maps.model.PolylineOptions
import com.google.android.gms.maps.model.TileOverlayOptions
import com.google.android.material.button.MaterialButton
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

        if (SessionManager.getToken(this) == null) {
            startActivity(Intent(this, LoginActivity::class.java))
            finish()
            return
        }

        setContentView(R.layout.activity_main)

        val mapFragment = supportFragmentManager
            .findFragmentById(R.id.map) as SupportMapFragment
        mapFragment.getMapAsync(this)

        lifecycleScope.launch {
            repeatOnLifecycle(Lifecycle.State.STARTED) {
                LocationService.isRunning.collect { isRunning ->
                    updateToggleButton(isRunning)
                }
            }
        }

        findViewById<com.google.android.material.floatingactionbutton.FloatingActionButton>(R.id.btnSignOut).setOnClickListener {
            lifecycleScope.launch {
                val token = SessionManager.getToken(this@MainActivity)
                if (token != null) {
                    try { ApiClient.service.signOut(token) } catch (_: Exception) {}
                }
                stopService(Intent(this@MainActivity, LocationService::class.java))
                SessionManager.clearSession(this@MainActivity)
                startActivity(Intent(this@MainActivity, LoginActivity::class.java))
                finish()
            }
        }

        findViewById<MaterialButton>(R.id.btnToggle).setOnClickListener {
            it.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY)
            if (LocationService.isRunning.value) {
                stopService(Intent(this, LocationService::class.java))
            } else {
                checkPermissionsAndStart()
            }
        }

        findViewById<com.google.android.material.floatingactionbutton.FloatingActionButton>(R.id.btnZoomIn).setOnClickListener {
            if (::mMap.isInitialized) {
                mMap.animateCamera(CameraUpdateFactory.zoomIn())
            }
        }

        findViewById<com.google.android.material.floatingactionbutton.FloatingActionButton>(R.id.btnZoomOut).setOnClickListener {
            if (::mMap.isInitialized) {
                mMap.animateCamera(CameraUpdateFactory.zoomOut())
            }
        }

        observeLocations()
    }

    private fun updateToggleButton(isRunning: Boolean) {
        val btnToggle = findViewById<MaterialButton>(R.id.btnToggle)
        if (isRunning) {
            btnToggle.setText(R.string.stop_tracking)
            btnToggle.setIconResource(R.drawable.ic_stop_tracking)
            btnToggle.backgroundTintList = ColorStateList.valueOf(getColorFromAttr(com.google.android.material.R.attr.colorError))
        } else {
            btnToggle.setText(R.string.start_tracking)
            btnToggle.setIconResource(R.drawable.ic_start_tracking)
            btnToggle.backgroundTintList = ColorStateList.valueOf(getColorFromAttr(com.google.android.material.R.attr.colorPrimary))
        }
    }

    private fun getColorFromAttr(attr: Int): Int {
        val typedValue = TypedValue()
        theme.resolveAttribute(attr, typedValue, true)
        return typedValue.data
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
