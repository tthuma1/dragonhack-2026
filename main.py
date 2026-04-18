from fastapi import FastAPI
import location_endpoints
import datapoint_endpoints

app = FastAPI()
app.include_router(location_endpoints.router)
app.include_router(datapoint_endpoints.router)
