
from utils.augmentation import *
import random
from utils.date import *
from database import session, Employee, Attendance, Shift

def add_attendance(id, shift):
    global message
    new_attendance = Attendance(employee_id=id, shift=shift)
    session.add(new_attendance)
    session.commit()
    session.refresh(new_attendance)
    return new_attendance

def checkin(id):
    employee = session.query(Employee).filter_by(id=id).first()
    if not employee: return
    current_time = get_time()
    current_shift = None
    current_date = get_date()
    shifts = session.query(Shift).all()
    recs = session.query(Attendance).filter(Attendance.employee_id == id, Attendance.date == current_date).all()

    for shift in shifts:
        if shift.checkin <= current_time <= shift.checkout:
            current_shift = shift
    
    if not current_shift:
        index = 0
        for shift in shifts:
            if current_time > shift.checkout:
                index += 1
        current_shift = shifts[index]

    previous_shift = None
    for i in range(len(shifts) - 1):
        if shifts[i+1] == current_shift: 
            previous_shift = shifts[i]
            break

    # Xác thực chấm công
    current_his = None
    previous_his = None
    for rec in recs:
        if rec.shift == current_shift.name:
            current_his = rec
        else:
            previous_his = rec

    message = 'checkout'
    if not current_his:
        if not previous_his:
            recs.append(add_attendance(id, current_shift.name))
            message = 'checkin'
        else:
            if not previous_his.checkout:
                previous_his.checkout = current_time
            else:
                if previous_his.checkout < previous_shift.checkout:
                    previous_his.checkout = current_time
                else:
                    recs.append(add_attendance(id, current_shift.name))
                    message = 'checkin'
    else:
        if not current_his.checkout and current_time > current_shift.checkin:
            current_his.checkout = current_time
    session.commit()
    attendance = recs[-1]
    info = {
        'employee_id': id,
        'employee_name': employee.name,
        'attendance_date': date_to_string(attendance.date),
        'attendance_checkin': time_to_string(attendance.checkin),
        'attendance_checkout': time_to_string(attendance.checkout) if attendance.checkout else None,
        'message': message
    }
    if message == 'checkin':
        late = round(time_to_minutes(attendance.checkin) - time_to_minutes(current_shift.checkin))
        info['checkin_status'] = f'Muộn {late} phút'
        info['checkin_flag'] = current_shift.checkin <= attendance.checkin
    return info

def augmentate(image):
    augmentations = [
        lambda img: adjust_brightness(img, random.choice([20, -20])),
        lambda img: adjust_contrast(img, random.choice([1.5, 0.7])),
        lambda img: rotate_image(img, random.choice([5, -5])),
        lambda img: random.choice([add_gaussian_noise, blur_image])(img),
    ]
    
    augmented_images = [augment(image) for augment in augmentations]
    return augmented_images
