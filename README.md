# 📌 Hệ Thống Chấm Công Bằng Khuôn Mặt

## 0️⃣ Bối Cảnh

- 🎯 Đối tượng nhắm tới: Các công ty văn phòng có ca làm việc cố định sáng chiều.
- 🚫 Không hỗ trợ ca luân phiên cho thực tập sinh, cộng tác viên.
- 🤖 Phương pháp chấm công ít tiếp xúc, tiện lợi và nhanh chóng.

## 1️⃣ Giới Thiệu Chức Năng

- 👤 **Tạo nhân viên và huấn luyện khuôn mặt** bằng video 12s:
  - Giữ nguyên.
  - Quay trái.
  - Quay phải.
  - Ngửa lên.
- 📸 **Chấm công bằng khuôn mặt**:
  - Xác minh khuôn mặt trong **3s**.
  - Chỉ chấm công khi khuôn mặt gần camera.
  - Hiển thị kết quả chấm công ngay lập tức.
- 🏢 **Quản lý nhân sự và lịch sử chấm công**:
  - Cài đặt danh sách ca làm việc.
  - Quản lý danh sách nhân viên.
  - Quản lý lịch sử chấm công.
  - Xử lý danh sách khiếu nại.
  - 📊 Biểu đồ thống kê chấm công.
  - 📂 Xuất báo cáo chấm công.

## 2️⃣ Giới Thiệu Các Mô Hình Chính

- 🏷️ **Phát hiện khuôn mặt**: Sử dụng **Mediapipe Landmark** để nhận diện đặc trưng khuôn mặt.
- 🔍 **Trích xuất đặc trưng**: Dùng **Facenet** để tạo Embedding cho khuôn mặt.
- 🎯 **Phân loại khuôn mặt**: Sử dụng **SVC (Support Vector Classifier)** để nhận diện danh tính.

## 3️⃣ Giới Thiệu Công Nghệ

- ⚡ **FastAPI**: Dùng để xây dựng server RESTful, đảm bảo tốc độ và hiệu năng cao.
- 🗄️ **SQLite (có mã hóa)**: Lưu trữ dữ liệu nhân viên và lịch sử chấm công an toàn.
- 📷 **OpenCV (cv2)**: Hỗ trợ lấy hình ảnh từ camera và xử lý hình ảnh.

## 2️⃣ Cách Cài Đặt

### 🔰 Cho người sử dụng Windows:

1. 📥 Nhấn nút màu xanh Code > Download Zip. Sau đó lấy giải nén file `.zip`
2. Đi vào thư mục vừa giải nén
3. 🖥️ Chạy `run.bat`.
4. Nếu chưa có Python, `run.bat` sẽ hướng dẫn cài đặt
5. Sau khi có Python, sử dụng `run.bat` để tự động kích hoạt hệ thống chấm công

### 💻 Cho lập trình viên:

```bash
# Clone repository
 git clone -b dev https://github.com/HieuCaoTlu/face-attendance.git
 cd face-attendance

# Tạo môi trường Python ảo (yêu cầu phiên bản 3.11)
 py -m venv myenv
 myenv/Scripts/activate

# Cài đặt các thư viện cần thiết
 pip install -r requirements.txt

# Tạo file .env và điền như sau
 DB_PASSWORD = '<Dãy số bất kì>'

# Chạy server FastAPI
 fastapi dev main.py
```

## 3️⃣ Hạn Chế

- ❌ **Không hỗ trợ quét mặt 3D**: Hệ thống có thể bị qua mặt bằng ảnh in.
- ❌ **Thiếu hỗ trợ chấm công part-time**: Không phù hợp với công ty có ca luân phiên.
- ❌ **Chưa có phần cứng chuyên biệt**: Cần máy tính để chạy thay vì máy chấm công nhỏ gọn.

🚀 **Dự án đang tiếp tục phát triển để khắc phục các hạn chế trên!**
