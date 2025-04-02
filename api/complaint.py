from fastapi import File, Form, UploadFile, Path
from database import Complaint, session, Employee, Attendance, Shift
from fastapi import APIRouter
from tools import checkin
from camera import generate_complaint_camera

router = APIRouter()

@router.get("/complaint_image", tags=["Complaint"])
async def get_complaint_image():
    return {"image": generate_complaint_camera()}

@router.post("/complaint", tags=["Complaint"])
async def add_complaint(
    image: UploadFile = File(...),
    employee_id: int = Form(...),
    reason: str = Form(...)
):
    image_bytes = await image.read()
    complaint = Complaint(employee_id=employee_id, reason=reason, image=image_bytes)
    session.add(complaint)
    session.commit()
    session.refresh(complaint)
    return {
        "id": complaint.id,
        "created_at": complaint.created_at.isoformat(),
        "reason": complaint.reason
    }

@router.get("/complaint", tags=["Complaint"])
async def get_complaints():
    """Lấy danh sách tất cả khiếu nại"""
    try:
        complaints = session.query(Complaint).order_by(Complaint.created_at.desc()).all()
        
        result = []
        for complaint in complaints:
            employee = session.query(Employee).filter(Employee.id == complaint.employee_id).first()
            
            # Format ngày và giờ
            date = complaint.created_at
            complaint_date = date.strftime("%d-%m-%Y")
            complaint_time = date.strftime("%H:%M:%S")
            
            result.append({
                "id": complaint.id,
                "employee_id": complaint.employee_id,
                "employee_name": employee.name,
                "complaint_date": complaint_date,
                "complaint_time": complaint_time,
                "reason": complaint.reason,
                "image_path": complaint.image,
                "status": "Đã duyệt" if complaint.processed else "Chưa duyệt",
                "processed": complaint.processed
            })
        
        return {
            "success": True,
            "complaints": result
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Lỗi khi lấy danh sách khiếu nại: {str(e)}"
        }
        
@router.get("/complaint/{complaint_id}", tags=["Complaint"])
async def get_complaint_detail(complaint_id: int):
    """Lấy chi tiết một khiếu nại"""
    try:
        complaint = session.query(Complaint).filter(Complaint.id == complaint_id).first()
        
        if not complaint:
            return {
                "success": False,
                "message": "Không tìm thấy khiếu nại"
            }
        
        employee = session.query(Employee).filter(Employee.id == complaint.employee_id).first()
        
        # Format ngày và giờ
        complaint_date = complaint.created_at.strftime("%d-%m-%Y")
        complaint_time = complaint.created_at.strftime("%H:%M:%S")
        
        return {
            "success": True,
            "complaint": {
                "id": complaint.id,
                "employee_id": complaint.employee_id,
                "employee_name": employee.name,
                "complaint_date": complaint_date,
                "complaint_time": complaint_time,
                "reason": complaint.reason,
                "image_path": complaint.image,
                "status": "Đã duyệt" if complaint.processed else "Chưa duyệt",
                "processed": complaint.processed
            }
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Lỗi khi lấy chi tiết khiếu nại: {str(e)}"
        }
        
@router.post("/complaints/{complaint_id}/process", tags=["Complaint"])
async def process_complaint(
    complaint_id: int = Path(...),
    approved: bool = Form(...),
):
    """API xử lý khiếu nại (duyệt hoặc từ chối)"""
    try:
        # Tìm khiếu nại trong DB
        complaint = session.query(Complaint).filter(Complaint.id == complaint_id).first()
        if not complaint:
            return {"success": False, "message": "Không tìm thấy khiếu nại"}
        
        # Cập nhật trạng thái xử lý
        complaint.processed = True
        complaint.approved = approved
        complaint.status = "Đã duyệt" if approved else "Không duyệt"

        # Nếu duyệt khiếu nại, tạo bản ghi chấm công cho nhân viên
        if approved:
            # Lấy ngày từ complaint_time
            complaint_date = complaint.created_at.strftime("%d-%m-%Y")
            
            # Kiểm tra xem đã có bản ghi chấm công cho nhân viên vào ngày này chưa
            existing_attendance = session.query(Attendance).filter(
                Attendance.employee_id == complaint.employee_id,
                Attendance.date == complaint_date
            ).first()
                        
            if existing_attendance:
                # Nếu đã có, cập nhật thông tin check-in
                existing_attendance.checkin = complaint.created_at.time()
            else:
                # Nếu chưa có, tạo bản ghi mới
                # Xác định ca làm việc dựa vào thời gian
                complaint_time_obj = complaint.created_at.time()
                checkin(complaint.employee_id, complaint_time_obj)
        # Lưu thay đổi vào DB
        session.commit()
        
        return {"success": True, "message": "Xử lý khiếu nại thành công"}
        
    except Exception as e:
        session.rollback()
        return {"success": False, "message": f"Lỗi khi xử lý khiếu nại: {str(e)}"}