import { playTextToSpeech } from "./speech.js";
import { showModal, updateAttendanceInfo } from "./modal.js";

const canvas = document.getElementById("camera");
const ctx = canvas.getContext("2d");

canvas.width = 800;
canvas.height = 600;

const eventSource = new EventSource("/stream/predict");

window.addEventListener("beforeunload", () => {
  eventSource.close();
  clearCanvas();
});

// Biến lưu hình ảnh hiện tại
let currentImageBase64 = null;

// Export biến để các module khác có thể truy cập
window.currentImageBase64 = currentImageBase64;

// Hàm xóa canvas
function clearCanvas() {
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}

eventSource.onmessage = async function (event) {
  try {
    const data = JSON.parse(event.data);

    // Xử lý ảnh
    const binary = Uint8Array.from(atob(data.image), (c) => c.charCodeAt(0));
    const blob = new Blob([binary], { type: "image/jpeg" });
    const bitmap = await createImageBitmap(blob);

    // Lưu ảnh hiện tại dưới dạng base64 để sử dụng cho khiếu nại
    currentImageBase64 = data.image;
    window.currentImageBase64 = currentImageBase64; // Cập nhật biến window

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    if (data.valid == true) {
      setTimeout(() => playTextToSpeech("Chấm công thành công!"), 0);
      
      // Hiển thị thông tin chấm công và modal
      updateAttendanceInfo(data.attendance);
      
      // Thêm sự kiện cho nút khiếu nại trong modal thông báo
      const submitButton = document.getElementById("submit-button");
      if (submitButton) {
        submitButton.onclick = function() {
          // Đóng modal hiện tại
          const fullscreenModal = document.getElementById("fullscreenModal");
          fullscreenModal.classList.remove("show");
          fullscreenModal.style.display = "none";
          fullscreenModal.style.visibility = "hidden";
          
          // Mở modal khiếu nại
          if (typeof window.processAndDisplayComplaintImage === 'function') {
            window.processAndDisplayComplaintImage(currentImageBase64);
          }
          return false; // Ngăn chặn hành vi mặc định
        };
      }
      
      // Đảm bảo modal hiển thị đúng cách - thêm một chút delay để đảm bảo DOM cập nhật
      setTimeout(() => {
        showModal();
      }, 100);
    }
  } catch (error) {
    console.error("Lỗi xử lý dữ liệu:", error);
  }
};

// Xử lý nút quản lý
const adminBtn = document.getElementById("admin-btn");
if (adminBtn) {
  adminBtn.addEventListener("click", () => {
    // Chuyển hướng đến trang admin
    window.location.href = "/admin";
  });
}
