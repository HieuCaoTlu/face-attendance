from fastapi import APIRouter, Form, UploadFile, File
from database import session, Employee, Complaint
from camera import generate_complaint_camera
from utils.speech import text_to_speech
from utils.date import get_accruate
from pydantic import BaseModel

router = APIRouter()

@router.post("/employee", tags=["Employee"])
async def add_employee(name: str = Form(...),position: str = Form(...)):
    # Thêm nhân viên vào DB
    new_employee = Employee(name=name, position=position)
    session.add(new_employee)
    session.commit()
    session.refresh(new_employee)

    # Gọi hàm train AI
    employee_id = new_employee.id

    return {"employee_id": employee_id,}

@router.post("/speech")
async def speech(text: str = Form(...)):
    return {"audio": text_to_speech(text)}

@router.get("/complaint", tags=["Complaint"])
async def get_complaint():
    return {"image": generate_complaint_camera()}

@router.post("/complaint", tags=["Complaint"])
async def add_complaint(
    image: UploadFile = File(...),
    employee_id: int = Form(...),
    reason: str = Form(...)
):
    image_bytes = await image.read()
    complaint = Complaint(employee_id=employee_id, reason=reason, image=image_bytes)
    session.add(complaint)
    session.commit()
    session.refresh(complaint)
    return {
        "id": complaint.id,
        "created_at": complaint.created_at.isoformat(),
        "reason": complaint.reason
    }

@router.get("/employee", tags=["Employee"])
async def employees():
    employees = session.query(Employee.id, Employee.name).all()
    employee_list = [{"id": emp.id, "name": emp.name} for emp in employees]
    return {"employees": employee_list}

@router.get("/date", tags=["Utils"])
async def get_date():
    return {"date": get_accruate()}