from fastapi import Form
from database import Shift, session
from fastapi import APIRouter
from utils.date import set_time, time_to_string

router = APIRouter()

@router.post("/shift", tags=["Shift"])
async def add_shift(
    name: str = Form(...),
    checkin: str = Form(...),
    checkout: str = Form(...)):
    new_shift = Shift(name=name, checkin=set_time(checkin), checkout=set_time(checkout))
    session.add(new_shift)
    session.commit()
    session.refresh(new_shift)
    return {"success": True, "shift_id": new_shift.id, "name":new_shift.name, "checkin":new_shift.checkin, "checkout":new_shift.checkout}

@router.delete("/shift", tags=["Shift"])
async def delete_shift():
    session.query(Shift).delete()
    session.commit()
    return session.query(Shift).all()

@router.get("/shift", tags=["Shift"])
async def get_shifts():
    """Lấy danh sách tất cả ca làm việc"""
    shifts = session.query(Shift).all()
    result = []
    for shift in shifts:
        result.append({
            "id": shift.id,
            "name": shift.name,
            "checkin": time_to_string(shift.checkin),
            "checkout": time_to_string(shift.checkout),
        })
    return {"shifts": result}

@router.put("/shift/{shift_id}", tags=["Shift"])
async def update_shift(
    shift_id: int,
    name: str = Form(None),
    check_in_time: str = Form(None),
    check_out_time: str = Form(None),
    active: bool = Form(None)
):
    """Cập nhật thông tin ca làm việc"""
    # Tìm ca cần cập nhật
    shift = session.query(Shift).filter(Shift.id == shift_id).first()
    # Cập nhật thông tin nếu có
    if name: shift.name = name
    # Cập nhật thời gian check-in nếu có
    if check_in_time:
        shift.checkin = set_time(check_in_time)
    
    # Cập nhật thời gian check-out nếu có
    if check_out_time:
        shift.checkout = set_time(check_out_time)
    session.commit()
    
    return {
        "success": True,
        "message": "Cập nhật ca làm việc thành công"
    }

@router.delete("/shift/{shift_id}", tags=["Shift"])
async def delete_shift(shift_id: int):
    """Xóa ca làm việc"""
    # Kiểm tra xem ca có tồn tại không
    session.query(Shift).filter(Shift.id == shift_id).first().delete()
    session.commit()
    
    return {
        "success": True,
        "message": "Xóa ca làm việc thành công"
    }