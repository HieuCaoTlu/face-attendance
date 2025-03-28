from fastapi import FastAPI, APIRouter, Depends, File, UploadFile, Form, HTTPException
from database import session, Employee, get_date, Attendance, get_time, time_to_string, Shift
from utils.speech import text_to_speech
from typing import List
from ai import train
from sqlalchemy import func
from datetime import datetime

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

@router.get("/shifts")
async def get_shifts():
    """Lấy danh sách ca làm việc"""
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

@router.get("/attendance/{employee_id}")
async def get_attendance(employee_id: int):
    """Lấy lịch sử chấm công của nhân viên theo ngày"""
    today = get_date()
    
    # Tìm nhân viên
    employee = session.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhân viên")
    
    # Lấy danh sách chấm công trong ngày
    attendances = (
        session.query(Attendance)
        .filter(Attendance.employee_id == employee_id, Attendance.date == today)
        .order_by(Attendance.checkin)
        .all()
    )
    
    result = []
    for attendance in attendances:
        shift = session.query(Shift).filter(Shift.id == attendance.shift_id).first()
        
        result.append({
            "id": attendance.id,
            "shift_name": shift.name if shift else "Unknown",
            "shift_id": attendance.shift_id,
            "date": date_to_string(attendance.date),
            "checkin": time_to_string(attendance.checkin),
            "checkout": time_to_string(attendance.checkout) if attendance.checkout else None,
            "checkin_status": attendance.checkin_status,
            "checkout_status": attendance.checkout_status,
        })
    
    return {
        "employee": {
            "id": employee.id,
            "name": employee.name,
            "position": employee.position
        },
        "attendances": result
    }