# Hệ Thống Chấm Công 🕒

Hệ thống chấm công sử dụng nhận diện khuôn mặt để ghi nhận thời gian làm việc của nhân viên. Dưới đây là mô tả chi tiết về yêu cầu, cài đặt và cấu trúc của dự án.

---

## 1. Yêu Cầu Lập Trình Viên 👨‍💻

### 1️⃣ Lấy code mới nhất từ branch `dev`
```sh
git checkout dev
git pull origin dev
```

### 2️⃣ Tạo nhánh mới từ `dev`
```sh
git checkout -b <tên-thành-viên>/<tên-tính-năng>
```

### 3️⃣ Thực hiện thay đổi, commit với Conventional Commit
```sh
git add .
git commit -s -m "feat: mô tả ngắn gọn tính năng"
```
_(Thay `feat:` bằng `fix:`, `chore:`,... tùy vào loại commit)_

### 4️⃣ Push nhánh lên GitHub
```sh
git push origin <tên-thành-viên>/<tên-tính-năng>
```

### 5️⃣ Tạo Pull Request (PR) từ `<nhánh của bạn>` vào `dev`
- Vào GitHub, chọn **New Pull Request**
- Chọn **base: dev** ← **compare: <nhánh của bạn>**
- Thêm mô tả, nhấn **Create Pull Request**

### 6️⃣ Chờ review & merge PR
- Nếu cần chỉnh sửa, commit lại và push
- Khi PR được merge thành công, tiếp tục bước 7

### 7️⃣ Chuyển về branch `dev` & cập nhật code mới nhất
```sh
git checkout dev
git pull origin dev
```

### 8️⃣ Xóa branch cũ (sau khi merge thành công)
- Xóa branch cục bộ:  
  ```sh
  git branch -d <tên-thành-viên>/<tên-tính-năng>
  ```
- Xóa branch trên GitHub (chưa cần):  
  ```sh
  git push origin --delete <tên-thành-viên>/<tên-tính-năng>
  ```

🎯 **Mẹo:** Nếu bạn làm việc với nhiều PR, có thể dùng `git fetch --prune` để dọn dẹp các branch đã bị xóa trên remote. 🚀


### **Cách Cài Đặt và Khởi Động 🚀**

1. **Yêu cầu tiên quyết:**

   - Python 3.11 (~3.11.5)

2. **Cài đặt môi trường ảo:**

   ```bash
   py -m venv myenv
   py -3.11 -m venv #Trong trường hợp nhiều version
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
