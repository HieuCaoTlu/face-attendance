from database import session, Employee, Attendance, Complaint
from fastapi import Form, Path, APIRouter
from ai import refresh_train

router = APIRouter()


@router.post("/employee", tags=["Employee"])
async def add_employee(name: str = Form(...),position: str = Form(...)):
    new_employee = Employee(name=name, position=position)
    session.add(new_employee)
    session.commit()
    session.refresh(new_employee)

    # Gọi hàm train AI
    employee_id = new_employee.id

    return {"employee_id": employee_id,}

@router.get("/employee", tags=["Employee"])
async def employees():
    employees = session.query(Employee).all()
    employee_list = [{"id": emp.id, "name": emp.name, "position": emp.position} for emp in employees]
    return {"employees": employee_list}

@router.get("/employee/{employee_id}", tags=["Employee"])
async def get_employee(employee_id: int):
    """Lấy thông tin một nhân viên theo ID"""
    employee = session.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        return {"success": False, "message": "Không tìm thấy nhân viên"}
    
    return {
        "success": True,
        "id": employee.id,
        "name": employee.name,
        "position": employee.position
    }
    
@router.put("/employee/{employee_id}", tags=["Employee"])
async def update_employee(employee_id: int = Path(...), name: str = Form(...), position: str = Form(...)):
    try:
        # Tìm nhân viên theo ID
        employee = session.query(Employee).filter(Employee.id == employee_id).first()
        
        if not employee:
            return {"success": False, "message": f"Không tìm thấy nhân viên có ID {employee_id}"}
        
        # Cập nhật thông tin
        employee.name = name
        employee.position = position
        
        # Lưu vào CSDL
        session.commit()
        session.refresh(employee)
        
        return {"success": True, "message": "Cập nhật thông tin nhân viên thành công", "employee_id": employee.id}
    except Exception as e:
        session.rollback()
        return {"success": False, "message": f"Lỗi khi cập nhật nhân viên: {str(e)}", "employee_id": employee.id}

@router.delete("/employee/{employee_id}", tags=["Employee"])
async def delete_employee(employee_id: int = Path(...)):
    try:
        # Tìm nhân viên theo ID
        employee = session.query(Employee).filter(Employee.id == employee_id).first()
        if not employee: return {"success": False, "message": f"Không tìm thấy nhân viên có ID {employee_id}"}
        # Xóa tất cả các bản ghi chấm công liên quan
        session.query(Attendance).filter(Attendance.employee_id == employee_id).delete()
        # Xóa tất cả khiếu nại liên quan
        session.query(Complaint).filter(Complaint.employee_id == employee_id).delete()
        # Xóa nhân viên
        refresh_train(employee.id)
        session.delete(employee)
        session.commit()
        return {"success": True, "message": "Xóa nhân viên thành công"}
    except Exception as e:
        session.rollback()
        return {"success": False, "message": f"Lỗi khi xóa nhân viên: {str(e)}"}