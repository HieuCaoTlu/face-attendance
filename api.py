from fastapi import FastAPI, APIRouter, Depends, File, UploadFile, Form
from database import session, Employee, get_date, Attendance, get_time, time_to_string
from utils.speech import text_to_speech
from typing import List
from ai import train
from sqlalchemy import func

router = APIRouter()

@router.post("/employee")
async def add_employee(
    name: str = Form(...),
    position: str = Form(...),
):
    
    # Thêm nhân viên vào DB
    new_employee = Employee(name=name, position=position)
    session.add(new_employee)
    session.commit()
    session.refresh(new_employee)

    # Gọi hàm train AI
    employee_id = new_employee.id

    return {
        "employee_id": employee_id,
    }

@router.post("/speech")
async def speech(text: str = Form(...)):
    return {"audio": text_to_speech(text)}