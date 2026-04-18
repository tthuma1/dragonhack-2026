from fastapi import FastAPI

import auth_endpoints
import location_endpoints
import datapoint_endpoints

app = FastAPI()
app.include_router(location_endpoints.router)
app.include_router(auth_endpoints.router)