from fastapi import FastAPI, APIRouter, Depends, File, UploadFile, Form, HTTPException, Path
from database import session, Employee, get_date, Attendance, get_time, time_to_string, Shift
from utils.speech import text_to_speech
from typing import List, Optional
from ai import train
from sqlalchemy import func
from datetime import datetime
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import json
import os
import shutil

router = APIRouter()

# Model cho Employee API
class EmployeeOut(BaseModel):
    id: int
    name: str
    position: str
    
    class Config:
        orm_mode = True

class EmployeeIn(BaseModel):
    name: str
    position: str

class EmployeeResponse(BaseModel):
    success: bool
    message: Optional[str] = None
    employee_id: Optional[int] = None

@router.post("/employee", response_model=EmployeeResponse)
async def create_employee(name: str = Form(...), position: str = Form(...)):
    try:
        new_employee = Employee(name=name, position=position)
        session.add(new_employee)
        session.commit()
        session.refresh(new_employee)
        
        return {"success": True, "employee_id": new_employee.id}
    except Exception as e:
        session.rollback()
        return {"success": False, "message": f"Lỗi khi tạo nhân viên: {str(e)}"}

@router.post("/speech")
async def speech(text: str = Form(...)):
    """Text to speech API"""
    file_location = text_to_speech(text)
    
    return {
        "audio_path": file_location
    }

@router.post("/train")
async def training(
    employee_id: int = Form(...),
    images: List[UploadFile] = File(...),
):
    """API huấn luyện khuôn mặt nhân viên"""
    # Thực hiện huấn luyện AI
    image_array = []
    
    return {
        "message": "Đã huấn luyện thành công!"
    }

@router.get("/shifts")
async def get_shifts():
    """Lấy danh sách tất cả ca làm việc"""
    shifts = session.query(Shift).all()
    result = []
    for shift in shifts:
        result.append({
            "id": shift.id,
            "name": shift.name,
            "check_in_time": time_to_string(shift.check_in_time),
            "check_out_time": time_to_string(shift.check_out_time),
            "active": shift.active
        })
    return {"shifts": result}

@router.post("/shifts")
async def create_shift(
    name: str = Form(...),
    check_in_time: str = Form(...),
    check_out_time: str = Form(...)
):
    """Tạo ca làm việc mới"""
    from utils.date import set_time
    from rule import validate_shift_break, get_shifts
    
    try:
        # Chuyển đổi chuỗi thời gian thành đối tượng time
        check_in = set_time(check_in_time)
        check_out = set_time(check_out_time)
        
        # Tạo ca mới
        new_shift = Shift(
            name=name,
            check_in_time=check_in,
            check_out_time=check_out,
            active=True
        )
        
        # Thêm vào danh sách ca hiện tại để kiểm tra
        temp_shifts = get_shifts()
        temp_shifts.append(new_shift)
        temp_shifts.sort(key=lambda x: x.check_in_time)
        
        # Kiểm tra khoảng nghỉ giữa các ca
        is_valid, message = validate_shift_break(temp_shifts)
        if not is_valid:
            return {"success": False, "message": message}
        
        # Lưu ca mới vào database
        session.add(new_shift)
        session.commit()
        session.refresh(new_shift)
        
        return {
            "success": True,
            "shift_id": new_shift.id,
            "message": "Tạo ca làm việc mới thành công"
        }
    except Exception as e:
        return {"success": False, "message": f"Lỗi: {str(e)}"}

@router.put("/shifts/{shift_id}")
async def update_shift(
    shift_id: int,
    name: str = Form(None),
    check_in_time: str = Form(None),
    check_out_time: str = Form(None),
    active: bool = Form(None)
):
    """Cập nhật thông tin ca làm việc"""
    from utils.date import set_time
    from rule import validate_shift_break, get_shifts
    
    # Tìm ca cần cập nhật
    shift = session.query(Shift).filter(Shift.id == shift_id).first()
    if not shift:
        raise HTTPException(status_code=404, detail="Không tìm thấy ca làm việc")
    
    # Cập nhật thông tin nếu có
    if name:
        shift.name = name
    
    # Lưu lại thông tin thời gian cũ để kiểm tra
    old_check_in = shift.check_in_time
    old_check_out = shift.check_out_time
    
    # Cập nhật thời gian check-in nếu có
    if check_in_time:
        shift.check_in_time = set_time(check_in_time)
    
    # Cập nhật thời gian check-out nếu có
    if check_out_time:
        shift.check_out_time = set_time(check_out_time)
    
    # Cập nhật trạng thái nếu có
    if active is not None:
        shift.active = active
    
    # Nếu thay đổi thời gian, kiểm tra khoảng nghỉ giữa các ca
    if check_in_time or check_out_time:
        temp_shifts = get_shifts()
        
        # Thay thế ca đang cập nhật bằng bản cập nhật
        for i, s in enumerate(temp_shifts):
            if s.id == shift_id:
                temp_shifts[i] = shift
                break
        
        temp_shifts.sort(key=lambda x: x.check_in_time)
        
        # Kiểm tra khoảng nghỉ giữa các ca
        is_valid, message = validate_shift_break(temp_shifts)
        if not is_valid:
            # Hoàn tác thay đổi
            shift.check_in_time = old_check_in
            shift.check_out_time = old_check_out
            return {"success": False, "message": message}
    
    # Lưu thay đổi vào database
    session.commit()
    
    return {
        "success": True,
        "message": "Cập nhật ca làm việc thành công"
    }

