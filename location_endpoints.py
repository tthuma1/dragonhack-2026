from datetime import datetime

from fastapi import APIRouter, Depends
import json
from resource_types import LocationRaw, ResponseCheck
from datapoint_endpoints import detect_stops_dbscan

router = APIRouter(
    prefix="/location",
    tags=["location"],
)

def get_all_events(target_id: str)->list:
    data = []
    with open(f'events/{target_id}.json', 'r') as f:
        for line in f:
            data.append(json.loads(line))
    return data

def get_all_points(target_id: str)->list:
    data = []
    with open(f'trajectory/{target_id}.json', 'r') as f:
        for line in f:
            data.append(json.loads(line))
    return data

@router.get("/events/{user_id}")
def events_responder(user_id: str):
    total_events = get_all_events(user_id)
    return total_events

@router.get('/trajectory/{user_id}')
def trajectory_responder(user_id: str):
    total_trajectory = get_all_points(user_id)
    return total_trajectory

@router.post("/upload", response_model=ResponseCheck)
def location_upload(request: LocationRaw):
    status: ResponseCheck = ResponseCheck(status="Failure")
    try:
        with open(f'{request.pal_id_r}.json', 'a') as f:
            f.write(json.dumps({"time": request.time, "lang": request.latitude, "long": request.longitude}))
        all_locations = get_all_points(request.pal_id_r)
        if len(all_locations) >= 80:

        status.status = "success"
        return status
    except Exception:
        return status


