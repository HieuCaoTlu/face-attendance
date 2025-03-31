from datetime import datetime, timedelta
from utils.date import get_date, set_time, time_to_string
from database import session, Shift, Attendance
from shared import db_lock

MIN_BREAK_TIME = 10  # Thời gian nghỉ tối thiểu giữa 2 ca (phút)

# Lấy danh sách ca làm việc được cấu hình
def get_shifts():
    with db_lock:
        return session.query(Shift).filter(Shift.active == True).order_by(Shift.check_in_time).all()

# Kiểm tra xem thời gian nào thuộc ca nào theo quy tắc mới:
# - Nếu thời gian từ 00:00 đến 12:00, thuộc ca 1
# - Nếu thời gian từ 13:00 đến 23:59, thuộc ca 2
def get_current_shift(time):
    shifts = get_shifts()
    if not shifts:
        return None
    
    # Sắp xếp ca làm việc theo thứ tự thời gian bắt đầu
    shifts = sorted(shifts, key=lambda x: x.check_in_time)
    
    # Giả sử shifts[0] là ca 1 và shifts[1] (nếu có) là ca 2
    if len(shifts) >= 1:
        # Thời gian từ 00:00 đến 12:00 thuộc ca 1
        if time.hour < 13:
            return shifts[0]
        # Thời gian từ 13:00 đến 23:59 thuộc ca 2
        else:
            # Nếu có ca 2, trả về ca 2, nếu không có ca 2 thì trả về ca 1
            return shifts[1] if len(shifts) > 1 else shifts[0]
    
    return None

# Hàm lấy ca làm việc phù hợp dựa trên thời gian (để xử lý khiếu nại)
def get_appropriate_shift(time):
    shifts = get_shifts()
    if not shifts:
        return None
    
    # Sắp xếp ca làm việc theo thứ tự thời gian bắt đầu
    shifts = sorted(shifts, key=lambda x: x.check_in_time)
    
    # Giả sử shifts[0] là ca 1 và shifts[1] (nếu có) là ca 2
    if len(shifts) >= 1:
        # Thời gian từ 00:00 đến 12:00 thuộc ca 1
        if time.hour < 13:
            return shifts[0]
        # Thời gian từ 13:00 đến 23:59 thuộc ca 2
        else:
            # Nếu có ca 2, trả về ca 2, nếu không có ca 2 thì trả về ca 1
            return shifts[1] if len(shifts) > 1 else shifts[0]
    
    return None

# Kiểm tra điều kiện check-in
def validate_checkin(time, shift):
    today = get_date()
    actual_datetime = datetime.combine(today, time)
    shift_start_datetime = datetime.combine(today, shift.check_in_time)
    
    # Kiểm tra nếu check-in muộn
    if time > shift.check_in_time:
        delta = actual_datetime - shift_start_datetime
        hours = delta.seconds // 3600
        minutes = (delta.seconds % 3600) // 60
        return False, f"Check in muộn {hours} giờ {minutes} phút"
    else:
        # Check-in đúng giờ hoặc sớm
        return True, "Check in đúng giờ"

# Kiểm tra điều kiện check-out
def validate_checkout(time, shift):
    today = get_date()
    actual_datetime = datetime.combine(today, time)
    shift_end_datetime = datetime.combine(today, shift.check_out_time)
    
    # Kiểm tra nếu check-out sớm
    if time < shift.check_out_time:
        delta = shift_end_datetime - actual_datetime
        hours = delta.seconds // 3600
        minutes = (delta.seconds % 3600) // 60
        return False, f"Check out sớm {hours} giờ {minutes} phút"
    else:
        # Check-out đúng giờ hoặc muộn
        return True, "Check out đúng giờ"

# Kiểm tra nếu 2 ca đáp ứng yêu cầu khoảng nghỉ tối thiểu
def validate_shift_break(shifts):
    for i in range(len(shifts)-1):
        shift1_end = datetime.combine(get_date(), shifts[i].check_out_time)
        shift2_start = datetime.combine(get_date(), shifts[i+1].check_in_time)
        
        # Tính khoảng thời gian giữa 2 ca (phút)
        break_time = (shift2_start - shift1_end).total_seconds() / 60
        
        if break_time < MIN_BREAK_TIME:
            return False, f"Khoảng nghỉ giữa ca {shifts[i].name} và {shifts[i+1].name} là {break_time:.0f} phút, cần ít nhất {MIN_BREAK_TIME} phút"
    
    return True, "Các ca đáp ứng yêu cầu khoảng nghỉ"

# Chức năng xác định ca làm việc và trạng thái chấm công
def determine_attendance_type(employee_id, current_time):
    today = get_date()
    
    # Lấy danh sách chấm công của nhân viên trong ngày, sắp xếp theo thời gian
    with db_lock:
        attendances = (
            session.query(Attendance)
            .filter(Attendance.employee_id == employee_id, Attendance.date == today)
            .order_by(Attendance.checkin)
            .all()
        )
    
    # Lấy ca làm việc hiện tại dựa trên quy tắc mới
    current_shift = get_current_shift(current_time)
    if not current_shift:
        return "error", None, False, "Không tìm thấy ca làm việc phù hợp"
    
    # Kiểm tra xem có chấm công nào cho ca hiện tại chưa
    current_shift_attendance = None
    for attendance in attendances:
        if attendance.shift_id == current_shift.id:
            current_shift_attendance = attendance
            break
    
    # Trường hợp 1: Chưa có chấm công nào cho ca hiện tại
    if current_shift_attendance is None:
        # Tạo check-in mới cho ca hiện tại
        is_valid, status = validate_checkin(current_time, current_shift)
        return "checkin", current_shift.id, is_valid, status
    
    # Trường hợp 2: Đã có check-in nhưng chưa có check-out (hoặc muốn cập nhật check-out)
    # Cập nhật check-out cho ca hiện tại
    is_valid, status = validate_checkout(current_time, current_shift)
    return "checkout", current_shift.id, is_valid, status