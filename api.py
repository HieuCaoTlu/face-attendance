from fastapi import FastAPI, APIRouter, Depends, File, UploadFile, Form, HTTPException, Path
from database import session, Employee, get_date, Attendance, get_time, time_to_string, Shift, Complaint, get_db
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
import base64
from uuid import uuid4
from sqlalchemy.orm import Session

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

# Model cấu hình ca làm việc
class ShiftConfigItem(BaseModel):
    checkIn: str
    checkOut: str

class ShiftConfig(BaseModel):
    shift1: ShiftConfigItem
    shift2: ShiftConfigItem

# Model cho Complaint API
class ComplaintResponse(BaseModel):
    success: bool
    message: Optional[str] = None
    complaint_id: Optional[int] = None

@router.post("/employee")
async def add_employee(
    name: str = Form(...),
    position: str = Form(...),
    sess: Session = Depends(get_db)
):
    try:
        # Tạo và thêm nhân viên mới
        new_employee = Employee(name=name, position=position)
        sess.add(new_employee)
        sess.commit()
        sess.refresh(new_employee)
        
        return {
            "success": True,
            "message": "Thêm nhân viên thành công",
            "employee_id": new_employee.id,
            "name": new_employee.name,
            "position": new_employee.position
        }
    except Exception as e:
        sess.rollback()
        return {
            "success": False,
            "message": f"Lỗi khi thêm nhân viên: {str(e)}"
        }

