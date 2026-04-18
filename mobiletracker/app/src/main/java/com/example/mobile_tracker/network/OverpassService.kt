package com.example.mobile_tracker.network

import retrofit2.http.GET
import retrofit2.http.Query

interface OverpassService {
    @GET("api/interpreter")
    suspend fun getNearbyPOIs(
        @Query("data") query: String
    ): OverpassResponse
}
