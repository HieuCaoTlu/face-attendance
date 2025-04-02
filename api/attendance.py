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
        ).join(
            Shift, Attendance.shift == Shift.name
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
            shift = session.query(Shift).filter(Shift.id == shift_id).first()
            query = query.filter(Attendance.shift == shift.name)
        
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