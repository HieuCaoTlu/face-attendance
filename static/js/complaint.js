let imageBlob = null;
let employees = null;
let date = null;
let employee_id = null;
let reason = null;

// Function to format date
function formatDate(dateString) {
  const date = new Date(dateString);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${hours}:${minutes} ${day}-${month}-${year}`;
}

// Function to fetch complaint data
async function getComplaint() {
  try {
    const [imageRes, employeeRes, dateRes] = await Promise.all([
      fetch("/api/complaint_image"),
      fetch("/api/employee"),
      fetch("/api/date"),
    ]);

    // Handle image data
    const imageData = await imageRes.json();
    if (imageData.image) {
      const binary = Uint8Array.from(atob(imageData.image), (c) =>
        c.charCodeAt(0)
      );
      imageBlob = new Blob([binary], { type: "image/jpeg" });
      const imageUrl = URL.createObjectURL(imageBlob);
      document.getElementById("complaint-image").src = imageUrl;
    }

    // Handle employee data
    const employeeData = await employeeRes.json();
    employees = employeeData.employees || [];

    // Handle date data
    const dateData = await dateRes.json();
    document.querySelector(".date-input").value =
      "Thời gian: " + formatDate(dateData.date);
  } catch (error) {
    console.error("Lỗi khi lấy dữ liệu:", error);
  }
}

// Function to filter employees based on input
function filterEmployees() {
  const inputValue = inputField.value.toLowerCase();
  suggestionBox.innerHTML = "";

  if (!employees || employees.length === 0) return;

  const filtered = employees.filter(
    (emp) =>
      emp.name.toLowerCase().includes(inputValue) ||
      emp.id.toString().includes(inputValue)
  );

  if (filtered.length === 0) {
    suggestionBox.style.display = "none";
    return;
  }

  filtered.forEach((emp) => {
    const div = document.createElement("div");
    div.classList.add("suggestion-item");
    div.textContent = `ID: ${emp.id} - ${emp.name}`;
    div.addEventListener("click", () => selectEmployee(emp.id, emp.name));
    suggestionBox.appendChild(div);
  });

  suggestionBox.style.display = "block";
}

// Function to select an employee from the suggestion box
function selectEmployee(id, name) {
  inputField.value = id + " - " + name;
  employee_id = id;
  suggestionBox.style.display = "none";
}

// Function to submit the complaint
async function submitComplaint() {
  const submitButton = document.getElementById("submit-complaint");

  const formData = new FormData();
  formData.append("image", imageBlob);
  formData.append("employee_id", employee_id);
  formData.append("reason", reason);

  try {
    submitButton.disabled = true;
    submitButton.textContent = "Đang gửi...";

    const response = await fetch("/api/complaint", {
      method: "POST",
      body: formData,
    });
    if (response.ok) {
      const data = await response.json();
      console.log(data);
      submitButton.textContent = "Thành công! Nhấn để tạo khiếu nại khác";
      submitButton.disabled = false;

      submitButton.addEventListener("click", () => location.reload());
    } else {
      throw new Error("Gửi khiếu nại thất bại, vui lòng thử lại.");
    }
  } catch (error) {
    alert(error.message);
    submitButton.textContent = "Gửi Khiếu Nại";
  } finally {
    submitButton.disabled = false;
  }
}

// Event listeners
window.addEventListener("DOMContentLoaded", async () => {
  await getComplaint();
});

const inputField = document.getElementById("employee-name");
const suggestionBox = document.getElementById("employee-suggestions");

inputField.addEventListener("input", () => {
  filterEmployees();
});

document
  .getElementById("complaint-reason")
  .addEventListener("change", function () {
    reason = this.value;
  });

document.getElementById("submit-complaint").addEventListener("click", () => {
  submitComplaint();
});
