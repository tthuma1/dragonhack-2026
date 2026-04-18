import os.path
import secrets
import bcrypt

from fastapi import APIRouter, HTTPException
import json

from resource_types import ResponseCheck, SignInResponse, SignUpRequest, SignInRequest, SignJsonLog

_sessions: dict[str, str] = {}

router = APIRouter(
    prefix="/auth",
    tags=["auth"],
)


def generate_pal_id_r() -> str:
    existing = [user.pal_id_r for user in get_all_users()]
    while True:
        candidate = secrets.token_hex(8)
        if candidate not in existing:
            return candidate


def get_all_users() -> list[SignJsonLog]:
    if not os.path.isfile("users.json"):
        return []
    with open("users.json", "r") as f:
        return json.load(f)


def add_user(username: str, email: str, hashed_pwd: str, pal_id_r: str):
    users = get_all_users()
    users.append(SignJsonLog(username=username, email=email, password=hashed_pwd, pal_id_r=pal_id_r))
    with open("users.json", "w") as f:
        json.dump(users, f)


def user_signin_check(username: str, passwd: str) -> bool:
    user_list = get_all_users()
    user_entry = next((u for u in user_list if u.username == username), None)
    if user_entry is None:
        return False
    return bcrypt.checkpw(passwd.encode(), user_entry.password.encode())


@router.post("/sign_up", response_model=ResponseCheck)
def signing_up(request: SignUpRequest):
    if request.password != request.repassword:
        raise HTTPException(status_code=400, detail="Passwords do not match")

    user_list = get_all_users()
    if any(user.username == request.username for user in user_list):
        raise HTTPException(status_code=409, detail="Username already taken")
    if any(user.email == request.email for user in user_list):
        raise HTTPException(status_code=409, detail="Email already registered")

    hashed_pwd = bcrypt.hashpw(request.password.encode(), bcrypt.gensalt()).decode()
    pal_id_r = generate_pal_id_r()
    add_user(request.username, request.email, hashed_pwd, pal_id_r)

    return ResponseCheck(status="Success")


@router.post("/sign_in", response_model=SignInResponse)
def signing_in(request: SignInRequest):
    if not user_signin_check(request.username, request.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    user_list = get_all_users()
    user_entry = next(user for user in user_list if user.username == request.username)

    token = secrets.token_hex(32)
    _sessions[token] = user_entry.pal_id_r
    return SignInResponse(status="Success", token=token, pal_id_r=user_entry.pal_id_r)


@router.post("/sign_out", response_model=ResponseCheck)
def signing_out(token: str):
    if token not in _sessions:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    del _sessions[token]
    return ResponseCheck(status="Success")

def get_current_user(token: str) -> str:
    pal_id_r = _sessions.get(token)
    if pal_id_r is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return pal_id_r
