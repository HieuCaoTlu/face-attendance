from fastapi import APIRouter, Request, Response, Depends, HTTPException, status
from fastapi.responses import HTMLResponse, RedirectResponse

# Tạo router để quản lý các route liên quan đến admin
admin_router = APIRouter()


# Hàm xác thực admin
def verify_admin(username: str, password: str):
    # Sử dụng thông tin đăng nhập cố định
    return username == "admin" and password == "cv@123"

# Dependency kiểm tra xác thực
async def get_admin_auth(request: Request):
    # Kiểm tra session đã đăng nhập admin chưa
    if not request.session.get("admin_authenticated"):
        # Nếu chưa đăng nhập, trả về False
        return False
    # Nếu đã đăng nhập, trả về True
    return True

@admin_router.get("/admin", response_class=HTMLResponse)
async def admin_page(request: Request, response: Response):
    # Luôn kiểm tra xác thực
    is_authenticated = request.session.get("admin_authenticated", False)
    
    if not is_authenticated:
        # Luôn trả về trang login nếu chưa xác thực
        return templates.TemplateResponse("login.html", {"request": request})
    
    # Nếu đã xác thực, trả về trang admin
    return templates.TemplateResponse("admin.html", {"request": request})

@admin_router.post("/login")
async def login(request: Request, response: Response):
    form_data = await request.form()
    username = form_data.get("username")
    password = form_data.get("password")
    
    if verify_admin(username, password):
        # Đăng nhập thành công, lưu trạng thái vào session
        request.session["admin_authenticated"] = True
        # Chuyển hướng đến trang admin
        return RedirectResponse(url="/admin", status_code=status.HTTP_303_SEE_OTHER)
    else:
        # Đăng nhập thất bại
        # Hiển thị lỗi trên trang login
        return templates.TemplateResponse(
            "login.html", 
            {"request": request, "error": "Tài khoản hoặc mật khẩu không đúng!"}
        )

@admin_router.get("/logout")
async def logout(request: Request, response: Response):
    # Xóa trạng thái xác thực khỏi session
    request.session.pop("admin_authenticated", None)
    response = RedirectResponse(url="/")
    return response 