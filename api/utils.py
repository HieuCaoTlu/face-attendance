from fastapi import Form, UploadFile, File
from utils.speech import text_to_speech
from utils.date import get_accruate
from camera import stop_camera, train_via_video
from database import Employee, session
from fastapi import APIRouter
import os
import sys
import uuid

router = APIRouter()

@router.post("/speech", tags=["Utils"])
async def speech(text: str = Form(...)):
    return {"audio": text_to_speech(text)}

@router.get("/date", tags=["Utils"])
async def get_date():
    return {"date": get_accruate()}

@router.get("/exit", tags=["Utils"])
async def exit():
    stop_camera()
    sys.exit(0)
    exit()

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
@router.post("/train_video", tags=["Utils"])
async def train_video(video: UploadFile = File(...), name: str = Form(...),position: str = Form(...)):
    new_employee = Employee(name=name, position=position)
    session.add(new_employee)
    session.commit()
    session.refresh(new_employee)
    employee_id = new_employee.id
    video_path = os.path.join(UPLOAD_FOLDER, f"{uuid.uuid4()}.mp4")
    with open(video_path, "wb") as buffer:
        buffer.write(await video.read())
    result = train_via_video(video_path, employee_id)
    os.remove(video_path)
    if result:
        return True
    return False
