from datetime import datetime
import pytz

VN_TZ = pytz.timezone('Asia/Ho_Chi_Minh')

def get_accruate():
    return datetime.now(VN_TZ)

def get_date():
    return datetime.now(VN_TZ).date()

def get_time():
    return datetime.now(VN_TZ).time()

def set_time(text):
    return datetime.strptime(text, "%H:%M").time()

def time_to_string(time_obj):
    return time_obj.strftime("%H:%M")

def date_to_string(date_obj):
    return date_obj.strftime("%d-%m-%Y")