import { playTextToSpeech } from "./speech.js";

let employee_id;
const canvas = document.getElementById("camera");
const ctx = canvas.getContext("2d");
canvas.width = 800;
canvas.height = 600;

// Khi bấm vào "Xác nhận", đổi sang phần quét Camera
document.querySelector("form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const form = e.target;
  const formData = new FormData(form);
  const name = formData.get("name");
  const position = formData.get("position");

  try {
    const response = await fetch("/api/employee", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Có lỗi xảy ra khi gửi dữ liệu.");
    }

    const result = await response.json();
    employee_id = result.employee_id;
    console.log("API Response:", employee_id);

    document.getElementById("description").innerText =
      "Vui lòng để khuôn mặt gần camera trong 10s và làm theo chỉ dẫn.";

    document.querySelector(".wrapper").style.display = "none";
    document.getElementById("camera").style.display = "block";
    startStreaming(employee_id, name, position);
  } catch (error) {
    console.error("Lỗi:", error);
    alert("Đã xảy ra lỗi khi gửi thông tin. Vui lòng thử lại.");
  }
});

// Chuẩn bị camera
window.addEventListener("beforeunload", () => {
  eventSource.close();
  clearCanvas();
});

function startStreaming(label, name, position) {
  const eventSource = new EventSource(
    `/stream/train?label=${encodeURIComponent(label)}`
  );

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

      if (data.speech) {
        console.log(data.speech);
        playTextToSpeech(data.speech);
      }

      // Xử lý attendance_message
      if (data.message !== undefined) {
        console.log("Training Result:", data.message);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        eventSource.close();
        updateUIAfterTraining(name, position, employee_id);
        playTextToSpeech("Thành công");
      }
    } catch (error) {
      console.error("Lỗi xử lý dữ liệu:", error);
    }
  };
}

function updateUIAfterTraining(name, position, id) {
  document.querySelector(".wrapper").style.display = "block";
  document.getElementById("camera").style.display = "none";

  document.querySelector("h1").innerText = "Đăng ký thành công!";
  document.getElementById("description").innerText = `Xin chào ${name}!`;

  const form = document.querySelector("form");
  form.innerHTML = `
    <h2>Mã: ${id}</h2>
    <div class="input-field">
      <input type="text" value="Tên nhân viên: ${name}" disabled />
    </div>
    <div class="input-field">
      <input type="text" value="Vị trí làm việc: ${position}" disabled />
    </div>
    <button id="reload-button" type="button">Tạo nhân viên mới</button>
  `;

  document.getElementById("reload-button").addEventListener("click", (e) => {
    e.preventDefault();
    location.reload();
  });
}
