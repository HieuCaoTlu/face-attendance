@echo off
chcp 65001 > nul

REM Kiểm tra và thay đổi chính sách thực thi PowerShell
powershell -Command "Set-ExecutionPolicy RemoteSigned -Scope CurrentUser -Force"

echo [0] Kiểm tra phiên bản Python
py --version > nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo Đang tải Python 3.11.5...
    powershell -Command "Invoke-WebRequest -Uri https://www.python.org/ftp/python/3.11.5/python-3.11.5-amd64.exe -OutFile python-3.11.5-amd64.exe"
    echo [Lỗi] Python chưa được cài đặt.
    echo [Lỗi] Vui lòng cài đặt Python bằng cách chạy trình cài đặt vừa tải về và khởi động lại file này sau khi cài xong.
    timeout /t 5 /nobreak
    exit /b
)

echo [1] Kiểm tra môi trường ảo
if not exist myenv (
    echo [1] Đang tạo môi trường ảo...
    py -m venv myenv

    REM Kích hoạt môi trường ảo
    call myenv\Scripts\activate

    REM Kiểm tra xem tệp requirements.txt có tồn tại trong thư mục mẹ không
    echo [1] Đang cài đặt các thư viện
    pip install --no-cache-dir -r requirements.txt
)

echo [2] Đang kiểm tra biến môi trường
if not exist .env (
    echo [1] Đang tạo biến môi trường
    
    REM Sinh một dãy số ngẫu nhiên 5 chữ số
    setlocal enabledelayedexpansion
    set /a randomNum=%random% %% 100000

    REM Nếu số ngẫu nhiên có ít hơn 5 chữ số, bổ sung số 0 phía trước
    if !randomNum! lss 10000 set randomNum=0!randomNum!

    REM Ghi giá trị DB_PASSWORD vào file .env
    echo DB_PASSWORD='!randomNum!' > .env
    echo Đã tạo file .env

    REM Kiểm tra và xóa file database.db nếu tồn tại
    if exist database.db (
        echo Đang xóa file database.db...
        del /f /q database.db
    )

    REM Kiểm tra và xóa file models/face_classifier.pkl nếu tồn tại
    if exist models\face_classifier.pkl (
        echo Đang xóa file models/face_classifier.pkl...
        del /f /q models\face_classifier.pkl
    )
)

echo [3] Đang khởi tạo hệ thống
if exist myenv (
    powershell -NoExit -Command "& {myenv\Scripts\Activate; start-process -NoNewWindow uvicorn -ArgumentList 'main:app --workers 4';Start-Sleep -Seconds 3;start http://localhost:8000;}"
)

pause
