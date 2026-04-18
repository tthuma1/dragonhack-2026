from fastapi import FastAPI, Query, HTTPException, APIRouter
from pydantic import BaseModel
from typing import Optional
import httpx

router = APIRouter(
    prefix="/datapoint",
    tags=["datapoint"],
)

GOOGLE_API_KEY = "YOUR_GOOGLE_API_KEY"  # Set via env var in production


# --- Response Models ---

class Place(BaseModel):
    name: str
    purpose: str          # e.g. cafe, college, restaurant
    category: str         # broader category e.g. food, education
    distance_m: Optional[float] = None
    address: Optional[str] = None
    lat: float
    lng: float
    source: str           # "nominatim" or "google"


class LocationResponse(BaseModel):
    lat: float
    lng: float
    radius_m: int
    places: list[Place]


# --- Nominatim (free, no key needed) ---

async def resolve_nominatim(lat: float, lng: float, radius_m: int) -> list[Place]:
    """
    Uses OSM Overpass API to find POIs within a radius.
    Returns places with their OSM amenity/shop/leisure tags as purpose.
    """
    # Overpass QL: find nodes with useful tags within radius
    overpass_query = f"""
    [out:json][timeout:10];
    (
      node["amenity"](around:{radius_m},{lat},{lng});
      node["shop"](around:{radius_m},{lat},{lng});
      node["leisure"](around:{radius_m},{lat},{lng});
      node["tourism"](around:{radius_m},{lat},{lng});
    );
    out body;
    """

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://overpass-api.de/api/interpreter",
            data={"data": overpass_query},
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()

    places = []
    for el in data.get("elements", []):
        tags = el.get("tags", {})
        name = tags.get("name")
        if not name:
            continue

        purpose = (
            tags.get("amenity")
            or tags.get("shop")
            or tags.get("leisure")
            or tags.get("tourism")
            or "unknown"
        )
        category = osm_category(purpose)

        places.append(Place(
            name=name,
            purpose=purpose.replace("_", " "),
            category=category,
            lat=el["lat"],
            lng=el["lon"],
            address=tags.get("addr:street", ""),
            source="nominatim/osm",
        ))

    return places


def osm_category(purpose: str) -> str:
    """Map OSM tags to broad categories."""
    mapping = {
        "cafe": "food", "restaurant": "food", "fast_food": "food",
        "bar": "food", "pub": "food", "bakery": "food",
        "university": "education", "college": "education", "school": "education",
        "library": "education", "kindergarten": "education",
        "hospital": "health", "clinic": "health", "pharmacy": "health", "doctors": "health",
        "supermarket": "shopping", "convenience": "shopping", "clothes": "shopping",
        "hotel": "accommodation", "hostel": "accommodation", "motel": "accommodation",
        "park": "leisure", "gym": "leisure", "sports_centre": "leisure",
        "museum": "tourism", "gallery": "tourism", "attraction": "tourism",
        "bank": "finance", "atm": "finance",
        "bus_station": "transport", "fuel": "transport", "parking": "transport",
    }
    return mapping.get(purpose, "other")


# --- Google Places (requires API key, richer data) ---

async def resolve_google(lat: float, lng: float, radius_m: int) -> list[Place]:
    """
    Uses Google Places Nearby Search to find POIs within a radius.
    """
    url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
    params = {
        "location": f"{lat},{lng}",
        "radius": radius_m,
        "key": GOOGLE_API_KEY,
    }

    async with httpx.AsyncClient() as client:
        resp = await client.get(url, params=params, timeout=10)
        resp.raise_for_status()
        data = resp.json()

    if data.get("status") not in ("OK", "ZERO_RESULTS"):
        raise HTTPException(502, f"Google Places error: {data.get('status')}")

    places = []
    for result in data.get("results", []):
        types = result.get("types", [])
        purpose = types[0].replace("_", " ") if types else "unknown"
        category = google_category(types)

        geo = result["geometry"]["location"]
        places.append(Place(
            name=result["name"],
            purpose=purpose,
            category=category,
            lat=geo["lat"],
            lng=geo["lng"],
            address=result.get("vicinity", ""),
            source="google",
        ))

    return places


def google_category(types: list[str]) -> str:
    """Map Google place types to broad categories."""
    type_set = set(types)
    if type_set & {"cafe", "restaurant", "food", "bakery", "bar", "meal_takeaway"}:
        return "food"
    if type_set & {"university", "school", "secondary_school", "primary_school"}:
        return "education"
    if type_set & {"hospital", "doctor", "pharmacy", "health", "dentist"}:
        return "health"
    if type_set & {"store", "supermarket", "shopping_mall", "clothing_store"}:
        return "shopping"
    if type_set & {"lodging", "hotel"}:
        return "accommodation"
    if type_set & {"park", "gym", "stadium", "amusement_park", "zoo"}:
        return "leisure"
    if type_set & {"museum", "tourist_attraction", "art_gallery"}:
        return "tourism"
    if type_set & {"bank", "atm", "finance"}:
        return "finance"
    if type_set & {"bus_station", "transit_station", "subway_station", "gas_station"}:
        return "transport"
    return "other"


# --- Endpoints ---

@router.get("/resolve/osm", response_model=LocationResponse)
async def resolve_osm(
    lat: float = Query(..., description="Latitude"),
    lng: float = Query(..., description="Longitude"),
    radius: int = Query(200, ge=10, le=5000, description="Search radius in meters"),
):
    """
    Resolve coordinates to nearby places using OpenStreetMap (free, no key required).
    """
    places = await resolve_nominatim(lat, lng, radius)
    return LocationResponse(lat=lat, lng=lng, radius_m=radius, places=places)


@router.get("/resolve/google", response_model=LocationResponse)
async def resolve_google_endpoint(
    lat: float = Query(..., description="Latitude"),
    lng: float = Query(..., description="Longitude"),
    radius: int = Query(200, ge=10, le=5000, description="Search radius in meters"),
):
    """
    Resolve coordinates to nearby places using Google Places API (requires API key).
    """
    places = await resolve_google(lat, lng, radius)
    return LocationResponse(lat=lat, lng=lng, radius_m=radius, places=places)


@router.get("/resolve", response_model=LocationResponse)
async def resolve_combined(
    lat: float = Query(..., description="Latitude"),
    lng: float = Query(..., description="Longitude"),
    radius: int = Query(200, ge=10, le=5000, description="Search radius in meters"),
    provider: str = Query("osm", enum=["osm", "google", "both"], description="Data provider"),
):
    """
    Resolve coordinates using OSM, Google, or both combined.
    """
    if provider == "osm":
        places = await resolve_nominatim(lat, lng, radius)
    elif provider == "google":
        places = await resolve_google(lat, lng, radius)
    else:
        osm_places = await resolve_nominatim(lat, lng, radius)
        google_places = await resolve_google(lat, lng, radius)
        # Deduplicate by name (simple approach)
        seen = {p.name.lower() for p in osm_places}
        unique_google = [p for p in google_places if p.name.lower() not in seen]
        places = osm_places + unique_google

    return LocationResponse(lat=lat, lng=lng, radius_m=radius, places=places)