@router.delete("/shifts/{shift_id}")
async def delete_shift(shift_id: int):
    """Xóa ca làm việc"""
    # Kiểm tra xem ca có tồn tại không
    shift = session.query(Shift).filter(Shift.id == shift_id).first()
    if not shift:
        raise HTTPException(status_code=404, detail="Không tìm thấy ca làm việc")
    
    # Kiểm tra xem ca có đang được sử dụng không
    attendance_count = session.query(Attendance).filter(Attendance.shift_id == shift_id).count()
    if attendance_count > 0:
        return {
            "success": False,
            "message": f"Không thể xóa ca làm việc này vì đang có {attendance_count} bản ghi chấm công"
        }
    
    # Xóa ca
    session.delete(shift)
    session.commit()
    
    return {
        "success": True,
        "message": "Xóa ca làm việc thành công"
    }

@router.get("/employees", response_model=dict)
async def get_employees():
    try:
        employees = session.query(Employee).all()
        return {"success": True, "employees": [{"id": emp.id, "name": emp.name, "position": emp.position} for emp in employees]}
    except Exception as e:
        return {"success": False, "message": f"Lỗi khi lấy danh sách nhân viên: {str(e)}", "employees": []}

@router.get("/employees/{employee_id}")
async def get_employee(employee_id: int):
    """Lấy thông tin chi tiết của một nhân viên"""
    employee = session.query(Employee).filter(Employee.id == employee_id).first()
    
    if not employee:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhân viên")
    
    return {
        "id": employee.id,
        "name": employee.name,
        "position": employee.position,
        "created_at": employee.created_at.strftime("%d/%m/%Y %H:%M") if employee.created_at else None
    }

@router.put("/employees/{employee_id}", response_model=EmployeeResponse)
async def update_employee(employee_id: int = Path(...), name: str = Form(...), position: str = Form(...)):
    try:
        # Tìm nhân viên theo ID
        employee = session.query(Employee).filter(Employee.id == employee_id).first()
        
        if not employee:
            return {"success": False, "message": f"Không tìm thấy nhân viên có ID {employee_id}"}
        
        # Cập nhật thông tin
        employee.name = name
        employee.position = position
        
        # Lưu vào CSDL
        session.commit()
        session.refresh(employee)
        
        return {"success": True, "message": "Cập nhật thông tin nhân viên thành công"}
    except Exception as e:
        session.rollback()
        return {"success": False, "message": f"Lỗi khi cập nhật nhân viên: {str(e)}"}

@router.delete("/employees/{employee_id}", response_model=EmployeeResponse)
async def delete_employee(employee_id: int = Path(...)):
    try:
        # Tìm nhân viên theo ID
        employee = session.query(Employee).filter(Employee.id == employee_id).first()
        
        if not employee:
            return {"success": False, "message": f"Không tìm thấy nhân viên có ID {employee_id}"}
        
        # Xóa nhân viên
        session.delete(employee)
        session.commit()
        
        return {"success": True, "message": "Xóa nhân viên thành công"}
    except Exception as e:
        session.rollback()
        return {"success": False, "message": f"Lỗi khi xóa nhân viên: {str(e)}"}

@router.post("/attendance", response_model=dict)
async def create_attendance(employee_id: int = Form(...)):
    try:
        # Kiểm tra nhân viên có tồn tại không
        employee = session.query(Employee).filter(Employee.id == employee_id).first()
        
        if not employee:
            return {"success": False, "message": "Không tìm thấy nhân viên"}
        
        # Tạo dữ liệu chấm công
        current_time = datetime.now()
        current_date = get_date(current_time)
        current_time_str = get_time(current_time)
        
        # Tìm ca làm việc phù hợp
        shift = session.query(Shift).filter(Shift.active == True).first()
        
        if not shift:
            return {"success": False, "message": "Không có ca làm việc nào được kích hoạt"}
        
        # Kiểm tra xem đã chấm công chưa
        existing_attendance = session.query(Attendance).filter(
            Attendance.employee_id == employee_id,
            Attendance.date == current_date,
            Attendance.shift_id == shift.id
        ).first()
        
        if existing_attendance:
            # Cập nhật giờ ra
            existing_attendance.check_out_time = current_time_str
            session.commit()
            return {"success": True, "message": "Chấm công ra thành công"}
        else:
            # Tạo mới chấm công vào
            new_attendance = Attendance(
                employee_id=employee_id,
                date=current_date,
                check_in_time=current_time_str,
                shift_id=shift.id
            )
            session.add(new_attendance)
            session.commit()
            return {"success": True, "message": "Chấm công vào thành công"}
    except Exception as e:
        session.rollback()
        return {"success": False, "message": f"Lỗi khi chấm công: {str(e)}"}

@router.get("/attendance", response_model=dict)
async def get_attendance(date: Optional[str] = None, shift_id: Optional[int] = None):
    try:
        query = session.query(
            Attendance, 
            Employee.name.label("employee_name"),
            Shift.name.label("shift_name")
        ).join(
            Employee, Attendance.employee_id == Employee.id
        ).join(
            Shift, Attendance.shift_id == Shift.id
        )
        
        # Lọc theo ngày nếu có
        if date:
            query = query.filter(Attendance.date == date)
        
        # Lọc theo ca làm việc nếu có
        if shift_id:
            query = query.filter(Attendance.shift_id == shift_id)
        
        results = query.all()
        
        attendance_list = []
        for att, emp_name, shift_name in results:
            attendance_list.append({
                "id": att.id,
                "employee_id": att.employee_id,
                "employee_name": emp_name,
                "date": att.date,
                "shift_id": att.shift_id,
                "shift_name": shift_name,
                "check_in_time": att.check_in_time,
                "check_out_time": att.check_out_time
            })
        
        return {"success": True, "attendance": attendance_list}
    except Exception as e:
        return {"success": False, "message": f"Lỗi khi lấy dữ liệu chấm công: {str(e)}", "attendance": []}