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

eventSource.onmessage = async function (event) {
  try {
    const data = JSON.parse(event.data);

    // Xử lý ảnh
    const binary = Uint8Array.from(atob(data.image), (c) => c.charCodeAt(0));
    const blob = new Blob([binary], { type: "image/jpeg" });
    const bitmap = await createImageBitmap(blob);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    if (data.valid == true) {
      setTimeout(() => playTextToSpeech("Chấm công thành công!"), 0);
      updateAttendanceInfo(data.attendance);
      setTimeout(() => showModal(), 50);
    }
  } catch (error) {
    console.error("Lỗi xử lý dữ liệu:", error);
  }
};

// Xử lý nút quản lý
const adminBtn = document.getElementById("admin-btn");
adminBtn.addEventListener("click", () => {
  // Chuyển hướng đến trang admin
  window.location.href = "/admin";
});

// Xử lý nút khiếu nại
const complaintBtn = document.getElementById("complaint-btn");
complaintBtn.addEventListener("click", () => {
  alert("Chức năng khiếu nại sẽ được phát triển trong tương lai!");
});
