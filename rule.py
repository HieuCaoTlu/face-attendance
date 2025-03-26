from datetime import datetime
from utils.date import get_date, set_time

GIO_BAT_DAU = set_time("08:30")
GIO_KET_THUC = set_time("17:30")

# Gọi khi người dùng checkin thành công
def validate_checkin(time):
    global GIO_BAT_DAU
    today = get_date()
    actual_datetime = datetime.combine(today, time)
    gio_bat_dau_datetime = datetime.combine(today, GIO_BAT_DAU)

    # Kiểm tra giờ vào có muộn hay không
    if time > GIO_BAT_DAU:
        delta = actual_datetime - gio_bat_dau_datetime
        hours = delta.seconds // 3600
        minutes = (delta.seconds % 3600) // 60
        return False, f"Đi muộn {hours} giờ {minutes} phút"
    elif time <= GIO_BAT_DAU:
        delta = gio_bat_dau_datetime - actual_datetime
        hours = delta.seconds // 3600
        minutes = (delta.seconds % 3600) // 60
        return True, f"Đúng giờ, sớm {hours} giờ {minutes} phút"

# Gọi khi quản trị viên mở lịch sử checkout
def validate_checkout(time):
    global GIO_KET_THUC
    actual_time = set_time(time)
    today = get_date()
    
    if actual_time < GIO_KET_THUC:
        delta = datetime.combine(today, GIO_KET_THUC) - datetime.combine(datetime.today(), actual_time)
        return True, actual_time, delta.seconds // 60, f"Về sớm trước {delta.seconds // 60} phút"
    return False, actual_time, 0, "Đúng giờ"