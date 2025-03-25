const canvas = document.getElementById("camera");
const ctx = canvas.getContext("2d");

canvas.width = 800;
canvas.height = 600;

window.onload = () => {
  let label;
  do {
    label = prompt("Nhập label để huấn luyện:");
    if (label === null) return; // Nếu người dùng nhấn "Hủy", không làm gì cả
    label = label.trim();
  } while (label === "");

  startStreaming(label);
};

window.addEventListener("beforeunload", () => {
  eventSource.close();
  clearCanvas();
});

function startStreaming(label) {
  const eventSource = new EventSource(
    `/stream/train?label=${encodeURIComponent(label)}`
  );
  const img = document.createElement("img");

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
      if (data.message !== undefined) {
        console.log("Training Result:", data.message);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        eventSource.close();
      }
    } catch (error) {
      console.error("Lỗi xử lý dữ liệu:", error);
    }
  };
}
