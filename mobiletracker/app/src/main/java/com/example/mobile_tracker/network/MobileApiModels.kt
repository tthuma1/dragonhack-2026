package com.example.mobile_tracker.network

data class LocationRaw(
    val number: Int,
    val pal_id_r: String,
    val longitude: Double,
    val latitude: Double,
    val time: Int,
    val event_type: String,
    val event_name: String
)

data class ResponseCheck(
    val status: String
)

data class SignInRequest(
    val username: String,
    val password: String
)

data class SignInResponse(
    val status: String,
    val token: String,
    val pal_id_r: String
)

data class SignUpRequest(
    val username: String,
    val email: String,
    val password: String,
    val repassword: String
)
