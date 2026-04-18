# Project Overview: Mobile Tracker

This project is an Android application designed to track user location in the background, identify nearby Points of Interest (POIs) using the Overpass API, and visualize the collected data on a heatmap.

## Component Descriptions

### 1. UI and Visualization (`MainActivity.kt`)
*   **Purpose**: Provides the main user interface for the application.
*   **Key Functions**:
    *   **Map Integration**: Uses Google Maps API to display the user's history.
    *   **Heatmap**: Visualizes location density using `HeatmapTileProvider` from the Google Maps Utility library.
    *   **Service Control**: Allows users to start and stop the background tracking service.
    *   **Permission Management**: Handles runtime requests for Location and Notification permissions.

### 2. Background Tracking (`LocationService.kt`)
*   **Purpose**: A Foreground Service that runs independently of the UI to collect location data.
*   **Key Functions**:
    *   **Location Updates**: Uses Google Play Services `FusedLocationProviderClient` for high-accuracy tracking.
    *   **Context Enrichment**: Queries the Overpass API (OpenStreetMap) to find amenities (e.g., cafes, parks) near the current coordinates.
    *   **Persistence**: Saves every tracked point with its POI metadata into the local database.

### 3. Data Layer (`com.example.mobile_tracker.data`)
*   **`LocationEntry`**: The data model representing a single recorded location, including latitude, longitude, timestamp, and optional POI details (type and name).
*   **`LocationDao`**: Defines the database operations, including inserting new points and streaming the entire history via Kotlin Flows for real-time UI updates.
*   **`AppDatabase`**: The Room database singleton that manages the SQLite storage.

### 4. Network Layer (`com.example.mobile_tracker.network`)
*   **`OverpassService`**: A Retrofit interface that defines the communication with the Overpass API interpreter.
*   **`OverpassResponse`**: Modern Kotlin data classes used for type-safe parsing of JSON responses from OpenStreetMap.

## Technology Stack
*   **Language**: Kotlin
*   **Database**: Room (SQLite)
*   **Networking**: Retrofit & OkHttp
*   **Location**: Google Play Services Location API
*   **Maps**: Google Maps SDK & Maps SDK Utilities (Heatmaps)
*   **Concurrency**: Kotlin Coroutines & Flow
