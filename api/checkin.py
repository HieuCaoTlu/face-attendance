from fastapi import Form
from database import Attendance, session
from tools import checkin
from fastapi import APIRouter

router = APIRouter()

@router.get("/checkin_temp", tags=["Checkin"])
async def all_checkins():
    result = session.query(Attendance).all()
    return result

@router.post("/checkin", tags=["Checkin"])
async def checkin_temp(id: str = Form(...)):
    result = checkin(id)
    return result

@router.delete("/checkin", tags=["Checkin"])
async def delete_checkin():
    session.query(Attendance).delete()
    session.commit()
    return session.query(Attendance).all()
