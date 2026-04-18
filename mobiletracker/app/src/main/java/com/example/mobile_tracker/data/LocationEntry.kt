package com.example.mobile_tracker.data

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "location_entries")
data class LocationEntry(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val latitude: Double,
    val longitude: Double,
    val timestamp: Long,
    val poiType: String? = null,
    val poiName: String? = null
)
