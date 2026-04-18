import os.path

from fastapi import APIRouter, Depends
from pydantic import BaseModel
import json

from resource_types import ResponseCheck, SignUpRequest, SignInRequest

router = APIRouter(
    prefix="/auth",
    tags=["auth"],
)

def generate_pal_id_r():
    get_all_users()

def get_all_users()->list:
    if not os.path.isfile("users.json"):
        return []
    with open("users.json", 'r') as f:
        return json.load(f)

def add_user(username: str, email: str, hashed_pwd: str, pal_id_r: str):
    with open("users.json", 'a') as f:
        json.dump({"username": username, "email": email, "passwd": hashed_pwd, "pal_id_r": pal_id_r}, f)
    return True

@router.post("/sign_up", response_model=ResponseCheck)
def signing_up(request: SignUpRequest):
    if request.password != request.repassword:
        return ResponseCheck(status="Failure")

    user_list = get_all_users()
    if request.username in user_list:
        return ResponseCheck(status="Failure")

    add_user(request.username, request.email, request.password)

    return ResponseCheck(status="Success")

def user_signin_check():
    return

@router.get("sign_in", response_model=ResponseCheck)
def signing_in(request: SignInRequest):

    pass
