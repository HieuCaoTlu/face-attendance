export function showModal() {
  const modal = document.getElementById("fullscreenModal");
  const progress = document.querySelector(".progress");

  modal.style.opacity = "1";
  modal.style.visibility = "visible";

  // Đảm bảo progress bắt đầu từ 0
  progress.style.transition = "none";
  progress.style.transform = "scaleX(0)";

  // Kích hoạt hiệu ứng sau 10ms để tránh việc transition bị bỏ qua
  setTimeout(() => {
    progress.style.transition = "transform 5s linear"; // Thêm lại transition
    progress.style.transform = "scaleX(1)";
  }, 10);

  setTimeout(() => {
    modal.style.opacity = "0";
    modal.addEventListener(
      "transitionend",
      function resetProgress() {
        modal.style.visibility = "hidden";

        // Tắt transition trước khi reset progress về 0 để tránh chạy ngược
        progress.style.transition = "none";
        progress.style.transform = "scaleX(0)";

        // Sau đó bật lại transition để chuẩn bị cho lần mở tiếp theo
        setTimeout(() => {
          progress.style.transition = "transform 5s linear";
        }, 10);

        modal.removeEventListener("transitionend", resetProgress);
      },
      { once: true }
    );
  }, 3000);
}

export function updateAttendanceInfo(attendance) {
  if (!attendance) return;
  console.log();
  requestAnimationFrame(() => {
    // Lấy phần tử trước khi cập nhật để tránh lỗi nếu phần tử không tồn tại
    const employeeIdEl = document.getElementById("employee_id");
    const employeeNameEl = document.getElementById("employee_name");
    const attendanceDateEl = document.getElementById("attendance_date");
    const attendanceCheckinEl = document.getElementById("attendance_checkin");
    const attendanceCheckoutEl = document.getElementById("attendance_checkout");
    const messageElement = document.getElementById("message");
    const checkinStatusElement = document.getElementById("checkin_status");
    const statusFieldElement = document.getElementById("status-field");

    if (employeeIdEl)
      employeeIdEl.textContent = attendance.employee_id || "N/A";
    if (employeeNameEl)
      employeeNameEl.textContent = attendance.employee_name || "N/A";
    if (attendanceDateEl)
      attendanceDateEl.textContent = attendance.attendance_date || "N/A";
    if (attendanceCheckinEl)
      attendanceCheckinEl.textContent = attendance.attendance_checkin || "N/A";
    if (attendanceCheckoutEl)
      attendanceCheckoutEl.textContent =
        attendance.attendance_checkout || "N/A";

    // Đổi tiêu đề thành Checkin/Checkout thành công
    if (messageElement) {
      messageElement.textContent =
        attendance.message === "checkin"
          ? "Checkin thành công"
          : attendance.message === "checkout"
          ? "Checkout thành công"
          : "Thành công";
    }

    // Cập nhật trạng thái đi sớm/đi muộn
    if (attendance.message == "checkin") {
      statusFieldElement.style.opacity = 1;
      checkinStatusElement.textContent = attendance.checkin_status;
    } else {
      statusFieldElement.style.opacity = 0;
    }
  });
}