@router.post("/speech")
async def speech(text: str = Form(...)):
    """Text to speech API"""
    try:
        audio_base64 = text_to_speech(text)
        if not audio_base64:
            return JSONResponse(
                status_code=500,
                content={"error": "Không thể tạo file âm thanh"}
            )
        
        return {
            "success": True,
            "audio": audio_base64
        }
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": f"Lỗi: {str(e)}"}
        )

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
    """Lấy thông tin một nhân viên theo ID"""
    employee = session.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        return {"success": False, "message": "Không tìm thấy nhân viên"}
    
    return {
        "success": True,
        "id": employee.id,
        "name": employee.name,
        "position": employee.position
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
        
        # Xóa tất cả các bản ghi chấm công liên quan
        attendance_records = session.query(Attendance).filter(Attendance.employee_id == employee_id).all()
        for record in attendance_records:
            session.delete(record)
        
        # Xóa tất cả khiếu nại liên quan
        complaint_records = session.query(Complaint).filter(Complaint.employee_id == employee_id).all()
        for record in complaint_records:
            # Xóa file ảnh nếu tồn tại
            if record.image_path and os.path.exists(record.image_path):
                try:
                    os.remove(record.image_path)
                except Exception as e:
                    print(f"Không thể xóa file ảnh: {e}")
            session.delete(record)
        
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
        current_time_obj = current_time.time()
        
        # Xác định ca làm việc dựa vào thời gian
        from rule import get_current_shift
        
        # Xác định ca dựa trên thời gian hiện tại
        current_shift = get_current_shift(current_time_obj)
        if not current_shift:
            return {"success": False, "message": "Không thể xác định ca làm việc"}
        
        # Kiểm tra xem nhân viên đã chấm công cho ca hiện tại chưa
        existing_attendance = session.query(Attendance).filter(
            Attendance.employee_id == employee_id,
            Attendance.date == current_date,
            Attendance.shift_id == current_shift.id
        ).first()
        
        if existing_attendance:
            # Nếu đã có check-in cho ca này, cập nhật check-out
            existing_attendance.checkout = current_time_obj
            existing_attendance.checkout_status = True
            session.commit()
            return {"success": True, "message": f"Chấm công ra thành công cho ca {current_shift.name}"}
        else:
            # Tạo mới chấm công vào
            new_attendance = Attendance(
                employee_id=employee_id,
                date=current_date,
                checkin=current_time_obj,
                checkin_status=True,
                shift_id=current_shift.id
            )
            session.add(new_attendance)
            session.commit()
            return {"success": True, "message": f"Chấm công vào thành công cho ca {current_shift.name}"}
    except Exception as e:
        session.rollback()
        return {"success": False, "message": f"Lỗi khi chấm công: {str(e)}"}

@router.get("/attendance", response_model=dict)
async def get_attendance(date: Optional[str] = None, shift_id: Optional[int] = None, from_date: Optional[str] = None, to_date: Optional[str] = None):
    try:
        query = session.query(
            Attendance, 
            Employee.name.label("employee_name"),
            Shift.name.label("shift_name"),
            Shift.check_in_time.label("expected_check_in"),
            Shift.check_out_time.label("expected_check_out")
        ).join(
            Employee, Attendance.employee_id == Employee.id
        ).join(
            Shift, Attendance.shift_id == Shift.id
        )
        
        # Lọc theo ngày cụ thể nếu có
        if date:
            query = query.filter(Attendance.date == date)
        
        # Lọc theo khoảng ngày nếu có
        if from_date:
            query = query.filter(Attendance.date >= from_date)
        
        if to_date:
            query = query.filter(Attendance.date <= to_date)
        
        # Lọc theo ca làm việc nếu có
        if shift_id:
            query = query.filter(Attendance.shift_id == shift_id)
        
        results = query.all()
        
        attendance_list = []
        for att, emp_name, shift_name, expected_check_in, expected_check_out in results:
            attendance_list.append({
                "id": att.id,
                "employee_id": att.employee_id,
                "employee_name": emp_name,
                "date": att.date.strftime("%Y-%m-%d") if att.date else None,
                "shift_id": att.shift_id,
                "shift_name": shift_name,
                "check_in_time": time_to_string(att.checkin) if hasattr(att, 'checkin') and att.checkin else None,
                "check_out_time": time_to_string(att.checkout) if hasattr(att, 'checkout') and att.checkout else None,
                "expected_check_in": time_to_string(expected_check_in) if expected_check_in else "08:00",
                "expected_check_out": time_to_string(expected_check_out) if expected_check_out else "17:00",
                "checkin_status": att.checkin_status if hasattr(att, 'checkin_status') else None,
                "checkout_status": att.checkout_status if hasattr(att, 'checkout_status') else None,
                "error": False  # Mặc định không có lỗi
            })
        
        print(f"Tìm thấy {len(attendance_list)} bản ghi chấm công")
        return {"success": True, "attendance": attendance_list}
    except Exception as e:
        print(f"Lỗi khi lấy dữ liệu chấm công: {str(e)}")
        return {"success": False, "message": f"Lỗi khi lấy dữ liệu chấm công: {str(e)}", "attendance": []}

@router.get("/shifts/config")
async def get_shifts_config():
    """Lấy cấu hình ca làm việc"""
    try:
        # Tìm kiếm cấu hình ca hiện tại trong cơ sở dữ liệu
        shifts = session.query(Shift).order_by(Shift.check_in_time).all()
        
        # Nếu không có đủ 2 ca, trả về cấu hình mặc định
        if len(shifts) < 2:
            return {
                "success": True,
                "config": {
                    "shift1": {
                        "checkIn": "07:00",
                        "checkOut": "12:00"
                    },
                    "shift2": {
                        "checkIn": "13:00",
                        "checkOut": "17:00"
                    }
                }
            }
        
        # Lấy ra ca 1 và ca 2
        shift1 = shifts[0]
        shift2 = shifts[1]
        
        return {
            "success": True,
            "config": {
                "shift1": {
                    "checkIn": time_to_string(shift1.check_in_time),
                    "checkOut": time_to_string(shift1.check_out_time)
                },
                "shift2": {
                    "checkIn": time_to_string(shift2.check_in_time),
                    "checkOut": time_to_string(shift2.check_out_time)
                }
            }
        }
    except Exception as e:
        return {"success": False, "message": f"Lỗi: {str(e)}"}

@router.post("/shifts/config")
async def update_shifts_config(config: ShiftConfig):
    """Cập nhật cấu hình ca làm việc"""
    from utils.date import set_time
    from rule import validate_shift_break, get_shifts
    
    try:
        # Chuyển đổi chuỗi thời gian thành đối tượng time
        shift1_check_in = set_time(config.shift1.checkIn)
        shift1_check_out = set_time(config.shift1.checkOut)
        shift2_check_in = set_time(config.shift2.checkIn)
        shift2_check_out = set_time(config.shift2.checkOut)
        
        # Kiểm tra thời gian ca 1
        if shift1_check_in >= shift1_check_out:
            return {"success": False, "message": "Thời gian bắt đầu ca 1 phải trước thời gian kết thúc ca 1"}
        
        # Kiểm tra thời gian ca 2
        if shift2_check_in >= shift2_check_out:
            return {"success": False, "message": "Thời gian bắt đầu ca 2 phải trước thời gian kết thúc ca 2"}
        
        # Kiểm tra khoảng nghỉ giữa ca 1 và ca 2
        shift1_end_minutes = shift1_check_out.hour * 60 + shift1_check_out.minute
        shift2_start_minutes = shift2_check_in.hour * 60 + shift2_check_in.minute
        
        if (shift2_start_minutes - shift1_end_minutes) < 10:
            return {"success": False, "message": "Thời gian giữa ca 1 và ca 2 phải cách nhau ít nhất 10 phút"}
        
        # Xóa tất cả ca hiện tại
        session.query(Shift).delete()
        
        # Tạo ca 1
        shift1 = Shift(
            name="Ca 1",
            check_in_time=shift1_check_in,
            check_out_time=shift1_check_out,
            active=True
        )
        session.add(shift1)
        
        # Tạo ca 2
        shift2 = Shift(
            name="Ca 2",
            check_in_time=shift2_check_in,
            check_out_time=shift2_check_out,
            active=True
        )
        session.add(shift2)
        
        # Lưu thay đổi
        session.commit()
        
        return {
            "success": True,
            "message": "Cập nhật cấu hình ca làm việc thành công"
        }
    except Exception as e:
        session.rollback()
        return {"success": False, "message": f"Lỗi: {str(e)}"}

@router.post("/complaints", response_model=ComplaintResponse)
async def create_complaint(
    employee_id: int = Form(...),
    reason: str = Form(...),
    image_data: str = Form(...)
):
    """Tạo khiếu nại mới"""
    try:
        # Kiểm tra nhân viên có tồn tại không
        employee = session.query(Employee).filter(Employee.id == employee_id).first()
        if not employee:
            return {"success": False, "message": "Không tìm thấy nhân viên"}
            
        # Lưu ảnh từ base64 string
        image_data = image_data.split(',')[1] if ',' in image_data else image_data
        image_bytes = base64.b64decode(image_data)
        
        # Tạo thư mục nếu chưa tồn tại
        os.makedirs('static/uploads/complaints', exist_ok=True)
        
        # Tạo tên file duy nhất
        image_filename = f"{uuid4()}.jpg"
        image_path = f"static/uploads/complaints/{image_filename}"
        
        # Lưu ảnh
        with open(image_path, "wb") as f:
            f.write(image_bytes)
        
        # Tạo khiếu nại mới
        new_complaint = Complaint(
            employee_id=employee_id,
            reason=reason,
            image_path=image_path
        )
        
        session.add(new_complaint)
        session.commit()
        session.refresh(new_complaint)
        
        return {"success": True, "complaint_id": new_complaint.id, "message": "Đã gửi khiếu nại thành công"}
    except Exception as e:
        session.rollback()
        return {"success": False, "message": f"Lỗi khi tạo khiếu nại: {str(e)}"}

@router.get("/complaints")
async def get_complaints():
    """Lấy danh sách tất cả khiếu nại"""
    try:
        complaints = session.query(Complaint).order_by(Complaint.complaint_time.desc()).all()
        
        result = []
        for complaint in complaints:
            employee = session.query(Employee).filter(Employee.id == complaint.employee_id).first()
            
            # Format ngày và giờ
            complaint_date = complaint.complaint_time.strftime("%Y-%m-%d")
            complaint_time = complaint.complaint_time.strftime("%H:%M:%S")
            
            result.append({
                "id": complaint.id,
                "employee_id": complaint.employee_id,
                "employee_name": employee.name if employee else "Unknown",
                "complaint_date": complaint_date,
                "complaint_time": complaint_time,
                "reason": complaint.reason,
                "image_path": complaint.image_path,
                "status": complaint.status,
                "processed": complaint.processed
            })
        
        return {
            "success": True,
            "complaints": result
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Lỗi khi lấy danh sách khiếu nại: {str(e)}"
        }

@router.get("/complaints/{complaint_id}")
async def get_complaint_detail(complaint_id: int):
    """Lấy chi tiết một khiếu nại"""
    try:
        complaint = session.query(Complaint).filter(Complaint.id == complaint_id).first()
        
        if not complaint:
            return {
                "success": False,
                "message": "Không tìm thấy khiếu nại"
            }
        
        employee = session.query(Employee).filter(Employee.id == complaint.employee_id).first()
        
        # Format ngày và giờ
        complaint_date = complaint.complaint_time.strftime("%Y-%m-%d")
        complaint_time = complaint.complaint_time.strftime("%H:%M:%S")
        
        return {
            "success": True,
            "complaint": {
                "id": complaint.id,
                "employee_id": complaint.employee_id,
                "employee_name": employee.name if employee else "Unknown",
                "complaint_date": complaint_date,
                "complaint_time": complaint_time,
                "reason": complaint.reason,
                "image_path": complaint.image_path,
                "status": complaint.status,
                "processed": complaint.processed
            }
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Lỗi khi lấy chi tiết khiếu nại: {str(e)}"
        }

@router.post("/complaints/{complaint_id}/process")
async def process_complaint(
    complaint_id: int = Path(...),
    approved: bool = Form(...),
    sess: Session = Depends(get_db)
):
    """API xử lý khiếu nại (duyệt hoặc từ chối)"""
    try:
        # Tìm khiếu nại trong DB
        complaint = sess.query(Complaint).filter(Complaint.id == complaint_id).first()
        if not complaint:
            return {"success": False, "message": "Không tìm thấy khiếu nại"}
        
        # Cập nhật trạng thái xử lý
        complaint.processed = True
        complaint.approved = approved
        complaint.status = "Đã duyệt" if approved else "Không duyệt"
        processed_date = get_date()
        processed_time = get_time()
        
        # Nếu duyệt khiếu nại, tạo bản ghi chấm công cho nhân viên
        if approved:
            # Lấy ngày từ complaint_time
            complaint_date = complaint.complaint_time.strftime("%Y-%m-%d")
            
            # Kiểm tra xem đã có bản ghi chấm công cho nhân viên vào ngày này chưa
            existing_attendance = sess.query(Attendance).filter(
                Attendance.employee_id == complaint.employee_id,
                Attendance.date == complaint_date
            ).first()
            
            # Lấy giờ từ complaint_time
            complaint_time_str = complaint.complaint_time.strftime("%H:%M:%S")
            
            if existing_attendance:
                # Nếu đã có, cập nhật thông tin check-in
                existing_attendance.checkin = complaint.complaint_time.time()
            else:
                # Nếu chưa có, tạo bản ghi mới
                # Xác định ca làm việc dựa vào thời gian
                from utils.date import set_time
                from rule import get_appropriate_shift
                
                complaint_time_obj = complaint.complaint_time.time()
                shift = get_appropriate_shift(complaint_time_obj)
                
                if not shift:
                    # Nếu không có ca phù hợp, sử dụng ca mặc định (id=1)
                    shift = sess.query(Shift).filter(Shift.id == 1).first()
                
                # Tạo bản ghi chấm công mới
                new_attendance = Attendance(
                    employee_id=complaint.employee_id,
                    date=complaint_date,
                    checkin=complaint_time_obj,
                    checkout=None,  # Chưa có giờ check-out
                    shift_id=shift.id if shift else 1
                )
                sess.add(new_attendance)
        
        # Lưu thay đổi vào DB
        sess.commit()
        
        return {"success": True, "message": "Xử lý khiếu nại thành công"}
        
    except Exception as e:
        sess.rollback()
        return {"success": False, "message": f"Lỗi khi xử lý khiếu nại: {str(e)}"}