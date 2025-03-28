from utils.date import get_date, get_time, time_to_string, date_to_string
from rule import determine_attendance_type, validate_checkin, validate_checkout
from database import session, Employee, Attendance

def checkin(employee_id):
    today = get_date()
    current_time = get_time()
    
    # Tìm nhân viên theo ID
    employee = session.query(Employee).filter_by(id=employee_id).first()
    if not employee: return
    
    # Xác định loại điểm danh (checkin/checkout), ca làm việc và trạng thái
    attendance_type, shift_id, is_valid, status = determine_attendance_type(employee_id, current_time)
    
    attendance = None
    if attendance_type == "checkin":
        # Tạo bản ghi mới cho check-in
        attendance = Attendance(
            employee_id=employee_id,
            shift_id=shift_id,
            checkin=current_time,
            checkin_status=is_valid
        )
        session.add(attendance)
        session.commit()
        session.refresh(attendance)
    else:
        # Cập nhật check-out cho bản ghi hiện có
        attendance = (
            session.query(Attendance)
            .filter(
                Attendance.employee_id == employee_id, 
                Attendance.date == today,
                Attendance.shift_id == shift_id,
                Attendance.checkout == None
            )
            .order_by(Attendance.checkin.desc())
            .first()
        )
        
        if attendance:
            attendance.checkout = current_time
            attendance.checkout_status = is_valid
            session.commit()
            session.refresh(attendance)
    
    if not attendance:
        return None
    
    # Chuẩn bị thông tin trả về
    info = {
        'employee_id': employee_id,
        'employee_name': employee.name,
        'attendance_date': date_to_string(attendance.date),
        'attendance_checkin': time_to_string(attendance.checkin),
        'attendance_checkout': time_to_string(attendance.checkout) if attendance.checkout else None,
        'attendance_message': attendance_type
    }
    
    # Thêm thông tin trạng thái
    if attendance_type == "checkin":
        info['checkin_status'] = status
        info['checkin_flag'] = is_valid
    else:
        info['checkout_status'] = status
        info['checkout_flag'] = is_valid
    
    # Thêm thông tin ca làm việc
    info['shift_id'] = shift_id
    
    return info