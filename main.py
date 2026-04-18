from fastapi import FastAPI
from location_endpoints import router

app = FastAPI()

app.include_router(router)

