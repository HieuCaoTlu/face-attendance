from fastapi import FastAPI, APIRouter, Depends, File, UploadFile, Form
from database import session, Employee, get_vn_time, Attendance
from typing import List
from ai import train
from sqlalchemy import func

router = APIRouter()

@router.post("/employee")
async def add_employee(
    name: str = Form(...),
    images: List[UploadFile] = File(...)
):
    if not images:
        return {"error": "No file provided"}, 400
    
    # Thêm nhân viên vào DB
    new_employee = Employee(name=name)
    session.add(new_employee)
    session.commit()
    session.refresh(new_employee)

    # Gọi hàm train AI
    employee_id = new_employee.id
    train(images, employee_id)

    return {
        "employee_id": employee_id,
        "name": new_employee.name,
        "message": "Employee added successfully"
    }

@router.post("/checkin")
async def checkin_employee(employee_id: int = Form(...)):
    current_time = get_vn_time()
    today = current_time.date()

    # Tìm nhân viên theo ID
    employee = session.get(Employee, employee_id)
    if not employee:
        return {"error": "Employee not found"}, 404

    # Kiểm tra nếu đã có check-in hôm nay
    attendance = (
        session.query(Attendance)
        .filter(
            Attendance.employee_id == employee_id,
            func.DATE(Attendance.check_in_time) == today
        )
        .order_by(Attendance.check_in_time.desc())
        .first()
    )

    if not attendance:
        # Nếu chưa có check-in, tạo bản ghi mới
        new_attendance = Attendance(employee_id=employee_id, check_in_time=current_time)
        session.add(new_attendance)
        message = "Check-in thành công"
        check_in_time = current_time
        check_out_time = None
    else:
        # Nếu đã có, cập nhật thời gian check-out
        attendance.check_out_time = current_time
        message = "Check-out thành công"
        check_in_time = attendance.check_in_time
        check_out_time = current_time

    session.commit()

    return {
        "success": True,
        "message": message,
        "employee": {
            "id": employee.id,
            "name": employee.name,
            "check_in_time": check_in_time.strftime("%Y-%m-%d %H:%M:%S") if check_in_time else None,
            "check_out_time": check_out_time.strftime("%Y-%m-%d %H:%M:%S") if check_out_time else None
        }
    }
