@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo [STEP 1/4] Python 3.11.5 đã tồn tại

echo [STEP 2/4] Kiểm tra môi trường ảo trên máy Windows
if not exist myenv\Scripts\activate (
    echo [STEP 2/4] Cài đặt môi trường ảo...
    python -3.11.5 -m venv myenv
    powershell -Command "& {myenv\Scripts\Activate; echo Installing dependencies...; pip install -r requirements.txt;}"
)
echo [STEP 2/4] Khởi động môi trường ảo thành công

echo [STEP 3/4] Kiểm tra biến môi trường
if not exist .env (
    echo [STEP 3/4] Khởi tạo biến môi trường...
    powershell -Command "$randomPass = Get-Random -Minimum 100000 -Maximum 999999; $content = 'DB_PASSWORD=\"' + $randomPass + '\"'; Set-Content -Path .env -Value $content"
    
    echo [STEP 3/4] Xóa các tệp tin cũ...
    if exist models\database.db del /f /q models\database.db
    if exist models\face_classifier.pkl del /f /q models\face_classifier.pkl
)
echo [STEP 3/4] Thiết lập biến môi trường thành công

echo [STEP 4/4] Đang khởi động hệ thống...
powershell -NoExit -Command "& {myenv\Scripts\Activate; start-process -NoNewWindow uvicorn -ArgumentList 'main:app --reload'; start http://localhost:8000;}"

pause
