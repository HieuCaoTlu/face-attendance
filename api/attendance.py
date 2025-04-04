from typing import Optional
from database import Attendance, Employee, Shift, session
from fastapi import APIRouter
from utils.date import time_to_string

router = APIRouter()

@router.get("/attendance", response_model=dict, tags=["Attendance"])
async def get_attendance(date: Optional[str] = None, shift_id: Optional[int] = None, from_date: Optional[str] = None, to_date: Optional[str] = None):
    try:
        query = session.query(
            Attendance, 
            Employee.name.label("employee_name"),
            Shift.name.label("shift_name"),
            Shift.checkin.label("expected_check_in"),
            Shift.checkout.label("expected_check_out")
        ).join(
            Employee, Attendance.employee_id == Employee.id
        ).outerjoin(  # Sử dụng outerjoin thay vì join để tránh lỗi khi không có shift_id
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
            # Tránh lỗi khi shift_id không tồn tại
            try:
                attendance_list.append({
                    "id": att.id,
                    "employee_id": att.employee_id,
                    "employee_name": emp_name,
                    "date": att.date.strftime("%Y-%m-%d") if att.date else None,
                    "shift_id": getattr(att, 'shift_id', None),  # Sử dụng getattr để truy cập an toàn
                    "shift_name": shift_name or att.shift,  # Sử dụng shift_name từ join hoặc att.shift nếu không có
                    "check_in_time": time_to_string(att.checkin) if hasattr(att, 'checkin') and att.checkin else None,
                    "check_out_time": time_to_string(att.checkout) if hasattr(att, 'checkout') and att.checkout else None,
                    "expected_check_in": time_to_string(expected_check_in) if expected_check_in else "08:00",
                    "expected_check_out": time_to_string(expected_check_out) if expected_check_out else "17:00",
                    "checkin_status": getattr(att, 'checkin_status', None),
                    "checkout_status": getattr(att, 'checkout_status', None),
                    "error": False  # Mặc định không có lỗi
                })
            except Exception as item_error:
                print(f"Lỗi xử lý một bản ghi chấm công: {str(item_error)}")
                # Vẫn thêm bản ghi nhưng với thông tin tối thiểu
                attendance_list.append({
                    "id": getattr(att, 'id', 0),
                    "employee_id": getattr(att, 'employee_id', 0),
                    "employee_name": emp_name or "Không xác định",
                    "date": att.date.strftime("%Y-%m-%d") if hasattr(att, 'date') and att.date else None,
                    "shift_id": None,
                    "shift_name": getattr(att, 'shift', "Ca làm việc"),
                    "check_in_time": time_to_string(att.checkin) if hasattr(att, 'checkin') and att.checkin else None,
                    "check_out_time": time_to_string(att.checkout) if hasattr(att, 'checkout') and att.checkout else None,
                    "expected_check_in": "08:00",
                    "expected_check_out": "17:00",
                    "checkin_status": None,
                    "checkout_status": None,
                    "error": True  # Đánh dấu có lỗi
                })
        
        print(f"Tìm thấy {len(attendance_list)} bản ghi chấm công")
        return {"success": True, "attendance": attendance_list}
    except Exception as e:
        print(f"Lỗi khi lấy dữ liệu chấm công: {str(e)}")
        return {"success": False, "message": f"Lỗi khi lấy dữ liệu chấm công: {str(e)}", "attendance": []}