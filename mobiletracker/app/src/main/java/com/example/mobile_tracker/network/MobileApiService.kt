package com.example.mobile_tracker.network

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface MobileApiService {
    @POST("location/upload")
    suspend fun uploadLocation(@Body location: LocationRaw): ResponseCheck

    @GET("location/events/{user_id}")
    suspend fun getEvents(@Path("user_id") userId: String): Map<String, Any>?

    @GET("location/trajectory/{user_id}")
    suspend fun getTrajectory(@Path("user_id") userId: String): Map<String, Any>?

    @POST("auth/sign_up")
    suspend fun signUp(@Body req: SignUpRequest): ResponseCheck

    @POST("auth/sign_in")
    suspend fun signIn(@Body req: SignInRequest): SignInResponse

    @POST("auth/sign_out")
    suspend fun signOut(@Query("token") token: String): ResponseCheck
}
