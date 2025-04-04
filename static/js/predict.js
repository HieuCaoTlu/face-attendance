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

eventSource.onerror = () => {
  console.warn("Lỗi kết nối, đóng event source...");
  eventSource.close();
};

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
    eventSource.close();
  }
};
