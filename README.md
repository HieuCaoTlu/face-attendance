# Hệ Thống Chấm Công 🕒

Hệ thống chấm công sử dụng nhận diện khuôn mặt để ghi nhận thời gian làm việc của nhân viên. Dưới đây là mô tả chi tiết về yêu cầu, cài đặt và cấu trúc của dự án.

---

## 1. Yêu Cầu Lập Trình Viên 👨‍💻

### **Quy Trình Phát Triển**

1. **Tách nhánh riêng** để lập trình các tính năng:

   - `master`: Nhánh chính, khi sản phẩm hoàn thiện.
   - `dev`: Nhánh phát triển, tách ra từ `master`
   - Các bạn sẽ checkout và tách nhánh từ `dev`
     ```bash
     git checkout -b <tên nhánh mới> dev
     ```

- Đặt tên nhánh: <tên thành viên>/<tính năng>
  VD: hieu/improve-camera
      hoang-anh/build-interface

2. **Sử dụng rebase** khi có tính năng mới, để đảm bảo commit đang sử dụng phiên bản mới nhất:

   ```bash
   # Cập nhật repo hiện tại, đồng thời lấy về commits mới nhất của dev
   git pull

   # Chuyển qua nhánh `login`, nếu bạn chưa ở nhánh này
   git checkout login

   # Thực hiện rebase
   git rebase dev

   # Chắc chắn bạn đang ở nhánh `login`
   git checkout login

   # Rebase lên dev interactively
   git rebase dev -i
   # Sử dụng 'fixup' (f) để ghép commit mà không cần commit message
   ```

### **Cách Cài Đặt và Khởi Động 🚀**

1. **Yêu cầu tiên quyết:**

   - Python 3.11 (~3.11.5)

2. **Cài đặt môi trường ảo:**

   ```bash
   python -m venv myenv
   python -3.11 -m venv #Trong trường hợp nhiều version
   ```

3. **Khởi động môi trường ảo:**

   - **Windows:** `myenv/Scripts/activate`
   - **macOS/Linux:** `source myenv/bin/activate`

4. **Cài đặt các thư viện phụ thuộc:**

   ```bash
   pip install -r requirements.txt
   ```

5. **Khởi động hệ thống:**
   ```bash
   fastapi dev main.py
   ```

### **Cách Commit Bằng Conventional Commit 📝**

- **Viết commit bằng tiếng Việt, sử dụng các thẻ:**

  - `feat:`: Thêm tính năng mới.
  - `fix:`: Sửa lỗi.
  - `refactor:`: Cải tiến mã nguồn.
  - `docs:`: Cập nhật tài liệu.
  - `style:`: Chỉnh sửa giao diện hoặc format mã nguồn mà không thay đổi logic.
  - `perf:`: Cải tiến hiệu suất.

- **Ví dụ về commit:**

  ```bash
  git commit -s -m "feat: thêm chức năng chấm công bằng khuôn mặt

  - Giảm tải thời gian load khuôn mặt
  - Chấm công sử dụng Facenet và SKC
  "
  ```

---

## 2. Mô Tả Về Cấu Trúc Dự Án 📂

### **Các Thư Mục và Tập Tin Chính**

- **models/**: Chứa các mô hình học sâu đã được huấn luyện và quantized.

  - `onnx_quantized`: Mô hình nhận diện khuôn mặt (Facenet) đã được huấn luyện và tối ưu hóa.
  - `face_classifier_skm`: Mô hình phân loại khuôn mặt (SVM) dùng để xác định nhân viên.

- **static/**: Chứa các tài nguyên tĩnh như CSS, fonts, images, JS, videos.

  - **Lưu ý:** Khi thêm mới các tài nguyên (CSS, JS), cần tách chúng thành các file riêng biệt và không ghi đè vào file CSS cũ.

- **templates/**: Chứa các tệp giao diện của hệ thống (HTML).

  - **Lưu ý:** Không sử dụng CDN và cần tách biệt các tệp CSS, JS ra khỏi HTML để giữ sự tổ chức tốt.

- **ai.py**: Xử lý tính năng AI:

  - Phát hiện khuôn mặt.
  - Dự đoán và huấn luyện mô hình nhận diện khuôn mặt.

- **api.py**: Định nghĩa các API để tương tác với cơ sở dữ liệu (DB).

- **camera.py**: Chứa các hàm xử lý stream camera cho các chức năng nhận diện khuôn mặt và huấn luyện mô hình.

- **database.py**: Định nghĩa các bảng trong cơ sở dữ liệu SQLite (ví dụ: bảng nhân viên, bảng chấm công).

- **stream.py**: Định nghĩa API để stream video từ camera lên giao diện web.

- **main.py**: Đăng ký các API và giao diện người dùng lên ứng dụng FastAPI.

---

## 3. Các Tính Năng Chính ⚙️

- **Chấm Công**: Hệ thống sử dụng nhận diện khuôn mặt để ghi nhận thời gian vào/ra của nhân viên.
- **Huấn Luyện Mô Hình**: Hệ thống cho phép huấn luyện lại mô hình nhận diện khuôn mặt khi có thêm dữ liệu mới.
- **Stream Camera**: Camera sẽ stream trực tiếp đến giao diện người dùng để nhận diện khuôn mặt.
- **API Quản Lý Dữ Liệu**: API để thêm, sửa và xóa thông tin nhân viên trong cơ sở dữ liệu.
