package com.example.mobile_tracker.network

data class OverpassResponse(
    val elements: List<Element>
)

data class Element(
    val type: String,
    val id: Long,
    val lat: Double?,
    val lon: Double?,
    val tags: Map<String, String>?
)
