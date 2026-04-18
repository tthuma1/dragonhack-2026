package com.example.mobile_tracker.data

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface LocationDao {
    @Insert
    suspend fun insert(entry: LocationEntry): Long

    @Query("SELECT * FROM location_entries ORDER BY timestamp DESC")
    fun getAllLocations(): Flow<List<LocationEntry>>

    @Query("SELECT * FROM location_entries")
    suspend fun getAllLocationsList(): List<LocationEntry>

    @Query("SELECT * FROM location_entries WHERE latitude BETWEEN :lat - 0.0001 AND :lat + 0.0001 AND longitude BETWEEN :lon - 0.0001 AND :lon + 0.0001 AND poiName IS NOT NULL ORDER BY timestamp DESC LIMIT 1")
    suspend fun getNearbyExistingPoi(lat: Double, lon: Double): LocationEntry?
}
