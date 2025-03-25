from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse
from camera import *

stream_router = APIRouter()
headers = {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "Pragma": "no-cache",
        "Expires": "0",
    }

@stream_router.get("/predict")
async def stream_predict():
    return StreamingResponse(generate_predict_camera(), media_type="text/event-stream",  headers=headers)

@stream_router.get("/train")
async def stream_train(label: str = Query(..., description="Label for training")):
    return StreamingResponse(generate_train_camera(label), media_type="text/event-stream",  headers=headers)
