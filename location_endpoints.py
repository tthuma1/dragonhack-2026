from Tools.i18n.pygettext import Location
from datetime import datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel
import json

class Location_Raw(BaseModel):
    user_id: str
    time: datetime
    longitude: float
    langitude: float

router = APIRouter(
    prefix="/location",
    tags=["location"],
)

@router.get("/{target_id}")
def location_all(target_id: str):
    data = []
    with open(f'{target_id}.json', 'r') as f:
        for line in f:
            data.append(json.loads(line))
    return {"count": len(data), "data": data}

@router.post("/upload")
def location_upload(target_id: str, location: Location_Raw):
    try:
        with open(f'{target_id}.json', 'a') as f:
            f.write(Location_Raw)
        return {"status": "Success"}
    except Exception:
        return {"status": "Failure"}


