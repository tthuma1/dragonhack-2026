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
}
