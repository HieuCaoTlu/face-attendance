from fastapi import FastAPI, Request, Response, Depends, HTTPException, status
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse, RedirectResponse
from stream import stream_router
from api import router
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from starlette.middleware.sessions import SessionMiddleware
import secrets
import base64

app = FastAPI(debug=True)
app.add_middleware(SessionMiddleware, secret_key="face_attendance_secret_key")
app.mount("/static", StaticFiles(directory="static"), name="static")
app.include_router(router, prefix="/api")
app.include_router(stream_router, prefix="/stream")
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
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/train", response_class=HTMLResponse)
async def train_page(request: Request):
    return templates.TemplateResponse("train.html", {"request": request})

@app.post("/login")
async def login(request: Request, response: Response):
    form_data = await request.form()
    username = form_data.get("username")
    password = form_data.get("password")
    
    if verify_admin(username, password):
        # Đăng nhập thành công, lưu trạng thái vào session
        request.session["admin_authenticated"] = True
        return {"success": True}
    else:
        # Đăng nhập thất bại
        return {"success": False, "message": "Tài khoản hoặc mật khẩu không đúng!"}

@app.get("/logout")
async def logout(request: Request, response: Response):
    # Xóa trạng thái xác thực khỏi session
    request.session.pop("admin_authenticated", None)
    response = RedirectResponse(url="/")
    return response

@app.get("/admin", response_class=HTMLResponse)
async def admin(request: Request, is_authenticated: bool = Depends(get_admin_auth)):
    if not is_authenticated:
        # Trả về trang login thay vì chuyển hướng
        return templates.TemplateResponse("admin_login.html", {"request": request})
    
    # Nếu đã xác thực, trả về trang admin
    return templates.TemplateResponse("admin.html", {"request": request})

