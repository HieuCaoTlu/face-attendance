const canvas = document.getElementById("camera");
const ctx = canvas.getContext("2d");

canvas.width = 800;
canvas.height = 600;

const eventSource = new EventSource("/stream/predict");
const img = document.createElement("img");

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

    // Xử lý attendance_message
    if (data.message != "") {
      console.log("Attendance:", data.message);
    }
  } catch (error) {
    console.error("Lỗi xử lý dữ liệu:", error);
  }
};

