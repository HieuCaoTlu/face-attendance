from fastapi import FastAPI, Request, Response, Depends, HTTPException, status
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse, RedirectResponse
from stream import stream_router
from admin import admin_router
from api import router
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from starlette.middleware.sessions import SessionMiddleware
import secrets
import base64

app = FastAPI(debug=True)
app.add_middleware(
    SessionMiddleware, 
    secret_key="face_attendance_secret_key", 
    session_cookie="admin_session",
    max_age=1800,  # 30 phút
    same_site="strict"
)
app.mount("/static", StaticFiles(directory="static"), name="static")
app.include_router(router, prefix="/api")
app.include_router(stream_router, prefix="/stream")
app.include_router(admin_router)
templates = Jinja2Templates(directory="templates")

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

@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    # Xóa trạng thái xác thực khi quay về trang chủ
    request.session.pop("admin_authenticated", None)
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/train", response_class=HTMLResponse)
async def train_page(request: Request, employee_id: str = None, name: str = None):
    # Hiển thị trang đăng ký khuôn mặt
    # Nếu có employee_id và name, hiển thị form train
    # Nếu không, hiển thị form tạo nhân viên
    if employee_id and name:
        return templates.TemplateResponse(
            "train.html", 
            {"request": request, "employee_id": employee_id, "name": name}
        )
    else:
        # Hiển thị form tạo nhân viên mới
        return templates.TemplateResponse("train.html", {"request": request})

@app.post("/login")
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

@app.get("/logout")
async def logout(request: Request, response: Response):
    # Xóa trạng thái xác thực khỏi session
    request.session.pop("admin_authenticated", None)
    response = RedirectResponse(url="/")
    return response

@app.get("/admin", response_class=HTMLResponse)
async def admin(request: Request):
    # Luôn kiểm tra xác thực
    is_authenticated = request.session.get("admin_authenticated", False)
    
    if not is_authenticated:
        # Luôn trả về trang login nếu chưa xác thực
        return templates.TemplateResponse("login.html", {"request": request})
    
    # Nếu đã xác thực, trả về trang admin
    return templates.TemplateResponse("admin.html", {"request": request})

