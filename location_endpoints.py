import os.path
from datetime import datetime

from fastapi import APIRouter, Depends
import json
from resource_types import LocationRaw, ResponseCheck, LocationBitter, EventResponse, TrajectoryResponse
from datapoint_endpoints import detect_stops_dbscan, generate_stops

router = APIRouter(
    prefix="/location",
    tags=["location"],
)

def get_all_events(target_id: str)->list:
    if not os.path.isfile(f'events/{target_id}.json'):
        return []

    data = []
    with open(f'events/{target_id}.json', 'r') as f:
        for line in f:
            json_data = json.loads(line)
            data.extend(json_data)
    return data

def get_all_logs(target_id: str)->list:
    if not os.path.isfile(f'logs/{target_id}.json'):
        return []

    data = []
    with open(f'logs/{target_id}.json', 'r') as f:
        for line in f:
            json_data = json.loads(line)
            data.append(json_data)
    return data

def get_all_points(target_id: str)->list:
    if not os.path.isfile(f'trajectory/{target_id}.json'):
        return []

    data = []
    with open(f'trajectory/{target_id}.json', 'r') as f:
        for line in f:
            json_data = json.loads(line)
            data.append(json_data)
    return data

@router.get("/events/{user_id}", response_model=EventResponse)
def events_responder(user_id: str):
    total_events = get_all_events(user_id)
    return EventResponse(count=len(total_events), events=total_events)

@router.get('/trajectory/{user_id}', response_model=TrajectoryResponse)
def trajectory_responder(user_id: str):
    total_trajectory = get_all_points(user_id)
    return TrajectoryResponse(count=len(total_trajectory), trajectory=total_trajectory)

@router.post("/upload", response_model=ResponseCheck)
def location_upload(request: LocationRaw):
    status: ResponseCheck = ResponseCheck(status="Failure")
    try:
        with open(f'logs/{request.pal_id_r}.json', 'a') as f:
            f.write(f'{json.dumps({"time": request.time, "latitude": request.latitude, "longitude": request.longitude})}\n')
        if request.number % 4 == 0:
            with open(f'trajectory/{request.pal_id_r}.json', 'a') as f:
                f.write(f'{json.dumps({"time": request.time, "latitude": request.latitude, "longitude": request.longitude})}\n')
        all_locations = get_all_logs(request.pal_id_r)
        if len(all_locations) >= 80:
            generate_stops(f'events/{request.pal_id_r}.json', all_locations)

            open(f'logs/{request.pal_id_r}.json', 'w')
        status.status = "success"
        return status
    except Exception:
        return status


