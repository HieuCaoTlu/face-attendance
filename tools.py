from utils.date import get_date, get_time, time_to_string, date_to_string
from rule import validate_checkin
from database import session, Employee, Attendance

def checkin(employee_id):
    today = get_date()
    # Tìm nhân viên theo ID
    employee = session.query(Employee).filter_by(id=employee_id).first()
    if not employee: return
    # Kiểm tra nếu đã có check-in hôm nay
    attendance = (
        session.query(Attendance)
               .filter(Attendance.employee_id == employee_id, Attendance.date == today)
               .order_by(Attendance.checkin.desc())
               .first()
    )
    validate, status = None, None
    if not attendance:
        # Nếu chưa có check-in, tạo bản ghi mới
        attendance = Attendance(employee_id=1)
        validate, status = validate_checkin(get_time())
        attendance.checkin_status = validate
        session.add(attendance)
        message = "checkin"
    else:
        # Nếu đã có, cập nhật thời gian check-out
        attendance.checkout = get_time()
        message = "checkout"
    session.commit()
    info = {
        'employee_id': employee_id,
        'employee_name': employee.name,
        'attendance_date': date_to_string(attendance.date),
        'attendance_checkin': time_to_string(attendance.checkin),
        'attendance_checkout': time_to_string(attendance.checkout) if attendance.checkout else None,
        'attendance_message': message
    }
    if message == 'checkin':
        info['checkin_status'] = status
        info['checkin_flag'] = validate
    return info