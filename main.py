from fastapi import FastAPI, Request, Response
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse, RedirectResponse
from starlette.middleware.sessions import SessionMiddleware
from stream import stream_router
from api import router
from camera import stop_camera, ready_generate
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi import status
import signal
import sys

app = FastAPI(debug=True)
app.add_middleware(SessionMiddleware, secret_key="face_attendance_secret_key", session_cookie="admin_session", max_age=1, same_site="strict")
app.mount("/static", StaticFiles(directory="static"), name="static")
app.include_router(router, prefix="/api")
app.include_router(stream_router, prefix="/stream")
# app.include_router(admin_router)
templates = Jinja2Templates(directory="templates")

@app.get("/", response_class=HTMLResponse, tags=["Interface"])
async def index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/complaint", response_class=HTMLResponse, tags=["Interface"])
async def index(request: Request):
    return templates.TemplateResponse("complaint.html", {"request": request})

@app.get("/train", response_class=HTMLResponse, tags=["Interface"])
async def index(request: Request):
    return templates.TemplateResponse("train.html", {"request": request})

@app.get("/admin", response_class=HTMLResponse, tags=["Interface"])
async def admin(request: Request):
    is_authenticated = request.session.get("admin_authenticated", False)
    if not is_authenticated:
        return templates.TemplateResponse("login.html", {"request": request})
    return templates.TemplateResponse("admin.html", {"request": request})


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

@app.get("/admin", response_class=HTMLResponse)
async def admin_page(request: Request, response: Response):
    # Luôn kiểm tra xác thực
    is_authenticated = request.session.get("admin_authenticated", False)
    
    if not is_authenticated:
        # Luôn trả về trang login nếu chưa xác thực
        return templates.TemplateResponse("login.html", {"request": request})
    
    # Nếu đã xác thực, trả về trang admin
    return templates.TemplateResponse("admin.html", {"request": request})

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

def handle_signal(sig, frame):
    global ready_generate
    stop_camera()
    ready_generate = False
    sys.exit(0)

signal.signal(signal.SIGINT, handle_signal)