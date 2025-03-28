from datetime import datetime, timedelta
from utils.date import get_date, set_time, time_to_string
from database import session, Shift, Attendance

MIN_BREAK_TIME = 10  # Thời gian nghỉ tối thiểu giữa 2 ca (phút)

# Lấy danh sách ca làm việc được cấu hình
def get_shifts():
    return session.query(Shift).filter(Shift.active == True).order_by(Shift.check_in_time).all()

# Kiểm tra xem thời gian hiện tại thuộc ca nào
def get_current_shift(time):
    today = get_date()
    current_time = time
    shifts = get_shifts()
    
    for i, shift in enumerate(shifts):
        # Tính thời gian kết thúc của ca hiện tại
        shift_end_time = shift.check_out_time
        
        # Nếu không phải ca cuối cùng, check thời gian bắt đầu của ca tiếp theo
        next_shift_start = None
        if i < len(shifts) - 1:
            next_shift_start = shifts[i+1].check_in_time
        
        # Tính khoảng thời gian của ca
        # Trường hợp 1: Thời gian hiện tại nằm trong khoảng từ giờ bắt đầu đến giờ kết thúc của ca
        if shift.check_in_time <= current_time <= shift_end_time:
            return shift
        
        # Trường hợp 2: Thời gian hiện tại nằm trong khoảng từ giờ kết thúc của ca đến giờ bắt đầu của ca tiếp theo (trừ 1 giây)
        if next_shift_start:
            # Tính thời điểm 1 giây trước khi ca tiếp theo bắt đầu
            next_shift_start_dt = datetime.combine(today, next_shift_start)
            one_second_before = (next_shift_start_dt - timedelta(seconds=1)).time()
            
            if shift_end_time < current_time <= one_second_before:
                return shift
    
    # Nếu không thuộc ca nào, trả về ca gần nhất
    if current_time < shifts[0].check_in_time:
        return shifts[0]  # Ca đầu tiên
    else:
        # Tìm ca gần nhất (check nếu thời gian hiện tại sau giờ kết thúc của ca cuối cùng)
        for i in range(len(shifts)-1, -1, -1):
            if current_time > shifts[i].check_out_time:
                return shifts[i]
        
        return shifts[-1]  # Mặc định trả về ca cuối cùng nếu không tìm thấy

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
    attendances = (
        session.query(Attendance)
        .filter(Attendance.employee_id == employee_id, Attendance.date == today)
        .order_by(Attendance.checkin)
        .all()
    )
    
    # Lấy danh sách ca làm việc
    shifts = get_shifts()
    current_shift = get_current_shift(current_time)
    
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
    
    # Trường hợp 2: Đã có check-in nhưng chưa có check-out
    if current_shift_attendance.checkout is None:
        # Cập nhật check-out cho ca hiện tại
        is_valid, status = validate_checkout(current_time, current_shift)
        return "checkout", current_shift.id, is_valid, status
    
    # Trường hợp 3: Ca hiện tại đã có đủ check-in và check-out
    # Nếu có ca tiếp theo và thời gian hiện tại phù hợp, tạo check-in cho ca tiếp theo
    next_shift_index = -1
    for i, shift in enumerate(shifts):
        if shift.id == current_shift.id and i < len(shifts) - 1:
            next_shift_index = i + 1
            break
    
    if next_shift_index >= 0:
        next_shift = shifts[next_shift_index]
        # Kiểm tra xem đã có chấm công cho ca tiếp theo chưa
        next_shift_attendance = None
        for attendance in attendances:
            if attendance.shift_id == next_shift.id:
                next_shift_attendance = attendance
                break
        
        if next_shift_attendance is None:
            # Tạo check-in mới cho ca tiếp theo
            is_valid, status = validate_checkin(current_time, next_shift)
            return "checkin", next_shift.id, is_valid, status
        elif next_shift_attendance.checkout is None:
            # Cập nhật check-out cho ca tiếp theo
            is_valid, status = validate_checkout(current_time, next_shift)
            return "checkout", next_shift.id, is_valid, status
    
    # Trường hợp mặc định: nếu không có ca nào phù hợp, tạo check-in cho ca hiện tại
    is_valid, status = validate_checkin(current_time, current_shift)
    return "checkin", current_shift.id, is_valid, status