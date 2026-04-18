from pydantic import BaseModel

class LocationRaw(BaseModel):
    pal_id_r: str
    longitude: float
    latitude: float
    time: int
    event_type: str
    event_name: str

class Event(BaseModel):
    pal_id_r: str
    longitude: float
    latitude: float
    time_from: int
    time_to: int
    event_type: list[str]
    event_name: list[str]
    event_weight: list[str]

class ResponseCheck(BaseModel):
    status: str

class SignJsonLog(BaseModel):
    username: str
    email: str
    password: str
    pal_id_r: str

class SignUpRequest(BaseModel):
    username: str
    email: str
    password: str
    repassword: str

class SignInRequest(BaseModel):
    username: str
    password: str

class SignInResponse(BaseModel):
    status: str
    token: str
    pal_id_r: str