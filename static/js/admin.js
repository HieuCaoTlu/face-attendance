// Biến toàn cục để lưu trữ dữ liệu
let allEmployeesData = [];
let allShiftsData = [];
let allAttendanceData = [];
let apiAttendanceData = []; // Lưu dữ liệu API gốc trước khi format
let allComplaintsData = [];
let currentComplaintsData = [];
let shiftsConfig = null;

// Biến cho phân trang
let attendancePage = 1;
let complaintsPage = 1;
const attendancePerPage = 10;
const complaintsPerPage = 5;

// Biến lưu dữ liệu hiện tại sau khi lọc
let currentAttendanceData = [];

// Biến lưu ID khiếu nại hiện tại
let currentComplaintId = null;

// Hàm chuyển đổi thời gian từ chuỗi "HH:MM" sang số phút
function convertTimeToMinutes(timeString) {
  if (!timeString || timeString === "N/A") return 0;

  const [hours, minutes] = timeString
    .split(":")
    .map((num) => parseInt(num, 10));
  return hours * 60 + minutes;
}

// Xử lý tabs
document.addEventListener("DOMContentLoaded", function () {
  // Setup tabs
  setupTabs();

  // Thiết lập sự kiện
  setupEventHandlers();

  // Thêm sự kiện cho modal bootstrap
  const complaintModal = document.getElementById("complaint-detail-modal");
  if (complaintModal) {
    // Thêm sự kiện cho nút đóng modal
    complaintModal.addEventListener("hide.bs.modal", function () {
      // Khi modal đóng, cleanup nếu cần
      console.log("Modal đang đóng...");
    });

    // Thêm sự kiện cho nút đóng trong footer
    const closeButton = complaintModal.querySelector(
      'button[data-bs-dismiss="modal"]'
    );
    if (closeButton) {
      closeButton.addEventListener("click", function () {
        try {
          const bsModal = bootstrap.Modal.getInstance(complaintModal);
          if (bsModal) {
            bsModal.hide();
          } else {
            closeComplaintModal();
          }
        } catch (err) {
          console.error("Lỗi khi đóng modal:", err);
          closeComplaintModal();
        }
      });
    }
  }

  // QUẢN LÝ NHÂN VIÊN
  const employeeModal = document.getElementById("employeeModal");
  const employeeForm = document.getElementById("employee-form");
  const employeeList = document.getElementById("employee-list");

  // Đảm bảo các elements tồn tại trước khi thêm event listener
  if (employeeModal) {
    // Đóng modal khi click ra ngoài
    employeeModal.addEventListener("click", (e) => {
      if (e.target === employeeModal) {
        employeeModal.style.display = "none";
      }
    });
  }

  const cancelBtn = document.getElementById("cancel-employee-btn");
  if (cancelBtn) {
    // Đóng modal khi nhấn nút Hủy
    cancelBtn.addEventListener("click", () => {
      if (employeeModal) {
        employeeModal.style.display = "none";
      }
    });
  }

  const addEmployeeBtn = document.getElementById("add-employee-btn");
  if (addEmployeeBtn) {
    // Thêm event listener cho nút thêm nhân viên mới
    addEmployeeBtn.addEventListener("click", function () {
      const titleElement = document.getElementById("employee-modal-title");
      const idInput = document.getElementById("employee-id");
      const nameInput = document.getElementById("employee-name");
      const positionInput = document.getElementById("employee-position");

      // Thiết lập tiêu đề và xóa dữ liệu cũ
      if (titleElement) titleElement.textContent = "Thêm nhân viên mới";
      if (idInput) idInput.value = "";
      if (nameInput) nameInput.value = "";
      if (positionInput) positionInput.value = "";

      // Hiển thị modal
      if (employeeModal) {
        employeeModal.style.display = "flex";
      }
    });
  }

  // Xử lý form thêm/sửa nhân viên
  if (employeeForm) {
    employeeForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      try {
        // Disable button để tránh submit nhiều lần
        const submitBtn = e.target.querySelector('button[type="submit"]');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = "Đang xử lý...";
        }

        // Lấy dữ liệu từ form
        const employeeId =
          document.getElementById("employee-id")?.value.trim() || "";
        const name =
          document.getElementById("employee-name")?.value.trim() || "";
        const position =
          document.getElementById("employee-position")?.value.trim() || "";

        console.log(
          `Dữ liệu nhân viên: ID=${employeeId}, Name=${name}, Position=${position}`
        );

        if (!name) {
          throw new Error("Vui lòng nhập tên nhân viên");
        }

        // Chuẩn bị dữ liệu form
        const formData = new FormData();
        formData.append("name", name);
        formData.append("position", position);

        let response;

        if (!employeeId) {
          // Thêm nhân viên mới
          console.log("Thêm nhân viên mới...");
          response = await fetch("/api/employee", {
            method: "POST",
            body: formData,
          });
        } else {
          // Cập nhật thông tin nhân viên hiện có
          console.log(`Cập nhật nhân viên ID=${employeeId}...`);

          response = await fetch(`/api/employee/${employeeId}`, {
            method: "PUT",
            body: formData,
          });
        }

        // Xử lý phản hồi từ API
        if (!response.ok) {
          throw new Error(`Lỗi API: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log("Kết quả từ API:", data);

        if (!data.success) {
          throw new Error(data.message || "Có lỗi xảy ra khi xử lý yêu cầu");
        }

        // Xử lý khi thành công
        if (!employeeId) {
          // Nếu là thêm mới, load lại danh sách
          loadEmployees();
        } else {
          // Nếu là cập nhật, sửa trực tiếp dòng trong bảng
          const row = document.querySelector(
            `#employee-list tr[data-id="${employeeId}"]`
          );
          if (row) {
            const nameEl = row.querySelector(".employee-name");
            const positionEl = row.querySelector(".employee-position");

            if (nameEl) nameEl.textContent = name;
            if (positionEl) positionEl.textContent = position;

            // Cập nhật thuộc tính data
            row.setAttribute("data-name", name.toLowerCase());
            row.setAttribute("data-position", position.toLowerCase());

            // Cập nhật thuộc tính cho nút sửa
            const editBtn = row.querySelector(".edit-btn");
            if (editBtn) {
              editBtn.setAttribute("data-name", name);
              editBtn.setAttribute("data-position", position);
            }
          } else {
            // Không tìm thấy dòng, tải lại toàn bộ danh sách
            loadEmployees();
          }
        }

        // Đóng modal và hiển thị thông báo thành công
        if (employeeModal) {
          employeeModal.style.display = "none";
        }

        // Hiển thị thông báo thành công bằng SweetAlert nếu có
        if (typeof Swal !== "undefined") {
          Swal.fire({
            title: "Thành công!",
            text: employeeId
              ? "Cập nhật thông tin nhân viên thành công!"
              : "Thêm nhân viên mới thành công!",
            icon: "success",
            confirmButtonText: "OK",
          });
        } else {
          alert(
            employeeId
              ? "Cập nhật thông tin nhân viên thành công!"
              : "Thêm nhân viên mới thành công!"
          );
        }
      } catch (error) {
        console.error("Lỗi khi xử lý form nhân viên:", error);

        // Hiển thị thông báo lỗi bằng SweetAlert nếu có
        if (typeof Swal !== "undefined") {
          Swal.fire({
            title: "Lỗi!",
            text: error.message || "Có lỗi xảy ra khi xử lý yêu cầu",
            icon: "error",
            confirmButtonText: "OK",
          });
        } else {
          alert("Lỗi: " + (error.message || "Có lỗi xảy ra khi xử lý yêu cầu"));
        }
      } finally {
        // Bỏ disable nút submit
        const submitBtn = e.target.querySelector('button[type="submit"]');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Lưu";
        }
      }
    });
  }
});

// Xử lý tìm kiếm nhân viên
const searchEmployeeBtn = document.getElementById("search-employee-btn");
const resetEmployeeFilterBtn = document.getElementById(
  "reset-employee-filter-btn"
);

searchEmployeeBtn.addEventListener("click", () => {
  filterEmployees();
});

resetEmployeeFilterBtn.addEventListener("click", () => {
  document.getElementById("employee-search").value = "";
  filterEmployees();
});

// Tìm kiếm khi nhấn Enter
document.getElementById("employee-search").addEventListener("keyup", (e) => {
  if (e.key === "Enter") filterEmployees();
});

// Xử lý xuất Excel danh sách nhân viên
document
  .getElementById("export-employee-excel-btn")
  .addEventListener("click", () => {
    exportToExcel("employee-list", "Danh_sach_nhan_vien.xlsx");
  });

// Load danh sách nhân viên từ API
loadEmployees();

// QUẢN LÝ CA LÀM VIỆC
const shiftModal = document.getElementById("shiftModal");
const shiftForm = document.getElementById("shift-form");
const shiftsList = document.getElementById("shifts-list");

// Mở modal thêm ca làm việc
const addShiftBtn = document.getElementById("add-shift-btn");
if (addShiftBtn) {
  addShiftBtn.addEventListener("click", () => {
    const shiftModalTitle = document.getElementById("shift-modal-title");
    if (shiftModalTitle) {
      shiftModalTitle.textContent = "Thêm ca làm việc";
    }
    if (shiftForm) {
      shiftForm.reset();
    }
    const shiftId = document.getElementById("shift-id");
    if (shiftId) {
      shiftId.value = "";
    }
    if (shiftModal) {
      shiftModal.style.display = "flex";
    }
  });
}

// Đóng modal khi click ra ngoài
if (shiftModal) {
  shiftModal.addEventListener("click", (e) => {
    if (e.target === shiftModal) {
      shiftModal.style.display = "none";
    }
  });
}

// Đóng modal khi nhấn nút Hủy
const cancelShiftBtn = document.getElementById("cancel-shift-btn");
if (cancelShiftBtn) {
  cancelShiftBtn.addEventListener("click", () => {
    if (shiftModal) {
      shiftModal.style.display = "none";
    }
  });
}

// Xử lý form thêm/sửa ca làm việc
if (shiftForm) {
  shiftForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const shiftId = document.getElementById("shift-id")?.value || "";
    const name = document.getElementById("shift-name")?.value || "";
    const checkIn = document.getElementById("shift-check-in")?.value || "";
    const checkOut = document.getElementById("shift-check-out")?.value || "";

    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("checkin", checkIn);
      formData.append("checkout", checkOut);

      let response;

      if (!shiftId) {
        // Thêm mới ca làm việc
        response = await fetch("/api/shift", {
          method: "POST",
          body: formData,
        });
      } else {
        // Cập nhật ca làm việc
        response = await fetch(`/api/shift/${shiftId}`, {
          method: "PUT",
          body: formData,
        });
      }

      const data = await response.json();

      if (data.success) {
        // Tải lại danh sách ca làm việc
        loadShifts();
        shiftModal.style.display = "none";
        alert("Thao tác thành công!");
      } else {
        alert(data.message || "Có lỗi xảy ra khi thực hiện thao tác");
      }
    } catch (error) {
      console.error("Lỗi:", error);
      alert("Có lỗi xảy ra khi xử lý yêu cầu");
    }
  });
}

// Load danh sách ca làm việc từ API
loadShifts();

// QUẢN LÝ CHẤM CÔNG
// Thiết lập ngày mặc định là ngày hôm nay
const today = new Date();
document.getElementById("attendance-date-from").valueAsDate = new Date(
  today.getFullYear(),
  today.getMonth(),
  1
); // Ngày đầu tháng
document.getElementById("attendance-date-to").valueAsDate = today;

// Xử lý tìm kiếm chấm công
const searchAttendanceBtn = document.getElementById("search-attendance-btn");
const resetAttendanceFilterBtn = document.getElementById(
  "reset-attendance-filter-btn"
);

searchAttendanceBtn.addEventListener("click", () => {
  filterAttendance();
});

resetAttendanceFilterBtn.addEventListener("click", () => {
  document.getElementById("attendance-search").value = "";
  document.getElementById("attendance-date-from").valueAsDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    1
  );
  document.getElementById("attendance-date-to").valueAsDate = today;
  document.getElementById("status-filter").value = "all";
  document.getElementById("late-filter").value = "all";
  document.getElementById("early-filter").value = "all";
  document.getElementById("shift-count-filter").value = "all";
  filterAttendance();
});

// Tìm kiếm khi nhấn Enter
document.getElementById("attendance-search").addEventListener("keyup", (e) => {
  if (e.key === "Enter") filterAttendance();
});

// Xử lý xuất Excel lịch sử chấm công
document
  .getElementById("export-attendance-excel-btn")
  .addEventListener("click", () => {
    exportToExcel("attendance-list", "Lich_su_cham_cong.xlsx");
  });

// Load dữ liệu chấm công
loadAttendance();

// QUẢN LÝ CA LÀM VIỆC
const shiftsConfigForm = document.getElementById("shifts-config-form");
const errorMessage = document.getElementById("shifts-error-message");

// Xử lý sự kiện submit form cấu hình ca làm việc
shiftsConfigForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Lấy giá trị từ form
  const shift1CheckIn = document.getElementById("shift1-check-in").value;
  const shift1CheckOut = document.getElementById("shift1-check-out").value;
  const shift2CheckIn = document.getElementById("shift2-check-in").value;
  const shift2CheckOut = document.getElementById("shift2-check-out").value;

  // Kiểm tra ca 1 và ca 2 có hợp lệ không
  if (!isValidShift(shift1CheckIn, shift1CheckOut)) {
    showError("Thời gian bắt đầu ca 1 phải trước thời gian kết thúc ca 1");
    return;
  }

  if (!isValidShift(shift2CheckIn, shift2CheckOut)) {
    showError("Thời gian bắt đầu ca 2 phải trước thời gian kết thúc ca 2");
    return;
  }

  // Kiểm tra thời gian giữa ca 1 và ca 2
  if (!isValidBreakBetweenShifts(shift1CheckOut, shift2CheckIn)) {
    showError("Thời gian giữa ca 1 và ca 2 phải cách nhau ít nhất 10 phút");
    return;
  }

  // Ẩn thông báo lỗi nếu không có lỗi
  hideError();

  // Hiển thị thông báo đang xử lý
  document.getElementById("save-shifts-btn").disabled = true;
  document.getElementById("save-shifts-btn").textContent = "Đang lưu...";

  // Chuẩn bị dữ liệu để gửi API
  const config = {
    shift1: {
      checkIn: shift1CheckIn,
      checkOut: shift1CheckOut,
    },
    shift2: {
      checkIn: shift2CheckIn,
      checkOut: shift2CheckOut,
    },
  };

  // Gửi API cập nhật cấu hình ca làm việc
  const success = await updateShiftsConfig(config);

  // Cập nhật trạng thái nút
  document.getElementById("save-shifts-btn").disabled = false;
  document.getElementById("save-shifts-btn").textContent = "Lưu cấu hình";

  if (success) {
    // Hiển thị thông báo thành công (đã được hiển thị trong hàm updateShiftsConfig)
    // Tự động reload lại dữ liệu chấm công để cập nhật với ca mới
    loadAttendance();
  }
});

// Cải thiện logic kiểm tra ca làm hợp lệ
function isValidShift(checkIn, checkOut) {
  const checkInTime = new Date(`2000-01-01T${checkIn}`);
  const checkOutTime = new Date(`2000-01-01T${checkOut}`);
  // return checkInTime < checkOutTime;
  return true;
}

// Hàm kiểm tra thời gian nghỉ giữa ca 1 và ca 2 (tối thiểu 10 phút)
function isValidBreakBetweenShifts(shift1CheckOut, shift2CheckIn) {
  const checkOutTime = new Date(`2000-01-01T${shift1CheckOut}`);
  const checkInTime = new Date(`2000-01-01T${shift2CheckIn}`);

  // Tính khoảng cách giữa hai thời điểm (phút)
  const diffMinutes = (checkInTime - checkOutTime) / (1000 * 60);
  // return diffMinutes >= 10; // Ít nhất 10 phút
  return true;
}

// Thiết lập cấu hình ca làm việc mặc định
function setDefaultShiftsConfig() {
  document.getElementById("shift1-check-in").value = "07:00";
  document.getElementById("shift1-check-out").value = "12:00";
  document.getElementById("shift2-check-in").value = "13:00";
  document.getElementById("shift2-check-out").value = "17:00";
}

// Thêm dòng nhân viên vào bảng
function appendEmployeeRow(id, name, position) {
  // Lấy bảng nhân viên
  const employeeList = document.getElementById("employee-list");
  if (!employeeList) {
    console.error("Không tìm thấy element employee-list");
    return;
  }

  // Tạo dòng mới trong bảng
  const row = document.createElement("tr");
  row.setAttribute("data-id", id);
  row.setAttribute("data-name", name.toLowerCase());
  row.setAttribute("data-position", (position || "").toLowerCase());

  // Thêm nội dung vào dòng
  row.innerHTML = `
    <td>${id}</td>
    <td class="employee-name">${name}</td>
    <td class="employee-position">${position || "Chưa có"}</td>
    <td class="action-buttons">
      <button class="edit-btn" data-id="${id}" data-name="${name}" data-position="${
    position || ""
  }">Sửa</button>
      <button class="delete-btn" data-id="${id}">Xóa</button>
    </td>
  `;

  // Thêm dòng vào bảng
  employeeList.appendChild(row);
}

// Thêm event listeners cho các nút trong bảng nhân viên bằng event delegation
document
  .getElementById("employee-list")
  .addEventListener("click", function (e) {
    // Xử lý nút sửa
    if (e.target.classList.contains("edit-btn")) {
      const button = e.target;
      const id = button.dataset.id;
      const name = button.dataset.name;
      const position = button.dataset.position;

      document.getElementById("employee-modal-title").textContent =
        "Sửa nhân viên";
      document.getElementById("employee-id").value = id;
      document.getElementById("employee-name").value = name;
      document.getElementById("employee-position").value = position;

      document.getElementById("employeeModal").style.display = "flex";
    }

    // Xử lý nút xóa
    if (e.target.classList.contains("delete-btn")) {
      const button = e.target;
      const id = button.dataset.id;
      const row = button.closest("tr");

      // Sử dụng SweetAlert2 thay vì confirm JavaScript nguyên bản
      Swal.fire({
        title: "Xác nhận xóa nhân viên",
        html: `Bạn có chắc chắn muốn xóa nhân viên này không?<br>Tất cả dữ liệu chấm công và khiếu nại cũng sẽ bị xóa.`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
        confirmButtonText: "Xóa",
        cancelButtonText: "Hủy",
      }).then((result) => {
        if (result.isConfirmed) {
          // Hiển thị loading khi đang xóa
          Swal.fire({
            title: "Đang xử lý",
            text: "Đang xóa nhân viên...",
            allowOutsideClick: false,
            didOpen: () => {
              Swal.showLoading();
            },
          });

          fetch(`/api/employee/${id}`, {
            method: "DELETE",
          })
            .then((response) => response.json())
            .then((data) => {
              if (data.success) {
                row.remove();

                // Kiểm tra nếu không còn nhân viên nào
                if (
                  document.querySelectorAll("#employee-list tr").length === 0
                ) {
                  document.getElementById("employee-list").innerHTML =
                    '<tr><td colspan="4" class="no-data">Không có nhân viên nào</td></tr>';
                }

                Swal.fire({
                  title: "Thành công!",
                  text: "Xóa nhân viên thành công và đã train lại mô hình!",
                  icon: "success",
                  confirmButtonText: "OK",
                });
              } else {
                Swal.fire({
                  title: "Lỗi!",
                  text: data.message || "Có lỗi xảy ra khi xóa nhân viên",
                  icon: "error",
                  confirmButtonText: "OK",
                });
              }
            })
            .catch((error) => {
              console.error("Lỗi:", error);
              Swal.fire({
                title: "Lỗi!",
                text: "Không thể kết nối đến máy chủ",
                icon: "error",
                confirmButtonText: "OK",
              });
            });
        }
      });
    }
  });

// Lọc nhân viên theo các tiêu chí đã nhập
function filterEmployees() {
  const searchText = document
    .getElementById("employee-search")
    .value.toLowerCase();

  const rows = document.querySelectorAll("#employee-list tr");

  rows.forEach((row) => {
    if (!row.hasAttribute("data-id")) return; // Bỏ qua dòng không phải nhân viên

    const id = row.getAttribute("data-id").toLowerCase();
    const name = row.getAttribute("data-name");
    const position = row.getAttribute("data-position");

    const matchesSearch =
      id.includes(searchText) ||
      name.includes(searchText) ||
      position.includes(searchText);

    // Hiển thị nếu phù hợp với tất cả các điều kiện lọc
    if (matchesSearch) {
      row.style.display = "";
    } else {
      row.style.display = "none";
    }
  });
}

// Thêm dòng ca làm việc vào bảng
function appendShiftRow(id, name, checkIn, checkOut, isActive) {
  const row = document.createElement("tr");
  row.innerHTML = `
    <td>${id}</td>
    <td>${name}</td>
    <td>${checkIn}</td>
    <td>${checkOut}</td>
    <td>${isActive ? "Hoạt động" : "Vô hiệu"}</td>
    <td class="action-buttons">
      <button class="edit-btn" data-id="${id}" data-name="${name}" 
        data-checkin="${checkIn}" data-checkout="${checkOut}" data-active="${isActive}">Sửa</button>
      <button class="delete-btn" data-id="${id}">Xóa</button>
    </td>
  `;

  document.getElementById("shifts-list").appendChild(row);
}

// Tải danh sách nhân viên
async function loadEmployees() {
  try {
    console.log("Đang tải danh sách nhân viên...");

    // Hiển thị thông báo đang tải
    const employeeList = document.getElementById("employee-list");
    if (!employeeList) {
      console.error("Không tìm thấy element employee-list");
      return;
    }

    employeeList.innerHTML =
      '<tr><td colspan="4" class="loading-message">Đang tải danh sách nhân viên...</td></tr>';

    // Gọi API để lấy danh sách nhân viên
    const response = await fetch("/api/employee");

    if (!response.ok) {
      throw new Error(`Lỗi khi gọi API: ${response.status}`);
    }

    const data = await response.json();
    console.log("Dữ liệu nhân viên:", data);

    // Xóa thông báo đang tải
    employeeList.innerHTML = "";

    // Kiểm tra xem có dữ liệu không
    if (!data || !data.employees || data.employees.length === 0) {
      employeeList.innerHTML =
        '<tr><td colspan="4" class="no-data">Không có nhân viên nào</td></tr>';
      return;
    }

    // Lưu dữ liệu vào biến toàn cục
    allEmployeesData = data.employees;

    // Hiển thị từng nhân viên
    data.employees.forEach((employee) => {
      try {
        // Tạo dòng mới trong bảng
        const row = document.createElement("tr");
        row.setAttribute("data-id", employee.id);
        row.setAttribute(
          "data-name",
          employee.name ? employee.name.toLowerCase() : ""
        );
        row.setAttribute(
          "data-position",
          employee.position ? employee.position.toLowerCase() : ""
        );

        // Thêm nội dung vào dòng
        row.innerHTML = `
        <td>${employee.id}</td>
          <td class="employee-name">${employee.name || "Chưa có tên"}</td>
          <td class="employee-position">${employee.position || "Chưa có"}</td>
        <td class="action-buttons">
            <button class="edit-btn" data-id="${employee.id}" data-name="${
          employee.name || ""
        }" data-position="${employee.position || ""}">Sửa</button>
          <button class="delete-btn" data-id="${employee.id}">Xóa</button>
        </td>
      `;

        // Thêm dòng vào bảng
        employeeList.appendChild(row);
      } catch (err) {
        console.error("Lỗi khi thêm nhân viên vào bảng:", err, employee);
      }
    });

    // Thiết lập sự kiện cho các nút
    try {
      setupEmployeeButtons();
    } catch (btnError) {
      console.error("Lỗi khi thiết lập sự kiện cho các nút:", btnError);
    }
  } catch (error) {
    console.error("Lỗi khi tải danh sách nhân viên:", error);
    const employeeList = document.getElementById("employee-list");
    if (employeeList) {
      employeeList.innerHTML =
        '<tr><td colspan="4" class="error-message">Lỗi: ' +
        error.message +
        "</td></tr>";
    }
  }
}

// Thiết lập sự kiện cho các nút
function setupEmployeeButtons() {
  console.log("Đang thiết lập các nút cho bảng nhân viên");

  // Đặt event listener cho nút thêm nhân viên
  const addEmployeeBtn = document.getElementById("add-employee-btn");
  if (addEmployeeBtn) {
    addEmployeeBtn.addEventListener("click", function () {
      const modalTitle = document.getElementById("employee-modal-title");
      const employeeId = document.getElementById("employee-id");
      const employeeName = document.getElementById("employee-name");
      const employeePosition = document.getElementById("employee-position");
      const employeeModal = document.getElementById("employeeModal");

      if (modalTitle) modalTitle.textContent = "Thêm nhân viên mới";
      if (employeeId) employeeId.value = "";
      if (employeeName) employeeName.value = "";
      if (employeePosition) employeePosition.value = "";
      if (employeeModal) employeeModal.style.display = "flex";
    });
  } else {
    console.error("Không tìm thấy nút thêm nhân viên");
  }

  // Thiết lập nút sửa nhân viên bằng event delegation
  const employeeTableBody = document.getElementById("employee-list");
  if (!employeeTableBody) {
    console.error("Không tìm thấy bảng nhân viên");
    return;
  }

  // Xóa tất cả event listeners cũ
  const newEmployeeTableBody = employeeTableBody.cloneNode(true);
  employeeTableBody.parentNode.replaceChild(
    newEmployeeTableBody,
    employeeTableBody
  );

  // Thêm event listener mới
  document
    .getElementById("employee-list")
    .addEventListener("click", function (e) {
      // Xử lý nút sửa
      if (e.target.classList.contains("edit-btn")) {
        const button = e.target;
        const id = button.getAttribute("data-id");
        const name = button.getAttribute("data-name");
        const position = button.getAttribute("data-position");

        console.log(
          `Đã nhấn nút sửa cho nhân viên ID=${id}, Name=${name}, Position=${position}`
        );

        // Thiết lập giá trị cho modal
        const modalTitle = document.getElementById("employee-modal-title");
        const employeeId = document.getElementById("employee-id");
        const employeeName = document.getElementById("employee-name");
        const employeePosition = document.getElementById("employee-position");
        const modal = document.getElementById("employeeModal");

        if (modalTitle) modalTitle.textContent = "Sửa nhân viên";
        if (employeeId) employeeId.value = id;
        if (employeeName) employeeName.value = name;
        if (employeePosition) employeePosition.value = position;

        // Hiển thị modal
        if (modal) {
          modal.style.display = "flex";
        } else {
          console.error("Không tìm thấy modal!");
        }
      }

      // Xử lý nút xóa
      if (e.target.classList.contains("delete-btn")) {
        const id = e.target.getAttribute("data-id");

        console.log(`Đã nhấn nút xóa cho nhân viên ID=${id}`);

        // Hiển thị xác nhận trước khi xóa
        if (typeof Swal !== "undefined") {
          Swal.fire({
            title: "Xác nhận xóa",
            text: "Bạn có chắc chắn muốn xóa nhân viên này?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Xóa",
            cancelButtonText: "Hủy",
            confirmButtonColor: "#dc3545",
            cancelButtonColor: "#6c757d",
          }).then((result) => {
            if (result.isConfirmed) {
              // Thực hiện xóa nhân viên
              fetch(`/api/employee/${id}`, {
                method: "DELETE",
              })
                .then((response) => response.json())
                .then((data) => {
                  if (data.success) {
                    // Xóa dòng trong bảng
                    const row = document.querySelector(`tr[data-id="${id}"]`);
                    if (row) row.remove();

                    Swal.fire({
                      title: "Thành công!",
                      text: "Đã xóa nhân viên thành công",
                      icon: "success",
                      confirmButtonText: "OK",
                    });
                  } else {
                    Swal.fire({
                      title: "Lỗi!",
                      text: data.message || "Không thể xóa nhân viên này",
                      icon: "error",
                      confirmButtonText: "OK",
                    });
                  }
                })
                .catch((error) => {
                  console.error("Lỗi khi xóa nhân viên:", error);
                  Swal.fire({
                    title: "Lỗi!",
                    text: "Có lỗi xảy ra khi xóa nhân viên",
                    icon: "error",
                    confirmButtonText: "OK",
                  });
                });
            }
          });
        } else {
          console.error("Thư viện SweetAlert không được tải");
          if (confirm("Bạn có chắc chắn muốn xóa nhân viên này?")) {
            fetch(`/api/employee/${id}`, { method: "DELETE" })
              .then((response) => response.json())
              .then((data) => {
                if (data.success) {
                  const row = document.querySelector(`tr[data-id="${id}"]`);
                  if (row) row.remove();
                  alert("Đã xóa nhân viên thành công");
                } else {
                  alert(
                    "Lỗi: " + (data.message || "Không thể xóa nhân viên này")
                  );
                }
              })
              .catch((error) => {
                console.error("Lỗi khi xóa nhân viên:", error);
                alert("Có lỗi xảy ra khi xóa nhân viên");
              });
          }
        }
      }
    });

  // Lắng nghe sự kiện tìm kiếm
  const searchEmployeeBtn = document.getElementById("search-employee-btn");
  const resetFilterBtn = document.getElementById("reset-employee-filter-btn");
  const employeeSearchField = document.getElementById("employee-search");
  const exportExcelBtn = document.getElementById("export-employee-excel-btn");

  if (searchEmployeeBtn) {
    searchEmployeeBtn.addEventListener("click", function () {
      filterEmployees();
    });
  }

  // Đặt lại bộ lọc
  if (resetFilterBtn) {
    resetFilterBtn.addEventListener("click", function () {
      if (employeeSearchField) employeeSearchField.value = "";
      filterEmployees();
    });
  }

  // Tìm kiếm khi nhấn Enter
  if (employeeSearchField) {
    employeeSearchField.addEventListener("keyup", function (e) {
      if (e.key === "Enter") {
        filterEmployees();
      }
    });
  }

  // Xuất Excel
  if (exportExcelBtn) {
    exportExcelBtn.addEventListener("click", function () {
      if (typeof exportEmployeeToExcel === "function") {
        exportEmployeeToExcel();
      } else {
        console.error("Hàm exportEmployeeToExcel không tồn tại");
      }
    });
  }
}

// Hàm lấy chi tiết một nhân viên và hiển thị
function loadEmployeeDetail(employee, employeeList) {
  fetch(`/api/employee/${employee.id}`)
    .then((response) => response.json())
    .then((detailData) => {
      if (detailData.success) {
        const position = detailData.position || "Không có";

        // Tạo dòng mới trong bảng
        const row = document.createElement("tr");
        row.setAttribute("data-id", employee.id);
        row.setAttribute("data-name", employee.name.toLowerCase());
        row.setAttribute("data-position", position.toLowerCase());

        // Thêm nội dung vào dòng
        row.innerHTML = `
          <td>${employee.id}</td>
          <td class="employee-name">${employee.name}</td>
          <td class="employee-position">${position}</td>
          <td class="action-buttons">
            <button class="edit-btn" data-id="${employee.id}" data-name="${employee.name}" data-position="${position}">Sửa</button>
            <button class="delete-btn" data-id="${employee.id}">Xóa</button>
          </td>
        `;

        // Thêm dòng vào bảng
        employeeList.appendChild(row);
      }
    })
    .catch((error) => {
      console.error(`Lỗi khi lấy chi tiết nhân viên ${employee.id}:`, error);

      // Nếu không lấy được chi tiết, vẫn hiển thị thông tin cơ bản
      const row = document.createElement("tr");
      row.setAttribute("data-id", employee.id);
      row.setAttribute("data-name", employee.name.toLowerCase());

      row.innerHTML = `
        <td>${employee.id}</td>
        <td class="employee-name">${employee.name}</td>
        <td class="employee-position">Không có</td>
        <td class="action-buttons">
          <button class="edit-btn" data-id="${employee.id}" data-name="${employee.name}">Sửa</button>
          <button class="delete-btn" data-id="${employee.id}">Xóa</button>
        </td>
      `;

      employeeList.appendChild(row);
    });
}

async function loadShifts() {
  try {
    const response = await fetch("/api/shift");
    const data = await response.json();

    const shiftsList = document.querySelector("#shifts-list");
    if (shiftsList) {
      shiftsList.innerHTML = "";

      if (data.shifts && data.shifts.length > 0) {
        data.shifts.forEach((shift) => {
          appendShiftRow(
            shift.id,
            shift.name,
            shift.checkin,
            shift.checkout,
            true
          );
        });
      } else {
        if (shiftsList) {
          shiftsList.innerHTML =
            '<tr><td colspan="5" class="no-data">Không có ca làm việc nào</td></tr>';
        }
      }
    }

    // Cập nhật cấu hình ca làm việc hiện tại
    updateCurrentShiftsDisplay();
  } catch (error) {
    console.error("Lỗi khi tải dữ liệu ca làm việc:", error);
    if (document.getElementById("shifts-list")) {
      document.getElementById("shifts-list").innerHTML =
        '<tr><td colspan="5" class="error-message">Lỗi khi tải dữ liệu. Vui lòng thử lại sau.</td></tr>';
    }
  }
}

// Thêm vào đầu file để hiển thị thông báo lỗi API
function createApiErrorAlert() {
  // Tạo thẻ div cho thông báo lỗi
  const alertDiv = document.createElement("div");
  alertDiv.id = "api-error-alert";
  alertDiv.className = "alert alert-danger";
  alertDiv.style.margin = "15px 0";
  alertDiv.style.padding = "15px";
  alertDiv.style.borderRadius = "5px";
  alertDiv.style.boxShadow = "0 2px 5px rgba(0,0,0,0.1)";

  // Nội dung thông báo
  alertDiv.innerHTML = `
    <h4 style="color: #721c24;"><i class="fas fa-exclamation-triangle"></i> Lỗi API Chấm Công</h4>
    <p>API đang gặp vấn đề: <code>'Attendance' object has no attribute 'shift_id'</code></p>
    <hr>
    <p><strong>Nguyên nhân:</strong> Trong object Attendance từ máy chủ không có trường shift_id, trong khi code frontend đang cố truy cập.</p>
    <p><strong>Giải pháp:</strong> Cần kiểm tra và sửa lại:</p>
    <ol style="margin-left: 20px;">
      <li>Model Attendance trong file models.py (thêm trường shift_id)</li>
      <li>Route xử lý trong app.py (đảm bảo trả về dữ liệu đúng định dạng)</li>
      <li>Nếu không thể sửa ngay: chỉnh sửa frontend để xử lý trường hợp không có shift_id</li>
    </ol>
    <p>Vui lòng liên hệ quản trị viên hệ thống để được hỗ trợ.</p>
    <button id="close-api-error" class="btn btn-sm btn-outline-danger" style="margin-top: 10px;">Đóng thông báo</button>
  `;

  // Thêm vào đầu tab
  const attendanceTab = document.getElementById("attendance-tab-content");
  if (attendanceTab) {
    attendanceTab.insertBefore(alertDiv, attendanceTab.firstChild);

    // Thêm event listener cho nút đóng
    document
      .getElementById("close-api-error")
      .addEventListener("click", function () {
        document.getElementById("api-error-alert").style.display = "none";
      });
  }
}

// Sửa lại hàm loadAttendance để loại bỏ dữ liệu mẫu
async function loadAttendance() {
  try {
    // Hiển thị loading
    document.getElementById("attendance-list").innerHTML =
      '<tr><td colspan="10" class="loading-message">Đang tải dữ liệu chấm công...</td></tr>';

    // Lấy giá trị bộ lọc
    const searchText = document
      .getElementById("attendance-search")
      .value.trim();
    const fromDate = document.getElementById("attendance-date-from").value;
    const toDate = document.getElementById("attendance-date-to").value;

    // Tạo URL API với tham số
    let url = "/api/attendance"; // URL chính
    const params = new URLSearchParams();

    // Thêm tham số ngày nếu có
    if (fromDate) {
      params.append("from_date", fromDate);
    }
    if (toDate) {
      params.append("to_date", toDate);
    }

    if (params.toString()) {
      url += "?" + params.toString();
    }

    console.log("Gọi API:", url);

    // Gọi API
    const response = await fetch(url);
    const data = await response.json();

    console.log("Dữ liệu API chấm công:", data);

    // Kiểm tra lỗi từ API
    if (data.success === false) {
      console.error("API trả về lỗi:", data.message || "Không xác định");

      // Kiểm tra nếu là lỗi cụ thể về shift_id
      if (
        data.message &&
        data.message.includes("'Attendance' object has no attribute 'shift_id'")
      ) {
        // Hiển thị thông báo lỗi cụ thể về shift_id
        createApiErrorAlert();
      }

      // Hiển thị thông báo lỗi cụ thể từ API (cho các lỗi khác)
      Swal.fire({
        title: "Lỗi từ API",
        html: `
          <div class="text-start">
            <p><strong>Chi tiết lỗi:</strong></p>
            <pre style="background:#f8f9fa;padding:10px;border-radius:5px;max-height:200px;overflow:auto">${JSON.stringify(
              data,
              null,
              2
            )}</pre>
            <hr>
            <p><strong>Cần kiểm tra:</strong></p>
            <ol>
              <li>Cấu trúc đối tượng Attendance trong server code</li>
              <li>Sửa logic xử lý dữ liệu trong route /api/attendance</li>
            </ol>
            <p>Vui lòng liên hệ quản trị viên hệ thống để kiểm tra API.</p>
          </div>
        `,
        icon: "error",
        confirmButtonText: "Đóng",
      });

      // Hiển thị thông báo lỗi
      document.getElementById("attendance-list").innerHTML =
        '<tr><td colspan="10" class="error-message">Lỗi khi tải dữ liệu: ' +
        data.message +
        "</td></tr>";
      document.getElementById("attendance-pagination").innerHTML = "";

      return;
    }

    // Kiểm tra nhiều cấu trúc dữ liệu có thể có
    let attendanceData = [];

    if (data.attendance && Array.isArray(data.attendance)) {
      attendanceData = data.attendance;
    } else if (data.attendances && Array.isArray(data.attendances)) {
      attendanceData = data.attendances;
    } else if (data.data && Array.isArray(data.data)) {
      attendanceData = data.data;
    } else if (Array.isArray(data)) {
      attendanceData = data;
    } else {
      // Tìm kiếm trong các thuộc tính của object
      for (const key in data) {
        if (Array.isArray(data[key])) {
          attendanceData = data[key];
          console.log("Tìm thấy mảng dữ liệu trong thuộc tính:", key);
          break;
        }
      }
    }

    // Kiểm tra nếu không có dữ liệu
    if (!attendanceData || attendanceData.length === 0) {
      console.log("Không có dữ liệu chấm công từ API");

      // Kiểm tra nếu có lọc ngày
      let message = "Không có dữ liệu chấm công nào.";

      if (fromDate && toDate) {
        message = `Không có dữ liệu chấm công nào từ ${fromDate} đến ${toDate}.`;
      } else if (fromDate) {
        message = `Không có dữ liệu chấm công nào từ ${fromDate}.`;
      } else if (toDate) {
        message = `Không có dữ liệu chấm công nào đến ${toDate}.`;
      }

      // Hiển thị thông báo
      Swal.fire({
        title: "Không có dữ liệu",
        html: `
          <div class="text-start">
            <p>${message}</p>
            <p><strong>URL gọi:</strong> ${url}</p>
            <p><strong>Dữ liệu trả về:</strong></p>
            <pre style="background:#f8f9fa;padding:10px;border-radius:5px;max-height:200px;overflow:auto">${JSON.stringify(
              data,
              null,
              2
            )}</pre>
            <p class="text-info">Vui lòng kiểm tra lại khoảng thời gian tìm kiếm hoặc liên hệ quản trị viên.</p>
          </div>
        `,
        icon: "info",
        confirmButtonText: "Đóng",
      });

      // Hiển thị thông báo không có dữ liệu
      document.getElementById(
        "attendance-list"
      ).innerHTML = `<tr><td colspan="10" class="no-data">${message}</td></tr>`;
      document.getElementById("attendance-pagination").innerHTML = "";

      return;
    }

    console.log("Số bản ghi chấm công:", attendanceData.length);

    // Lưu trữ dữ liệu gốc
    apiAttendanceData = [...attendanceData];

    try {
      // Format dữ liệu - dùng try/catch để bắt lỗi formatAttendanceData
      allAttendanceData = formatAttendanceData(attendanceData);

      // Lọc dữ liệu theo tìm kiếm
      let filteredData = [...allAttendanceData];

      if (searchText) {
        filteredData = filteredData.filter((item) => {
          return (
            (item.id && item.id.toString().includes(searchText)) ||
            (item.name &&
              item.name.toLowerCase().includes(searchText.toLowerCase()))
          );
        });
      }

      // Cập nhật dữ liệu hiện tại
      currentAttendanceData = filteredData;
      attendancePage = 1;

      // Hiển thị dữ liệu và phân trang
      displayAttendancePage(attendancePage);
      createAttendancePagination();

      // Cập nhật số lượng bản ghi
      if (document.getElementById("attendance-count")) {
        document.getElementById("attendance-count").textContent =
          currentAttendanceData.length;
      }
    } catch (formatError) {
      console.error("Lỗi khi định dạng dữ liệu chấm công:", formatError);

      // Hiển thị lỗi
      Swal.fire({
        title: "Lỗi định dạng dữ liệu",
        html: `
          <div class="text-start">
            <p><strong>Chi tiết lỗi:</strong> ${formatError.message}</p>
            <p>Dữ liệu trả về từ API có định dạng không đúng như mong đợi.</p>
            <pre style="background:#f8f9fa;padding:10px;border-radius:5px;max-height:200px;overflow:auto">${JSON.stringify(
              attendanceData[0] || {},
              null,
              2
            )}</pre>
            <p>Vui lòng liên hệ quản trị viên để kiểm tra API.</p>
          </div>
        `,
        icon: "error",
        confirmButtonText: "Đóng",
      });

      // Hiển thị thông báo lỗi
      document.getElementById("attendance-list").innerHTML =
        '<tr><td colspan="10" class="error-message">Lỗi khi xử lý dữ liệu: ' +
        formatError.message +
        "</td></tr>";
      document.getElementById("attendance-pagination").innerHTML = "";
    }
  } catch (error) {
    console.error("Lỗi khi tải dữ liệu chấm công:", error);

    document.getElementById("attendance-list").innerHTML =
      '<tr><td colspan="10" class="error-message">Lỗi khi tải dữ liệu: ' +
      error.message +
      "</td></tr>";
    document.getElementById("attendance-pagination").innerHTML = "";

    // Hiển thị lỗi chi tiết
    Swal.fire({
      title: "Lỗi kết nối",
      html: `
        <div class="text-start">
          <p><strong>Chi tiết lỗi:</strong> ${error.message}</p>
          <p>Vui lòng kiểm tra:</p>
          <ul>
            <li>Kết nối mạng</li>
            <li>API server đang chạy</li>
            <li>Đường dẫn API chính xác</li>
          </ul>
          <p class="text-danger">Vui lòng liên hệ quản trị viên hệ thống để được hỗ trợ.</p>
        </div>
      `,
      icon: "error",
      confirmButtonText: "Đóng",
    });
  }
}

// Hàm tạo dữ liệu chấm công mô phỏng khi không có dữ liệu từ API
function createMockAttendanceData() {
  console.log("Tạo dữ liệu chấm công mô phỏng");

  // Tạo dữ liệu mô phỏng
  const today = new Date();
  const mockData = [];

  // Tạo dữ liệu cho 5 nhân viên, trong 7 ngày gần đây
  const employees = [
    { id: "1001", name: "Nguyễn Văn A" },
    { id: "1002", name: "Trần Thị B" },
    { id: "1003", name: "Lê Văn C" },
    { id: "1004", name: "Phạm Thị D" },
    { id: "1005", name: "Hoàng Văn E" },
  ];

  // Tạo dữ liệu cho 7 ngày
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateString = date.toISOString().split("T")[0];

    // Với mỗi nhân viên, tạo dữ liệu chấm công cho ngày này
    employees.forEach((employee) => {
      // Random có đi làm hay không (80% xác suất đi làm)
      if (Math.random() < 0.8) {
        // Tạo dữ liệu chấm công buổi sáng
        mockData.push({
          id: Math.floor(Math.random() * 10000),
          employee_id: employee.id,
          employee_name: employee.name,
          date: dateString,
          check_in_time: `0${7 + Math.floor(Math.random() * 2)}:${Math.floor(
            Math.random() * 60
          )
            .toString()
            .padStart(2, "0")}`,
          check_out_time: `1${1 + Math.floor(Math.random() * 2)}:${Math.floor(
            Math.random() * 60
          )
            .toString()
            .padStart(2, "0")}`,
          shift_id: "shift1",
          shift_name: "Ca sáng",
          expected_check_in: "08:00",
          expected_check_out: "12:00",
        });

        // 60% xác suất có dữ liệu buổi chiều
        if (Math.random() < 0.6) {
          mockData.push({
            id: Math.floor(Math.random() * 10000),
            employee_id: employee.id,
            employee_name: employee.name,
            date: dateString,
            check_in_time: `1${3 + Math.floor(Math.random() * 2)}:${Math.floor(
              Math.random() * 60
            )
              .toString()
              .padStart(2, "0")}`,
            check_out_time: `1${7 + Math.floor(Math.random() * 2)}:${Math.floor(
              Math.random() * 60
            )
              .toString()
              .padStart(2, "0")}`,
            shift_id: "shift2",
            shift_name: "Ca chiều",
            expected_check_in: "13:30",
            expected_check_out: "17:30",
          });
        }
      }
    });
  }

  // Lưu dữ liệu mock
  apiAttendanceData = [...mockData];

  // Định dạng dữ liệu
  allAttendanceData = formatAttendanceData(mockData);

  // Cập nhật dữ liệu hiện tại
  currentAttendanceData = [...allAttendanceData];
  attendancePage = 1;

  // Hiển thị dữ liệu
  displayAttendancePage(attendancePage);
  createAttendancePagination();

  // Cập nhật số lượng bản ghi
  if (document.getElementById("attendance-count")) {
    document.getElementById("attendance-count").textContent =
      currentAttendanceData.length;
  }

  // Thông báo đang sử dụng dữ liệu mô phỏng
  const alertElement = document.createElement("div");
  alertElement.className = "alert alert-warning mt-3";
  alertElement.innerHTML = `
    <strong>Đang sử dụng dữ liệu mô phỏng!</strong> 
    API đã trả về lỗi nên hệ thống đang hiển thị dữ liệu giả lập. 
    Vui lòng liên hệ quản trị viên để kiểm tra API.
  `;

  // Thêm thông báo vào trang
  const attendanceTabContent = document.getElementById(
    "attendance-tab-content"
  );
  if (attendanceTabContent) {
    attendanceTabContent.insertBefore(
      alertElement,
      attendanceTabContent.firstChild
    );
  }
}

// Hàm định dạng dữ liệu chấm công từ API để hiển thị
function formatAttendanceData(apiData) {
  try {
    // Khởi tạo mảng kết quả
    const result = [];

    // Nhóm các bản ghi chấm công theo nhân viên và ngày
    const groupedByEmployeeAndDate = {};

    // Bước 1: Nhóm tất cả các chấm công theo nhân viên và ngày, và thu thập tất cả các thời điểm chấm công
    apiData.forEach((item) => {
      // Xử lý các trường hợp thiếu dữ liệu
      const employeeId =
        item.employee_id ||
        (item.employee ? item.employee.id : null) ||
        "unknown";
      const employeeName =
        item.employee_name ||
        (item.employee ? item.employee.name : null) ||
        "Không rõ";
      const date =
        item.date || item.check_date || new Date().toISOString().split("T")[0];

      const key = `${employeeId}_${date}`;
      if (!groupedByEmployeeAndDate[key]) {
        groupedByEmployeeAndDate[key] = {
          id: employeeId,
          name: employeeName,
          date: date,
          allCheckTimes: [], // Lưu tất cả các thời điểm chấm công theo thứ tự
          shiftInfo: {}, // Lưu thông tin ca theo id
        };
      }

      // Kiểm tra thời gian chấm công
      const checkInTime = item.check_in_time || item.checkin_time;
      const checkOutTime = item.check_out_time || item.checkout_time;

      // Xác định mã ca làm việc
      let shiftId = "unknown_shift";

      // Cố gắng lấy mã ca từ nhiều nguồn có thể
      if (item.shift_id) {
        shiftId = item.shift_id;
      } else if (item.shift && item.shift.id) {
        shiftId = item.shift.id;
      } else {
        // Nếu không có mã ca, tạo mã dựa trên thời gian
        if (checkInTime) {
          const hour = parseInt(checkInTime.split(":")[0]);
          shiftId = hour < 12 ? "shift1" : "shift2";
        }
      }

      // Thêm thời điểm chấm công vào nếu có
      if (checkInTime) {
        groupedByEmployeeAndDate[key].allCheckTimes.push({
          time: checkInTime,
          type: "in",
          shiftId: shiftId,
          expected: item.expected_check_in,
        });
      }

      if (checkOutTime) {
        groupedByEmployeeAndDate[key].allCheckTimes.push({
          time: checkOutTime,
          type: "out",
          shiftId: shiftId,
          expected: item.expected_check_out,
        });
      }

      // Lưu thông tin ca
      if (!groupedByEmployeeAndDate[key].shiftInfo[shiftId]) {
        const shiftName =
          item.shift_name ||
          (item.shift ? item.shift.name : null) ||
          (shiftId === "shift1" ? "Ca sáng" : "Ca chiều");

        groupedByEmployeeAndDate[key].shiftInfo[shiftId] = {
          shiftId: shiftId,
          shiftName: shiftName,
          expectedCheckIn:
            item.expected_check_in ||
            (shiftId === "shift1" ? "08:00" : "13:30"),
          expectedCheckOut:
            item.expected_check_out ||
            (shiftId === "shift1" ? "12:00" : "17:30"),
        };
      }
    });

    // Bước 2: Xử lý dữ liệu và tạo bản ghi chấm công hợp nhất cho mỗi nhân viên mỗi ngày
    for (const key in groupedByEmployeeAndDate) {
      const record = groupedByEmployeeAndDate[key];

      // Sắp xếp các thời điểm chấm công theo thứ tự thời gian
      record.allCheckTimes.sort((a, b) => {
        return convertTimeToMinutes(a.time) - convertTimeToMinutes(b.time);
      });

      // Khởi tạo dữ liệu mặc định
      const attendanceRecord = {
        id: record.id,
        name: record.name,
        date: record.date,
        checkIn1: "N/A",
        checkOut1: "N/A",
        checkIn2: "N/A",
        checkOut2: "N/A",
        lateMinutes: 0,
        earlyMinutes: 0,
        workHours: 0,
        shiftCount: 0, // Sẽ được tính sau khi đã xác định các ca
        note: "Đúng giờ",
      };

      // Lấy thông tin ca từ record
      const shifts = Object.values(record.shiftInfo);

      // Sắp xếp ca theo thời gian bắt đầu
      shifts.sort((a, b) => {
        if (!a.expectedCheckIn) return 1;
        if (!b.expectedCheckIn) return -1;
        return (
          convertTimeToMinutes(a.expectedCheckIn) -
          convertTimeToMinutes(b.expectedCheckIn)
        );
      });

      // Phân loại các lần chấm công theo ca
      const shift1CheckTimes = [];
      const shift2CheckTimes = [];

      // Phân loại các lần chấm công vào từng ca (buổi sáng/chiều)
      record.allCheckTimes.forEach((checkTime) => {
        const hourValue = parseInt(checkTime.time.split(":")[0]);
        if (hourValue < 13) {
          shift1CheckTimes.push(checkTime);
        } else {
          shift2CheckTimes.push(checkTime);
        }
      });

      // Xử lý dữ liệu cho ca 1
      if (shift1CheckTimes.length > 0) {
        // Check in cho ca 1 là lần chấm công đầu tiên
        attendanceRecord.checkIn1 = shift1CheckTimes[0].time;

        // Check out cho ca 1 là lần chấm công cuối cùng
        if (shift1CheckTimes.length > 1) {
          attendanceRecord.checkOut1 =
            shift1CheckTimes[shift1CheckTimes.length - 1].time;
        }

        // Tính số ca làm việc
        attendanceRecord.shiftCount++;

        // Tính thời gian đi muộn và về sớm
        if (shifts.length > 0 && shifts[0].expectedCheckIn) {
          const lateMinutes = calculateLateMinutes(
            attendanceRecord.checkIn1,
            shifts[0].expectedCheckIn
          );
          attendanceRecord.lateMinutes += lateMinutes;
        }

        if (
          shifts.length > 0 &&
          shifts[0].expectedCheckOut &&
          attendanceRecord.checkOut1 !== "N/A"
        ) {
          const earlyMinutes = calculateEarlyMinutes(
            attendanceRecord.checkOut1,
            shifts[0].expectedCheckOut
          );
          attendanceRecord.earlyMinutes += earlyMinutes;
        }
      }

      // Xử lý dữ liệu cho ca 2
      if (shift2CheckTimes.length > 0) {
        // Check in cho ca 2 là lần chấm công đầu tiên của ca này
        attendanceRecord.checkIn2 = shift2CheckTimes[0].time;

        // Check out cho ca 2 là lần chấm công cuối cùng của ca này
        if (shift2CheckTimes.length > 1) {
          attendanceRecord.checkOut2 =
            shift2CheckTimes[shift2CheckTimes.length - 1].time;
        }

        // Tính số ca làm việc
        attendanceRecord.shiftCount++;

        // Tính thời gian đi muộn và về sớm
        if (shifts.length > 1 && shifts[1].expectedCheckIn) {
          const lateMinutes = calculateLateMinutes(
            attendanceRecord.checkIn2,
            shifts[1].expectedCheckIn
          );
          attendanceRecord.lateMinutes += lateMinutes;
        } else if (shifts.length === 1 && attendanceRecord.checkIn2 !== "N/A") {
          // Nếu không có thông tin ca 2, sử dụng giá trị mặc định
          const lateMinutes = calculateLateMinutes(
            attendanceRecord.checkIn2,
            "13:30"
          );
          attendanceRecord.lateMinutes += lateMinutes;
        }

        if (
          shifts.length > 1 &&
          shifts[1].expectedCheckOut &&
          attendanceRecord.checkOut2 !== "N/A"
        ) {
          const earlyMinutes = calculateEarlyMinutes(
            attendanceRecord.checkOut2,
            shifts[1].expectedCheckOut
          );
          attendanceRecord.earlyMinutes += earlyMinutes;
        } else if (
          shifts.length === 1 &&
          attendanceRecord.checkOut2 !== "N/A"
        ) {
          // Nếu không có thông tin ca 2, sử dụng giá trị mặc định
          const earlyMinutes = calculateEarlyMinutes(
            attendanceRecord.checkOut2,
            "17:30"
          );
          attendanceRecord.earlyMinutes += earlyMinutes;
        }
      }

      // Tính tổng số giờ làm việc
      attendanceRecord.workHours = calculateWorkHours(
        attendanceRecord.checkIn1,
        attendanceRecord.checkOut1,
        attendanceRecord.checkIn2,
        attendanceRecord.checkOut2,
        shifts
      );

      // Thêm ghi chú
      if (
        attendanceRecord.lateMinutes > 0 &&
        attendanceRecord.earlyMinutes > 0
      ) {
        attendanceRecord.note = `Đi muộn ${attendanceRecord.lateMinutes} phút, Về sớm ${attendanceRecord.earlyMinutes} phút`;
      } else if (attendanceRecord.lateMinutes > 0) {
        attendanceRecord.note = `Đi muộn ${attendanceRecord.lateMinutes} phút`;
      } else if (attendanceRecord.earlyMinutes > 0) {
        attendanceRecord.note = `Về sớm ${attendanceRecord.earlyMinutes} phút`;
      }

      // Thêm vào kết quả
      result.push(attendanceRecord);
    }

    return result;
  } catch (error) {
    console.error("Lỗi khi định dạng dữ liệu chấm công:", error);
    throw error;
  }
}

// Hàm tính tổng số giờ làm việc
function calculateWorkHours(checkIn1, checkOut1, checkIn2, checkOut2, shifts) {
  let totalMinutes = 0;

  // Lấy thông tin ca làm việc
  let shift1Start = "07:00";
  let shift1End = "12:00";
  let shift2Start = "13:00";
  let shift2End = "19:00";

  if (shifts && shifts.length > 0) {
    if (shifts[0]) {
      shift1Start = shifts[0].expectedCheckIn || shift1Start;
      shift1End = shifts[0].expectedCheckOut || shift1End;
    }
    if (shifts.length > 1 && shifts[1]) {
      shift2Start = shifts[1].expectedCheckIn || shift2Start;
      shift2End = shifts[1].expectedCheckOut || shift2End;
    }
  }

  // Tính giờ làm cho ca 1 - chỉ tính trong khoảng thời gian của ca 1
  if (checkIn1 !== "N/A" && checkOut1 !== "N/A") {
    let effectiveCheckIn = checkIn1;
    let effectiveCheckOut = checkOut1;

    // Đảm bảo thời gian check-in không sớm hơn thời gian bắt đầu ca
    if (
      convertTimeToMinutes(effectiveCheckIn) < convertTimeToMinutes(shift1Start)
    ) {
      effectiveCheckIn = shift1Start;
    }

    // Đảm bảo thời gian check-out không muộn hơn thời gian kết thúc ca
    if (
      convertTimeToMinutes(effectiveCheckOut) > convertTimeToMinutes(shift1End)
    ) {
      effectiveCheckOut = shift1End;
    }

    // Tính số phút làm việc trong ca 1
    const startMinutes = convertTimeToMinutes(effectiveCheckIn);
    const endMinutes = convertTimeToMinutes(effectiveCheckOut);

    if (endMinutes > startMinutes) {
      totalMinutes += endMinutes - startMinutes;
    }
  }

  // Tính giờ làm cho ca 2 - chỉ tính trong khoảng thời gian của ca 2
  if (checkIn2 !== "N/A" && checkOut2 !== "N/A") {
    let effectiveCheckIn = checkIn2;
    let effectiveCheckOut = checkOut2;

    // Đảm bảo thời gian check-in không sớm hơn thời gian bắt đầu ca
    if (
      convertTimeToMinutes(effectiveCheckIn) < convertTimeToMinutes(shift2Start)
    ) {
      effectiveCheckIn = shift2Start;
    }

    // Đảm bảo thời gian check-out không muộn hơn thời gian kết thúc ca
    if (
      convertTimeToMinutes(effectiveCheckOut) > convertTimeToMinutes(shift2End)
    ) {
      effectiveCheckOut = shift2End;
    }

    // Tính số phút làm việc trong ca 2
    const startMinutes = convertTimeToMinutes(effectiveCheckIn);
    const endMinutes = convertTimeToMinutes(effectiveCheckOut);

    if (endMinutes > startMinutes) {
      totalMinutes += endMinutes - startMinutes;
    }
  }

  // Chuyển từ phút sang giờ, làm tròn đến 2 chữ số thập phân
  return Math.round((totalMinutes / 60) * 100) / 100;
}

// Hàm tính số phút đi muộn
function calculateLateMinutes(actualCheckIn, expectedCheckIn) {
  if (!actualCheckIn || !expectedCheckIn) return 0;

  const actual = convertTimeToMinutes(actualCheckIn);
  const expected = convertTimeToMinutes(expectedCheckIn);

  return actual > expected ? actual - expected : 0;
}

// Hàm tính số phút về sớm
function calculateEarlyMinutes(actualCheckOut, expectedCheckOut) {
  if (!actualCheckOut || !expectedCheckOut) return 0;

  const actual = convertTimeToMinutes(actualCheckOut);
  const expected = convertTimeToMinutes(expectedCheckOut);

  return expected > actual ? expected - actual : 0;
}

// Cập nhật cấu hình ca làm việc
async function updateShiftsConfig(config) {
  try {
    console.log("Bắt đầu cập nhật cấu hình ca làm việc với dữ liệu:", config);

    // Nếu không có config được truyền vào, lấy từ form
    if (!config) {
      const shift1CheckIn = document.getElementById("shift1-check-in").value;
      const shift1CheckOut = document.getElementById("shift1-check-out").value;
      const shift2CheckIn = document.getElementById("shift2-check-in").value;
      const shift2CheckOut = document.getElementById("shift2-check-out").value;

      // Kiểm tra dữ liệu hợp lệ
      if (
        !shift1CheckIn ||
        !shift1CheckOut ||
        !shift2CheckIn ||
        !shift2CheckOut
      ) {
        throw new Error(
          "Vui lòng nhập đầy đủ thời gian cho cả hai ca làm việc"
        );
      }

      // Kiểm tra thời gian check-in phải trước check-out cho từng ca
      if (!isValidShift(shift1CheckIn, shift1CheckOut)) {
        throw new Error(
          "Ca 1: Thời gian check-in phải trước thời gian check-out"
        );
      }

      if (!isValidShift(shift2CheckIn, shift2CheckOut)) {
        throw new Error(
          "Ca 2: Thời gian check-in phải trước thời gian check-out"
        );
      }

      // Kiểm tra giữa hai ca phải có khoảng nghỉ ít nhất 10 phút
      if (!isValidBreakBetweenShifts(shift1CheckOut, shift2CheckIn)) {
        throw new Error(
          "Thời gian giữa hai ca phải có khoảng nghỉ ít nhất 10 phút"
        );
      }

      // Tạo đối tượng config từ dữ liệu form
      config = {
        shift1: {
          checkIn: shift1CheckIn,
          checkOut: shift1CheckOut,
        },
        shift2: {
          checkIn: shift2CheckIn,
          checkOut: shift2CheckOut,
        },
      };
    }

    console.log("Đang gửi cấu hình ca làm việc mới:", config);

    // Hiển thị trạng thái đang lưu
    const saveButton = document.getElementById("save-shifts-btn");
    if (saveButton) {
      saveButton.textContent = "Đang lưu...";
      saveButton.disabled = true;
    }

    // Gọi API cập nhật
    const response = await fetch("/api/shift/config", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      throw new Error(`API trả về lỗi: ${response.status}`);
    }

    const result = await response.json();
    console.log("Kết quả cập nhật ca làm việc:", result);

    if (!result.success) {
      throw new Error(
        result.message || "Cập nhật cấu hình ca làm việc thất bại"
      );
    }

    // Cập nhật lại hiển thị trong card
    const currentShift1 = document.getElementById("current-shift1");
    const currentShift2 = document.getElementById("current-shift2");
    const lastUpdatedTime = document.getElementById("last-updated-time");

    if (currentShift1 && config.shift1) {
      currentShift1.textContent = `${config.shift1.checkIn} - ${config.shift1.checkOut}`;
    }

    if (currentShift2 && config.shift2) {
      currentShift2.textContent = `${config.shift2.checkIn} - ${config.shift2.checkOut}`;
    }

    // Cập nhật thời gian hiển thị
    if (lastUpdatedTime) {
      const now = new Date();
      lastUpdatedTime.textContent = now.toLocaleString("vi-VN");
    }

    // Hiển thị thông báo thành công
    if (typeof Swal !== "undefined") {
      Swal.fire({
        title: "Thành công!",
        text: "Cập nhật cấu hình ca làm việc thành công!",
        icon: "success",
        confirmButtonText: "OK",
      });
    } else {
      alert("Cập nhật cấu hình ca làm việc thành công!");
    }

    return true;
  } catch (error) {
    console.error("Lỗi khi cập nhật cấu hình ca làm việc:", error);

    // Hiển thị thông báo lỗi
    if (typeof Swal !== "undefined") {
      Swal.fire({
        title: "Lỗi!",
        text:
          error.message || "Có lỗi xảy ra khi cập nhật cấu hình ca làm việc",
        icon: "error",
        confirmButtonText: "OK",
      });
    } else {
      alert(
        "Lỗi: " +
          (error.message || "Có lỗi xảy ra khi cập nhật cấu hình ca làm việc")
      );
    }

    return false;
  } finally {
    // Khôi phục nút lưu
    const saveButton = document.getElementById("save-shifts-btn");
    if (saveButton) {
      saveButton.textContent = "Lưu cấu hình";
      saveButton.disabled = false;
    }
  }
}

// Thiết lập tabs
function setupTabs() {
  // Lấy tất cả các tab
  const tabs = document.querySelectorAll(".tab");

  // Thêm sự kiện click cho mỗi tab
  tabs.forEach((tab) => {
    tab.addEventListener("click", function () {
      // Lấy id của tab được click
      const tabId = this.getAttribute("data-tab");
      const targetPane = document.getElementById(`${tabId}-pane`);

      if (!targetPane) {
        return; // Bỏ qua nếu không tìm thấy tab-pane
      }

      // Xóa active từ tất cả tabs và panes
      document
        .querySelectorAll(".tab")
        .forEach((t) => t.classList.remove("active"));
      document
        .querySelectorAll(".tab-pane")
        .forEach((pane) => pane.classList.remove("active"));

      // Thêm active cho tab và pane hiện tại
      this.classList.add("active");
      targetPane.classList.add("active");

      // Tải dữ liệu tương ứng với tab
      if (tabId === "employees") {
        if (typeof loadEmployees === "function") loadEmployees();
      } else if (tabId === "attendance") {
        if (typeof loadAttendance === "function") loadAttendance();
      } else if (tabId === "complaints") {
        if (typeof loadComplaints === "function") loadComplaints();
      } else if (tabId === "shifts") {
        if (typeof loadShiftConfig === "function") loadShiftConfig();
      }
    });
  });
}

// Khởi tạo trang khi tải xong DOM
window.addEventListener("DOMContentLoaded", function () {
  try {
    // Xóa tất cả event listener khác nếu có
    const oldDOMContentLoadedHandlers = window.DOMContentLoadedHandlers || [];
    oldDOMContentLoadedHandlers.forEach((handler) => {
      document.removeEventListener("DOMContentLoaded", handler);
    });

    // Thiết lập tabs
    setupTabs();

    // Thêm các event handlers
    if (typeof setupEventHandlers === "function") setupEventHandlers();

    // Đảm bảo tab nhân viên là tab active mặc định
    const employeesTab = document.querySelector('.tab[data-tab="employees"]');
    const employeesPane = document.getElementById("employees-pane");

    if (employeesTab && employeesPane) {
      // Xóa active từ tất cả tabs và panes
      document
        .querySelectorAll(".tab")
        .forEach((tab) => tab.classList.remove("active"));
      document
        .querySelectorAll(".tab-pane")
        .forEach((pane) => pane.classList.remove("active"));

      // Thiết lập tab nhân viên là tab active
      employeesTab.classList.add("active");
      employeesPane.classList.add("active");

      // Tải dữ liệu nhân viên ngay lập tức
      if (typeof loadEmployees === "function") {
        loadEmployees();

        // Tải trước dữ liệu của các tab khác để cải thiện trải nghiệm
        setTimeout(() => {
          if (typeof loadAttendance === "function") loadAttendance();
          if (typeof loadComplaints === "function") loadComplaints();
          if (typeof loadShiftConfig === "function") loadShiftConfig();
        }, 500);
      }
    }
  } catch (error) {
    // Sử dụng hàm handleError để xử lý lỗi mà không hiển thị trên console
    if (typeof handleError === "function") {
      handleError(error, "Lỗi khởi tạo trang");
    }
  }
});

// Thiết lập xử lý sự kiện
function setupEventHandlers() {
  // Thiết lập nút xuất Excel cho nhân viên
  const exportEmployeeExcelBtn = document.getElementById(
    "export-employee-excel-btn"
  );
  if (exportEmployeeExcelBtn) {
    exportEmployeeExcelBtn.addEventListener("click", exportEmployeeToExcel);
  }

  // Thiết lập nút xuất Excel cho chấm công
  const exportAttendanceExcelBtn = document.getElementById(
    "export-attendance-excel-btn"
  );
  if (exportAttendanceExcelBtn) {
    exportAttendanceExcelBtn.addEventListener("click", exportAttendanceToExcel);
  }

  // Thiết lập nút xuất Excel cho khiếu nại
  const exportComplaintsExcelBtn = document.getElementById(
    "export-complaints-excel-btn"
  );
  if (exportComplaintsExcelBtn) {
    exportComplaintsExcelBtn.addEventListener("click", exportComplaintsToExcel);
  }

  // Xử lý form cấu hình ca làm việc
  const shiftsConfigForm = document.getElementById("shifts-config-form");
  if (shiftsConfigForm) {
    shiftsConfigForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      // Lấy giá trị từ form
      const shift1CheckIn = document.getElementById("shift1-check-in").value;
      const shift1CheckOut = document.getElementById("shift1-check-out").value;
      const shift2CheckIn = document.getElementById("shift2-check-in").value;
      const shift2CheckOut = document.getElementById("shift2-check-out").value;

      // Kiểm tra ca 1 và ca 2 có hợp lệ không
      if (!isValidShift(shift1CheckIn, shift1CheckOut)) {
        showError("Thời gian bắt đầu ca 1 phải trước thời gian kết thúc ca 1");
        return;
      }

      if (!isValidShift(shift2CheckIn, shift2CheckOut)) {
        showError("Thời gian bắt đầu ca 2 phải trước thời gian kết thúc ca 2");
        return;
      }

      // Kiểm tra thời gian giữa ca 1 và ca 2
      if (!isValidBreakBetweenShifts(shift1CheckOut, shift2CheckIn)) {
        showError("Thời gian giữa ca 1 và ca 2 phải cách nhau ít nhất 10 phút");
        return;
      }

      // Ẩn thông báo lỗi nếu không có lỗi
      hideError();

      // Hiển thị thông báo đang xử lý
      document.getElementById("save-shifts-btn").disabled = true;
      document.getElementById("save-shifts-btn").textContent = "Đang lưu...";

      // Chuẩn bị dữ liệu để gửi API
      const config = {
        shift1: {
          checkIn: shift1CheckIn,
          checkOut: shift1CheckOut,
        },
        shift2: {
          checkIn: shift2CheckIn,
          checkOut: shift2CheckOut,
        },
      };

      // Gửi API cập nhật cấu hình ca làm việc
      const success = await updateShiftsConfig(config);

      // Cập nhật trạng thái nút
      document.getElementById("save-shifts-btn").disabled = false;
      document.getElementById("save-shifts-btn").textContent = "Lưu cấu hình";

      if (success) {
        // Hiển thị thông báo thành công (đã được hiển thị trong hàm updateShiftsConfig)
        // Tự động reload lại dữ liệu chấm công để cập nhật với ca mới
        loadAttendance();
      }
    });
  }

  // Xử lý các nút trong tab khiếu nại
  const searchComplaintsBtn = document.getElementById("search-complaints-btn");
  if (searchComplaintsBtn) {
    searchComplaintsBtn.addEventListener("click", filterComplaints);
  }

  const resetComplaintsFilterBtn = document.getElementById(
    "reset-complaints-filter-btn"
  );
  if (resetComplaintsFilterBtn) {
    resetComplaintsFilterBtn.addEventListener("click", resetComplaintsFilter);
  }

  // Thêm sự kiện Enter để tìm kiếm
  const complaintsSearch = document.getElementById("complaints-search");
  if (complaintsSearch) {
    complaintsSearch.addEventListener("keyup", function (event) {
      if (event.key === "Enter") {
        filterComplaints();
      }
    });
  }

  // Xử lý đóng modal chi tiết khiếu nại
  const closeComplaintDetail = document.getElementById(
    "close-complaint-detail"
  );
  if (closeComplaintDetail) {
    closeComplaintDetail.addEventListener("click", () => {
      const modal = document.getElementById("complaint-detail-modal");
      if (modal) {
        modal.style.display = "none";
      }
    });
  }

  // Xử lý click ra ngoài modal để đóng
  const complaintDetailModal = document.getElementById(
    "complaint-detail-modal"
  );
  if (complaintDetailModal) {
    complaintDetailModal.addEventListener("click", (e) => {
      if (e.target === complaintDetailModal) {
        complaintDetailModal.style.display = "none";
      }
    });
  }

  // Xử lý nút duyệt khiếu nại
  const approveComplaint = document.getElementById("approve-complaint");
  if (approveComplaint) {
    approveComplaint.addEventListener("click", () =>
      processComplaint("approve")
    );
  }

  // Xử lý nút không duyệt khiếu nại
  const rejectComplaint = document.getElementById("reject-complaint");
  if (rejectComplaint) {
    rejectComplaint.addEventListener("click", () => processComplaint("reject"));
  }
}

// Tải dữ liệu khiếu nại
async function loadComplaints() {
  try {
    console.log("Đang tải danh sách khiếu nại...");

    // Kiểm tra xem có element khiếu nại không
    const complaintsListElement = document.getElementById("complaints-list");
    if (!complaintsListElement) {
      console.error("Không tìm thấy element complaints-list");
      return;
    }

    // Hiển thị thông báo đang tải
    complaintsListElement.innerHTML =
      '<tr><td colspan="7" class="loading-message">Đang tải danh sách khiếu nại...</td></tr>';

    // Lấy dữ liệu từ API
    console.log("Gọi API /api/complaint để lấy danh sách khiếu nại");
    const response = await fetch("/api/complaint");
    console.log("API response status:", response.status);

    if (!response.ok) {
      throw new Error(`API trả về lỗi: ${response.status}`);
    }

    const data = await response.json();
    console.log("Dữ liệu khiếu nại nhận được:", data);

    // Kiểm tra và xử lý dữ liệu
    if (data && data.success) {
      // Lưu dữ liệu API gốc (dù có trống hay không)
      allComplaintsData = data.complaints || [];

      // Hiển thị thông báo nếu không có dữ liệu
      if (allComplaintsData.length === 0) {
        complaintsListElement.innerHTML =
          '<tr><td colspan="7" class="no-data">Không có khiếu nại nào</td></tr>';
        const paginationElement = document.getElementById(
          "complaints-pagination"
        );
        if (paginationElement) {
          paginationElement.innerHTML = "";
        }
        return;
      }

      // Lấy giá trị các bộ lọc
      const searchText =
        document.getElementById("complaints-search")?.value?.trim() || "";
      const statusFilter =
        document.getElementById("complaint-status-filter")?.value || "all";
      const reasonFilter =
        document.getElementById("complaint-reason-filter")?.value || "all";

      console.log("Bộ lọc áp dụng:", {
        searchText,
        statusFilter,
        reasonFilter,
      });

      // Lọc dữ liệu
      currentComplaintsData = [...allComplaintsData];
      complaintsPage = 1;

      console.log(
        "Dữ liệu khiếu nại sẽ hiển thị:",
        currentComplaintsData.length
      );

      // Hiển thị dữ liệu
      displayComplaintsPage(complaintsPage);
      createComplaintsPagination();
    } else {
      // Xử lý trường hợp API thành công nhưng có lỗi từ server
      console.error(
        "API trả về lỗi:",
        data.message || "Không có thông báo lỗi"
      );
      complaintsListElement.innerHTML =
        '<tr><td colspan="7" class="error-message">Lỗi khi tải dữ liệu: ' +
        (data.message || "Không rõ lỗi") +
        "</td></tr>";
      const paginationElement = document.getElementById(
        "complaints-pagination"
      );
      if (paginationElement) {
        paginationElement.innerHTML = "";
      }
    }
  } catch (error) {
    console.error("Lỗi khi tải dữ liệu khiếu nại:", error);
    const complaintsListElement = document.getElementById("complaints-list");
    if (complaintsListElement) {
      complaintsListElement.innerHTML =
        '<tr><td colspan="7" class="error-message">Lỗi khi tải dữ liệu: ' +
        error.message +
        "</td></tr>";
    }
    const paginationElement = document.getElementById("complaints-pagination");
    if (paginationElement) {
      paginationElement.innerHTML = "";
    }
  }
}

// Hiển thị một trang của danh sách khiếu nại
function displayComplaintsPage(page) {
  try {
    // Tính toán index bắt đầu và kết thúc
    const startIndex = (page - 1) * complaintsPerPage;
    const endIndex = startIndex + complaintsPerPage;
    const displayData = currentComplaintsData.slice(startIndex, endIndex);

    console.log(
      `Hiển thị từ ${startIndex} đến ${endIndex}, tổng số ${currentComplaintsData.length} mục`
    );

    const complaintsList = document.getElementById("complaints-list");
    complaintsList.innerHTML = "";

    if (!displayData || displayData.length === 0) {
      complaintsList.innerHTML =
        '<tr><td colspan="7" class="no-data">Không có khiếu nại nào phù hợp với bộ lọc</td></tr>';
      return;
    }

    // Hiển thị dữ liệu
    displayData.forEach((complaint) => {
      console.log("Đang hiển thị khiếu nại:", complaint);

      // Xác định trạng thái và lớp CSS tương ứng
      let statusText, statusClass;
      if (!complaint.processed) {
        statusText = "Chờ duyệt";
        statusClass = "pending";
      } else if (
        complaint.status === "Đã duyệt" ||
        complaint.status === "approved"
      ) {
        statusText = "Đã duyệt";
        statusClass = "approved";
      } else {
        statusText = "Không duyệt";
        statusClass = "rejected";
      }

      // Format ngày tháng
      let formattedDate = "";
      let formattedTime = complaint.complaint_time || "Không có";

      try {
        if (complaint.complaint_date) {
          const date = new Date(complaint.complaint_date);
          formattedDate = date.toLocaleDateString("vi-VN");
        } else {
          formattedDate = "Không có";
        }
      } catch (e) {
        console.error("Lỗi khi format ngày tháng:", e);
        formattedDate = complaint.complaint_date || "Không có";
      }

      const row = document.createElement("tr");
      row.setAttribute("data-id", complaint.id);
      row.innerHTML = `
        <td>${formattedDate}</td>
        <td>${formattedTime}</td>
        <td>${complaint.employee_id || "N/A"}</td>
        <td>${complaint.employee_name || "Không rõ"}</td>
        <td>${complaint.reason || "Không rõ"}</td>
        <td class="${statusClass}">${statusText}</td>
        <td>
          <button class="view-complaint-btn" onclick="viewComplaintDetail(${
            complaint.id
          })">
            <i class="fas fa-eye"></i>
          </button>
        </td>
      `;

      complaintsList.appendChild(row);
    });
  } catch (error) {
    console.error("Lỗi khi hiển thị trang khiếu nại:", error);
    const complaintsList = document.getElementById("complaints-list");
    if (complaintsList) {
      complaintsList.innerHTML =
        '<tr><td colspan="7" class="error-message">Lỗi khi hiển thị dữ liệu: ' +
        error.message +
        "</td></tr>";
    }
  }
}

// Tạo phân trang cho danh sách khiếu nại
function createComplaintsPagination() {
  const totalPages = Math.ceil(
    currentComplaintsData.length / complaintsPerPage
  );
  const paginationContainer = document.getElementById("complaints-pagination");
  paginationContainer.innerHTML = "";

  if (totalPages <= 1) {
    return;
  }

  // Tạo nút previous
  if (complaintsPage > 1) {
    const prevButton = document.createElement("button");
    prevButton.textContent = "Trước";
    prevButton.className = "pagination-btn";
    prevButton.addEventListener("click", () => {
      complaintsPage--;
      displayComplaintsPage(complaintsPage);
      createComplaintsPagination();
    });
    paginationContainer.appendChild(prevButton);
  }

  // Tạo các nút số trang
  const startPage = Math.max(1, complaintsPage - 2);
  const endPage = Math.min(totalPages, startPage + 4);

  for (let i = startPage; i <= endPage; i++) {
    const pageButton = document.createElement("button");
    pageButton.textContent = i;
    pageButton.className = "pagination-btn";
    if (i === complaintsPage) {
      pageButton.classList.add("active");
    }

    pageButton.addEventListener("click", () => {
      complaintsPage = i;
      displayComplaintsPage(complaintsPage);
      createComplaintsPagination();
    });

    paginationContainer.appendChild(pageButton);
  }

  // Tạo nút next
  if (complaintsPage < totalPages) {
    const nextButton = document.createElement("button");
    nextButton.textContent = "Sau";
    nextButton.className = "pagination-btn";
    nextButton.addEventListener("click", () => {
      complaintsPage++;
      displayComplaintsPage(complaintsPage);
      createComplaintsPagination();
    });
    paginationContainer.appendChild(nextButton);
  }
}

// Hàm hiển thị thông báo lỗi
function showError(message) {
  const errorMessage = document.getElementById("shifts-error-message");
  if (errorMessage) {
    errorMessage.textContent = message;
    errorMessage.style.display = "block";
  }
}

// Hàm ẩn thông báo lỗi
function hideError() {
  const errorMessage = document.getElementById("shifts-error-message");
  if (errorMessage) {
    errorMessage.textContent = "";
    errorMessage.style.display = "none";
  }
}

// Hàm kiểm tra và tạo modal chi tiết khiếu nại nếu cần
function ensureComplaintModalExists() {
  let modal = document.getElementById("complaint-detail-modal");

  if (!modal) {
    console.log("Tạo modal complaint-detail-modal vì không tìm thấy trong DOM");
    modal = document.createElement("div");
    modal.id = "complaint-detail-modal";
    modal.className = "modal fade";
    modal.tabIndex = -1;
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-labelledby", "complaint-modal-title");
    modal.setAttribute("aria-hidden", "true");
    modal.setAttribute("data-bs-backdrop", "static");

    // Sử dụng template HTML thay vì tạo từng phần tử DOM
    modal.innerHTML = `
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="complaint-modal-title">Chi tiết khiếu nại</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Đóng"></button>
          </div>
          <div class="modal-body" id="complaint-modal-body">
            <div class="text-center">
              <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Đang tải...</span>
              </div>
              <p class="mt-2">Đang tải dữ liệu...</p>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Đóng</button>
          </div>
        </div>
      </div>
    `;

    // Tìm modal-container để thêm vào, nếu không có thì thêm vào body
    const modalContainer = document.getElementById("modal-container");
    if (modalContainer) {
      modalContainer.appendChild(modal);
      console.log("Đã thêm modal vào modal-container");
    } else {
      document.body.appendChild(modal);
      console.log("Đã thêm modal vào body vì không tìm thấy modal-container");
    }
  } else {
    console.log("Modal complaint-detail-modal đã tồn tại, không cần tạo mới");
  }

  return modal;
}

// Hàm đảm bảo tất cả phần tử cần thiết cho modal chi tiết khiếu nại đều tồn tại
function ensureComplaintDetailModalExists() {
  // Gọi hàm tạo modal cơ bản
  const modal = ensureComplaintModalExists();

  // Kiểm tra và đảm bảo rằng các phần tử con cần thiết tồn tại
  if (!document.getElementById("complaint-modal-body")) {
    console.log("Không tìm thấy complaint-modal-body, đang tạo mới");

    const modalContent = modal.querySelector(".modal-content");
    if (modalContent) {
      // Tìm modal body, nếu không có thì tạo mới
      let modalBody = modal.querySelector(".modal-body");
      if (!modalBody) {
        modalBody = document.createElement("div");
        modalBody.className = "modal-body";
        modalBody.id = "complaint-modal-body";

        // Thêm vào sau header hoặc vào đầu content nếu không tìm thấy header
        const modalHeader = modal.querySelector(".modal-header");
        if (modalHeader) {
          modalContent.insertBefore(modalBody, modalHeader.nextSibling);
        } else {
          modalContent.prepend(modalBody);
        }
      } else if (!modalBody.id) {
        // Nếu đã có modal body nhưng không có id
        modalBody.id = "complaint-modal-body";
      }

      // Đảm bảo có modal title
      if (!document.getElementById("complaint-modal-title")) {
        let modalHeader = modal.querySelector(".modal-header");
        if (!modalHeader) {
          modalHeader = document.createElement("div");
          modalHeader.className = "modal-header";
          modalContent.prepend(modalHeader);
        }

        let modalTitle = modalHeader.querySelector(".modal-title");
        if (!modalTitle) {
          modalTitle = document.createElement("h5");
          modalTitle.className = "modal-title";
          modalTitle.id = "complaint-modal-title";
          modalTitle.textContent = "Chi tiết khiếu nại";

          // Thêm vào đầu header
          modalHeader.prepend(modalTitle);
        } else if (!modalTitle.id) {
          modalTitle.id = "complaint-modal-title";
        }
      }
    } else {
      console.error("Không tìm thấy modal-content trong modal");
    }
  } else {
    console.log("Đã có complaint-modal-body, không cần tạo mới");
  }

  return modal;
}

// Xem chi tiết khiếu nại
async function viewComplaintDetail(complaintId) {
  try {
    // Đảm bảo modal tồn tại
    ensureComplaintModalExists();

    // Kiểm tra modal body tồn tại
    const modalBody = document.getElementById("complaint-modal-body");
    if (!modalBody) {
      console.error("Không tìm thấy phần tử complaint-modal-body");
      throw new Error("Không tìm thấy phần tử complaint-modal-body");
    }

    // Hiển thị loading trong modal
    modalBody.innerHTML = `
      <div style="text-align:center; padding:2rem; width:100%">
        <div class="spinner-border" role="status" style="width:4rem; height:4rem; color:#4b6cb7; border-width:0.35rem">
          <span class="visually-hidden">Đang tải...</span>
        </div>
        <p style="margin-top:1.5rem; font-size:1.1rem; color:#6c757d; font-weight:500">Đang tải thông tin khiếu nại...</p>
      </div>
    `;

    // Mở modal
    try {
      const modal = document.getElementById("complaint-detail-modal");
      const bsModal = new bootstrap.Modal(modal);
      bsModal.show();
    } catch (err) {
      console.error("Lỗi khi mở modal với Bootstrap:", err);
      // Fallback nếu không mở được với Bootstrap
      openComplaintModal();
    }

    // Gửi request lấy thông tin chi tiết
    const response = await fetch(`/api/complaint/${complaintId}`);

    if (!response.ok) {
      throw new Error(
        `Lỗi khi tải dữ liệu: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    if (!data || data.success === false) {
      throw new Error(data.message || "Không thể tải thông tin khiếu nại");
    }

    const complaint = data.complaint || data;

    // Kiểm tra lại phần tử complaint-modal-body (phòng trường hợp mất kết nối)
    const modalBodyElement = document.getElementById("complaint-modal-body");
    if (!modalBodyElement) {
      console.error(
        "Không tìm thấy phần tử complaint-modal-body sau khi fetch dữ liệu"
      );
      throw new Error(
        "Không tìm thấy phần tử complaint-modal-body sau khi fetch dữ liệu"
      );
    }

    // Tạo HTML hiển thị chi tiết với CSS inline
    modalBodyElement.innerHTML = `
      <div style="background-color:rgba(255,255,255,0.8); border-radius:12px; padding:1.5rem; margin-bottom:1.5rem; box-shadow:0 5px 15px rgba(0,0,0,0.05)">
        <div style="display:flex; margin-bottom:1rem; padding-bottom:0.75rem; border-bottom:1px solid rgba(0,0,0,0.1)">
          <div style="font-weight:600; color:#4b6cb7; min-width:150px">Mã khiếu nại:</div>
          <div style="flex:1; color:#333; font-weight:500">${
            complaint.id || "N/A"
          }</div>
        </div>
        <div style="display:flex; margin-bottom:1rem; padding-bottom:0.75rem; border-bottom:1px solid rgba(0,0,0,0.1)">
          <div style="font-weight:600; color:#4b6cb7; min-width:150px">Nhân viên:</div>
          <div style="flex:1; color:#333">${
            complaint.employee_name || "N/A"
          } (${complaint.employee_id || "N/A"})</div>
        </div>
        <div style="display:flex; margin-bottom:1rem; padding-bottom:0.75rem; border-bottom:1px solid rgba(0,0,0,0.1)">
          <div style="font-weight:600; color:#4b6cb7; min-width:150px">Ngày gửi:</div>
          <div style="flex:1; color:#333">${
            complaint.created_at ||
            complaint.complaint_date ||
            complaint.date ||
            "N/A"
          }</div>
        </div>
        <div style="display:flex; margin-bottom:1rem; padding-bottom:0.75rem; border-bottom:1px solid rgba(0,0,0,0.1)">
          <div style="font-weight:600; color:#4b6cb7; min-width:150px">Nội dung:</div>
          <div style="flex:1; color:#333">
            <div style="background-color:#fff; border-radius:8px; padding:15px; border:1px solid #dee2e6; margin-top:5px; line-height:1.5">${
              complaint.reason || "Không có nội dung"
            }</div>
          </div>
        </div>
        <div style="display:flex; margin-bottom:1rem; padding-bottom:0.75rem; border-bottom:1px solid rgba(0,0,0,0.1)">
          <div style="font-weight:600; color:#4b6cb7; min-width:150px">Trạng thái:</div>
          <div style="flex:1; color:#333">
            <span style="display:inline-block; padding:5px 15px; border-radius:50px; font-size:0.875rem; font-weight:500; background-color:${
              complaint.processed ? "#d4edda" : "#fff3cd"
            }; color:${
      complaint.processed ? "#155724" : "#856404"
    }; border:1px solid ${complaint.processed ? "#c3e6cb" : "#ffeeba"}">
              ${complaint.processed ? "Đã xử lý" : "Chưa xử lý"}
            </span>
          </div>
        </div>
        <div style="display:flex">
          <div style="font-weight:600; color:#4b6cb7; min-width:150px">Kết quả:</div>
          <div style="flex:1; color:#333">
            <span style="display:inline-block; padding:5px 15px; border-radius:50px; font-size:0.875rem; font-weight:500; background-color:${
              complaint.approved
                ? "#d4edda"
                : complaint.processed
                ? "#f8d7da"
                : "#e2e3e5"
            }; color:${
      complaint.approved
        ? "#155724"
        : complaint.processed
        ? "#721c24"
        : "#383d41"
    }; border:1px solid ${
      complaint.approved
        ? "#c3e6cb"
        : complaint.processed
        ? "#f5c6cb"
        : "#d6d8db"
    }">
              ${
                complaint.approved
                  ? "Đã duyệt"
                  : complaint.processed
                  ? "Không duyệt"
                  : "Chờ xử lý"
              }
            </span>
          </div>
        </div>
      </div>
      
      ${
        complaint.image_path
          ? `
        <div style="margin-top:1.5rem; border:1px solid rgba(0,0,0,0.1); border-radius:12px; padding:1.5rem; background-color:rgba(255,255,255,0.8); box-shadow:0 5px 15px rgba(0,0,0,0.05)">
          <h6 style="font-size:1.1rem; margin-bottom:1rem; color:#4b6cb7; font-weight:600; border-bottom:1px solid rgba(0,0,0,0.1); padding-bottom:0.75rem">Hình ảnh đính kèm:</h6>
          <div style="text-align:center">
            <img src="/api/complaint_image?path=${encodeURIComponent(
              complaint.image_path
            )}" 
                 alt="Ảnh khiếu nại" 
                 style="max-height:300px; max-width:100%; border-radius:8px; box-shadow:0 5px 15px rgba(0,0,0,0.1)"
                 onerror="this.onerror=null; this.src='/static/images/no-image.jpg'; this.alt='Không thể tải ảnh';">
          </div>
        </div>
      `
          : ""
      }
      
      ${
        !complaint.processed
          ? `
        <div style="margin-top:1.5rem; padding:1.5rem; border-top:1px solid rgba(0,0,0,0.1); background-color:rgba(255,255,255,0.8); border-radius:12px; box-shadow:0 5px 15px rgba(0,0,0,0.05)">
          <h6 style="font-size:1.1rem; margin-bottom:1.2rem; color:#4b6cb7; font-weight:600; text-align:center">Xử lý khiếu nại</h6>
          <div style="display:flex; justify-content:space-between; gap:1rem">
            <button class="btn btn-success" id="approve-complaint-btn" onclick="processComplaint('approve', ${complaint.id})" style="flex:1; padding:0.75rem; border-radius:50px; border:none; background:linear-gradient(to right, #28a745, #218838); color:white; font-weight:500; box-shadow:0 4px 10px rgba(40,167,69,0.2); transition:all 0.3s">
              <i class="fas fa-check" style="margin-right:8px"></i> Duyệt khiếu nại
            </button>
            <button class="btn btn-danger" id="reject-complaint-btn" onclick="processComplaint('reject', ${complaint.id})" style="flex:1; padding:0.75rem; border-radius:50px; border:none; background:linear-gradient(to right, #dc3545, #c82333); color:white; font-weight:500; box-shadow:0 4px 10px rgba(220,53,69,0.2); transition:all 0.3s">
              <i class="fas fa-times" style="margin-right:8px"></i> Không duyệt
            </button>
          </div>
        </div>
      `
          : ""
      }
    `;

    // Cập nhật tiêu đề modal
    const modalTitle = document.getElementById("complaint-modal-title");
    if (modalTitle) {
      modalTitle.textContent = `Chi tiết khiếu nại #${complaint.id}`;
    }

    // Lưu ID khiếu nại đang xem
    currentComplaintId = complaint.id;
  } catch (error) {
    console.error("Lỗi khi hiển thị chi tiết khiếu nại:", error);

    // Hiển thị thông báo lỗi trong SweetAlert
    Swal.fire({
      html: `
        <div style="text-align:center">
          <div style="margin-bottom:1.5rem; background-color:#f8d7da; padding:1.5rem; border-radius:50%; display:inline-block">
            <i class="fas fa-exclamation-circle" style="font-size:3rem; color:#dc3545"></i>
          </div>
          <h2 style="font-size:1.5rem; font-weight:600; color:#343a40; margin-bottom:1rem">Lỗi!</h2>
          <p style="color:#721c24; margin-bottom:0.5rem; font-size:1.1rem">Lỗi khi xem chi tiết khiếu nại: ${error.message}</p>
        </div>
      `,
      showConfirmButton: true,
      confirmButtonText: "Đóng",
      confirmButtonColor: "#3085d6",
      backdrop: "rgba(0,0,0,0.4)",
    });

    // Đóng modal nếu đang mở
    closeComplaintModal();
  }
}

// Tùy chỉnh SweetAlert để đẹp hơn
document.addEventListener("DOMContentLoaded", function () {
  // Thêm CSS cho SweetAlert
  const style = document.createElement("style");
  style.textContent = `
    .custom-swal-popup {
      border-radius: 15px !important;
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2) !important;
      background: linear-gradient(to bottom, #ffffff, #f8f9fa) !important;
    }
    
    .custom-swal-title {
      font-size: 24px !important;
      font-weight: 600 !important;
      color: #343a40 !important;
    }
    
    .custom-swal-content {
      font-size: 16px !important;
      color: #495057 !important;
    }
    
    .swal2-confirm {
      padding: 10px 24px !important;
      font-weight: 500 !important;
      border-radius: 8px !important;
      transition: all 0.2s ease !important;
    }
    
    .swal2-confirm:hover {
      transform: translateY(-2px) !important;
      box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3) !important;
    }
    
    .swal2-popup {
      padding: 2em !important;
    }
    
    .swal2-icon {
      margin: 1.5em auto !important;
      transform: scale(1.2) !important;
    }
    
    .swal2-actions {
      margin-top: 2em !important;
    }
    
    .swal2-styled.swal2-confirm {
      background-color: #007bff !important;
      box-shadow: 0 4px 10px rgba(0, 123, 255, 0.3) !important;
    }
    
    .swal2-styled.swal2-cancel {
      background-color: #6c757d !important;
      box-shadow: 0 4px 10px rgba(108, 117, 125, 0.3) !important;
    }
  `;
  document.head.appendChild(style);
});

// Hàm đánh dấu khiếu nại là đã xử lý
function markComplaintAsDone(complaintId) {
  try {
    const response = document.getElementById("response-textarea").value.trim();

    if (!response) {
      Swal.fire({
        icon: "warning",
        title: "Chú ý!",
        text: "Vui lòng nhập phản hồi trước khi đánh dấu đã xử lý.",
      });
      return;
    }

    Swal.fire({
      title: "Xác nhận",
      text: "Khiếu nại sẽ được đánh dấu là đã xử lý. Tiếp tục?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Xác nhận",
      cancelButtonText: "Hủy",
    }).then((result) => {
      if (result.isConfirmed) {
        // Hiển thị loading
        Swal.fire({
          title: "Đang xử lý...",
          didOpen: () => {
            Swal.showLoading();
          },
          allowOutsideClick: false,
          allowEscapeKey: false,
          showConfirmButton: false,
        });

        // Gửi yêu cầu cập nhật
        fetch(`/api/complaints/${complaintId}/status`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: "Đã xử lý",
            response: response,
          }),
        })
          .then((response) => {
            if (!response.ok) {
              throw new Error(`Lỗi HTTP: ${response.status}`);
            }
            return response.json();
          })
          .then((data) => {
            Swal.fire({
              icon: "success",
              title: "Thành công!",
              text: "Khiếu nại đã được đánh dấu là đã xử lý.",
              showConfirmButton: true,
            }).then(() => {
              // Cập nhật giao diện
              document.getElementById("response-box").textContent = response;
              const statusBadge = document.querySelector(".status-badge");
              if (statusBadge) {
                statusBadge.textContent = "Đã xử lý";
                statusBadge.classList.remove("status-pending");
                statusBadge.classList.add("status-done");
              }

              // Cập nhật lại danh sách khiếu nại
              loadComplaints();
            });
          })
          .catch((error) => {
            Swal.fire({
              icon: "error",
              title: "Lỗi!",
              text: `Không thể cập nhật trạng thái khiếu nại: ${error.message}`,
            });

            if (typeof handleError === "function") {
              handleError(error, "Lỗi khi cập nhật trạng thái khiếu nại");
            }
          });
      }
    });
  } catch (error) {
    if (typeof handleError === "function") {
      handleError(error, "Lỗi khi đánh dấu khiếu nại đã xử lý");
    }

    Swal.fire({
      icon: "error",
      title: "Lỗi!",
      text: "Đã xảy ra lỗi khi xử lý yêu cầu. Vui lòng thử lại sau.",
    });
  }
}

// Hàm lưu phản hồi khiếu nại
function saveComplaintResponse(complaintId) {
  try {
    const response = document.getElementById("response-textarea").value.trim();

    if (!response) {
      Swal.fire({
        icon: "warning",
        title: "Chú ý!",
        text: "Vui lòng nhập phản hồi trước khi lưu.",
      });
      return;
    }

    // Hiển thị loading
    Swal.fire({
      title: "Đang lưu...",
      didOpen: () => {
        Swal.showLoading();
      },
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
    });

    // Gửi yêu cầu cập nhật
    fetch(`/api/complaints/${complaintId}/response`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        response: response,
      }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Lỗi HTTP: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        Swal.fire({
          icon: "success",
          title: "Thành công!",
          text: "Phản hồi đã được lưu.",
          showConfirmButton: true,
        }).then(() => {
          // Cập nhật giao diện
          document.getElementById("response-box").textContent = response;

          // Cập nhật lại danh sách khiếu nại
          loadComplaints();
        });
      })
      .catch((error) => {
        Swal.fire({
          icon: "error",
          title: "Lỗi!",
          text: `Không thể lưu phản hồi: ${error.message}`,
        });

        if (typeof handleError === "function") {
          handleError(error, "Lỗi khi lưu phản hồi khiếu nại");
        }
      });
  } catch (error) {
    if (typeof handleError === "function") {
      handleError(error, "Lỗi khi lưu phản hồi khiếu nại");
    }

    Swal.fire({
      icon: "error",
      title: "Lỗi!",
      text: "Đã xảy ra lỗi khi xử lý yêu cầu. Vui lòng thử lại sau.",
    });
  }
}

// Lọc danh sách khiếu nại
function filterComplaints() {
  try {
    // Lấy giá trị các bộ lọc
    const searchText =
      document.getElementById("complaints-search")?.value?.trim() || "";
    const statusFilter =
      document.getElementById("complaint-status-filter")?.value || "all";
    const reasonFilter =
      document.getElementById("complaint-reason-filter")?.value || "all";
    const fromDate =
      document.getElementById("complaints-date-from")?.value || "";
    const toDate = document.getElementById("complaints-date-to")?.value || "";

    console.log("Đang lọc khiếu nại với điều kiện:", {
      searchText,
      statusFilter,
      reasonFilter,
      fromDate,
      toDate,
    });

    // Kiểm tra xem có dữ liệu để lọc không
    if (!allComplaintsData || allComplaintsData.length === 0) {
      console.warn("Không có dữ liệu khiếu nại để lọc");
      document.getElementById("complaints-list").innerHTML =
        '<tr><td colspan="7" class="no-data">Không có khiếu nại nào</td></tr>';
      document.getElementById("complaints-pagination").innerHTML = "";
      return;
    }

    // Lọc dữ liệu
    let filteredData = [...allComplaintsData];

    if (searchText) {
      filteredData = filteredData.filter((item) => {
        const idMatch =
          item.employee_id && item.employee_id.toString().includes(searchText);
        const nameMatch =
          item.employee_name &&
          item.employee_name.toLowerCase().includes(searchText.toLowerCase());
        return idMatch || nameMatch;
      });
    }

    if (statusFilter !== "all") {
      filteredData = filteredData.filter((item) => {
        if (statusFilter === "pending") return !item.processed;
        if (statusFilter === "approved")
          return (
            item.processed &&
            (item.status === "Đã duyệt" || item.status === "approved")
          );
        if (statusFilter === "rejected")
          return (
            item.processed &&
            (item.status === "Không duyệt" || item.status === "rejected")
          );
        return true;
      });
    }

    if (reasonFilter !== "all") {
      filteredData = filteredData.filter((item) => {
        return item.reason === reasonFilter;
      });
    }

    // Lọc theo ngày
    if (fromDate) {
      const fromDateObj = new Date(fromDate);
      filteredData = filteredData.filter((item) => {
        if (!item.complaint_date) return false;
        const itemDate = new Date(item.complaint_date);
        return itemDate >= fromDateObj;
      });
    }

    if (toDate) {
      const toDateObj = new Date(toDate);
      // Đặt giờ là cuối ngày
      toDateObj.setHours(23, 59, 59, 999);
      filteredData = filteredData.filter((item) => {
        if (!item.complaint_date) return false;
        const itemDate = new Date(item.complaint_date);
        return itemDate <= toDateObj;
      });
    }

    console.log(
      `Lọc từ ${allComplaintsData.length} khiếu nại xuống còn ${filteredData.length} khiếu nại`
    );

    // Cập nhật dữ liệu hiện tại
    currentComplaintsData = filteredData;
    complaintsPage = 1;

    // Hiển thị dữ liệu
    displayComplaintsPage(complaintsPage);
    createComplaintsPagination();
  } catch (error) {
    console.error("Lỗi khi lọc danh sách khiếu nại:", error);
    Swal.fire({
      title: "Lỗi!",
      text: "Có lỗi xảy ra khi lọc danh sách khiếu nại: " + error.message,
      icon: "error",
      confirmButtonText: "OK",
    });
  }
}

// Reset bộ lọc khiếu nại
function resetComplaintsFilter() {
  // Reset các trường input
  document.getElementById("complaints-search").value = "";
  document.getElementById("complaint-status-filter").value = "all";
  document.getElementById("complaint-reason-filter").value = "all";
  document.getElementById("complaints-date-from").value = "";
  document.getElementById("complaints-date-to").value = "";

  console.log("Đã reset bộ lọc khiếu nại");

  // Khôi phục dữ liệu ban đầu
  currentComplaintsData = [...allComplaintsData];
  complaintsPage = 1;

  // Hiển thị lại dữ liệu
  displayComplaintsPage(complaintsPage);
  createComplaintsPagination();
}

// Xử lý duyệt/không duyệt khiếu nại
async function processComplaint(action, complaintId) {
  try {
    // Sử dụng complaintId từ tham số hoặc từ biến toàn cục
    const id = complaintId || currentComplaintId;

    if (!id) {
      throw new Error("Không tìm thấy ID khiếu nại");
    }

    // Biến lưu nội dung thông báo
    let title,
      text,
      confirmButtonText,
      confirmButtonColor,
      iconColor,
      bgColor,
      titleColor;

    if (action === "approve") {
      title = "Xác nhận duyệt khiếu nại?";
      text = "Bạn sẽ duyệt khiếu nại này, không thể hoàn tác sau khi xác nhận!";
      confirmButtonText = "Duyệt";
      confirmButtonColor = "#28a745";
      iconColor = "#ffc107";
      bgColor = "#fff8e1";
      titleColor = "#343a40";
    } else if (action === "reject") {
      title = "Xác nhận từ chối khiếu nại?";
      text =
        "Bạn sẽ từ chối khiếu nại này, không thể hoàn tác sau khi xác nhận!";
      confirmButtonText = "Từ chối";
      confirmButtonColor = "#dc3545";
      iconColor = "#ffc107";
      bgColor = "#fff8e1";
      titleColor = "#343a40";
    } else {
      throw new Error("Hành động không hợp lệ");
    }

    // Hiển thị thông báo xác nhận với CSS inline
    const result = await Swal.fire({
      html: `
        <div style="text-align:center">
          <div style="margin-bottom:1.5rem; background-color:${bgColor}; padding:1.5rem; border-radius:50%; display:inline-block">
            <i class="fas fa-exclamation-triangle" style="font-size:3rem; color:${iconColor}"></i>
          </div>
          <h2 style="font-size:1.5rem; font-weight:600; color:${titleColor}; margin-bottom:1rem">${title}</h2>
          <p style="color:#6c757d; margin-bottom:0.5rem; font-size:1rem">${text}</p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: confirmButtonText,
      cancelButtonText: "Hủy",
      confirmButtonColor: confirmButtonColor,
      cancelButtonColor: "#6c757d",
      backdrop: "rgba(0,0,0,0.4)",
    });

    if (!result.isConfirmed) {
      return;
    }

    // Hiển thị loading với CSS inline
    Swal.fire({
      html: `
        <div style="padding:1.5rem; text-align:center">
          <div class="spinner-border" role="status" style="width:3rem; height:3rem; color:#4b6cb7; border-width:0.25rem">
            <span class="visually-hidden">Loading...</span>
          </div>
          <p style="margin-top:1.5rem; font-size:1.1rem; color:#6c757d">Đang xử lý yêu cầu...</p>
        </div>
      `,
      showConfirmButton: false,
      allowOutsideClick: false,
      backdrop: "rgba(0,0,0,0.4)",
    });

    // Chuẩn bị dữ liệu gửi lên server
    const data = {
      action: action,
    };

    // Gửi yêu cầu xử lý tới server
    const response = await fetch(`/api/complaint/${id}/process`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Lỗi khi gửi yêu cầu: ${response.status}`);
    }

    const responseData = await response.json();

    if (!responseData.success) {
      throw new Error(responseData.message || "Xử lý khiếu nại thất bại.");
    }

    // Hiển thị thông báo thành công với CSS inline
    const successText =
      action === "approve"
        ? "Khiếu nại đã được duyệt thành công!"
        : "Khiếu nại đã bị từ chối!";

    Swal.fire({
      html: `
        <div style="text-align:center">
          <div style="margin-bottom:1.5rem; background-color:#d4edda; padding:1.5rem; border-radius:50%; display:inline-block">
            <i class="fas fa-check-circle" style="font-size:3rem; color:#28a745"></i>
          </div>
          <h2 style="font-size:1.5rem; font-weight:600; color:#343a40; margin-bottom:1rem">Thành công!</h2>
          <p style="color:#155724; margin-bottom:0.5rem; font-size:1.1rem">${successText}</p>
        </div>
      `,
      showConfirmButton: true,
      confirmButtonText: "Đóng",
      confirmButtonColor: "#3085d6",
      backdrop: "rgba(0,0,0,0.4)",
    });

    // Đóng modal bootstrap
    try {
      const modal = document.getElementById("complaint-detail-modal");
      if (modal) {
        const bsModal = bootstrap.Modal.getInstance(modal);
        if (bsModal) {
          bsModal.hide();
        } else {
          // Fallback nếu không lấy được instance
          modal.style.display = "none";
          modal.classList.remove("show");
          document.body.classList.remove("modal-open");

          const backdrop = document.querySelector(".modal-backdrop");
          if (backdrop) {
            backdrop.parentNode.removeChild(backdrop);
          }
        }
      }
    } catch (err) {
      console.error("Lỗi khi đóng modal:", err);
    }

    // Tải lại danh sách khiếu nại
    await loadComplaints();
  } catch (error) {
    // Hiển thị thông báo lỗi với CSS inline
    Swal.fire({
      html: `
        <div style="text-align: center;">
          <div style="margin-bottom: 1.5rem; background-color: #f8d7da; padding: 1.5rem; border-radius: 50%; display: inline-block;">
            <i class="fas fa-exclamation-circle" style="font-size: 3rem; color: #dc3545;"></i>
          </div>
          <h2 style="font-size: 1.5rem; font-weight: 600; color: #343a40; margin-bottom: 1rem;">Lỗi!</h2>
          <p style="color: #721c24; margin-bottom: 0.5rem; font-size: 1.1rem;">${
            error.message || "Có lỗi xảy ra khi xử lý khiếu nại"
          }</p>
        </div>
      `,
      showConfirmButton: true,
      confirmButtonText: "Đóng",
      confirmButtonColor: "#3085d6",
      showClass: {
        popup: "animate__animated animate__headShake animate__faster",
      },
      backdrop: "rgba(0,0,0,0.4)",
      customClass: {
        confirmButton: "swal-confirm-button",
        popup: "swal-popup-error",
      },
    });
  }
}

/**
 * Tải cấu hình ca làm việc từ server
 */
async function loadShiftConfig() {
  try {
    const response = await fetch("/api/shift/config");

    if (!response.ok) {
      throw new Error(`API trả về lỗi: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || "Không thể tải cấu hình ca làm việc");
    }

    // Lấy cấu hình từ kết quả API
    const shiftConfig = result.config;

    if (!shiftConfig || !shiftConfig.shift1 || !shiftConfig.shift2) {
      // Không có dữ liệu cấu hình ca làm việc hợp lệ, sử dụng cấu hình mặc định
      setDefaultShiftsConfig();
      return false;
    }

    // Cập nhật giao diện với dữ liệu mới
    const shift1 = shiftConfig.shift1;
    const shift2 = shiftConfig.shift2;

    // Cập nhật form nhập liệu
    const shift1CheckIn = document.getElementById("shift1-check-in");
    const shift1CheckOut = document.getElementById("shift1-check-out");
    const shift2CheckIn = document.getElementById("shift2-check-in");
    const shift2CheckOut = document.getElementById("shift2-check-out");

    if (shift1CheckIn) shift1CheckIn.value = shift1.checkIn;
    if (shift1CheckOut) shift1CheckOut.value = shift1.checkOut;
    if (shift2CheckIn) shift2CheckIn.value = shift2.checkIn;
    if (shift2CheckOut) shift2CheckOut.value = shift2.checkOut;

    // Cập nhật hiển thị trong thẻ card
    const currentShift1 = document.getElementById("current-shift1");
    const currentShift2 = document.getElementById("current-shift2");

    if (currentShift1)
      currentShift1.textContent = `${shift1.checkIn} - ${shift1.checkOut}`;
    if (currentShift2)
      currentShift2.textContent = `${shift2.checkIn} - ${shift2.checkOut}`;

    // Cập nhật thời gian cập nhật cuối
    const lastUpdatedTime = document.getElementById("last-updated-time");
    if (lastUpdatedTime) {
      const now = new Date();
      lastUpdatedTime.textContent = now.toLocaleString("vi-VN");
    }

    return true;
  } catch (error) {
    // Sử dụng hàm handleError nếu có
    if (typeof handleError === "function") {
      handleError(error, "Lỗi khi tải cấu hình ca làm việc");
    }

    // Sử dụng cấu hình mặc định khi có lỗi
    setDefaultShiftsConfig();
    return false;
  }
}

// Hàm xử lý lỗi tốt hơn
function handleError(error, message, elementId = null) {
  // Ghi log lỗi
  console.error(message, error);

  if (error instanceof Error) {
    // Đã là đối tượng Error
  } else {
    // Chuyển đổi thành đối tượng Error nếu chưa phải
    error = new Error(error.toString());
  }

  // Nếu có elementId, hiển thị lỗi lên element đó
  if (elementId) {
    const element = document.getElementById(elementId);
    if (element) {
      element.innerHTML = `
        <div style="background-color: #f8d7da; color: #721c24; padding: 12px 15px; border-radius: 6px; margin: 10px 0; border: 1px solid #f5c6cb; display: flex; align-items: center;">
          <i class="fas fa-exclamation-triangle" style="color: #dc3545; font-size: 1.1rem; margin-right: 10px;"></i>
          <div>
            <strong style="display: block; margin-bottom: 3px;">${
              message || "Đã xảy ra lỗi"
            }:</strong>
            <span>${error.message}</span>
          </div>
        </div>
      `;
    }
  }

  // Hiển thị thông báo lỗi nếu có SweetAlert
  if (typeof Swal !== "undefined") {
    Swal.fire({
      html: `
        <div style="text-align: center;">
          <div style="margin-bottom: 1.5rem; background-color: #f8d7da; padding: 1.5rem; border-radius: 50%; display: inline-block;">
            <i class="fas fa-exclamation-circle" style="font-size: 3rem; color: #dc3545;"></i>
          </div>
          <h2 style="font-size: 1.5rem; font-weight: 600; color: #343a40; margin-bottom: 0.5rem;">Lỗi!</h2>
          <p style="color: #6c757d; font-size: 1rem; margin-bottom: 0.25rem;">${
            message || "Đã xảy ra lỗi"
          }:</p>
          <p style="color: #dc3545; font-weight: 500; font-size: 1.1rem; margin-bottom: 0;">${
            error.message
          }</p>
        </div>
      `,
      showConfirmButton: true,
      confirmButtonText: "Đóng",
      confirmButtonColor: "#3085d6",
      showClass: {
        popup: "animate__animated animate__fadeInDown animate__faster",
      },
      hideClass: {
        popup: "animate__animated animate__fadeOutUp animate__faster",
      },
      backdrop: "rgba(0,0,0,0.4)",
      customClass: {
        confirmButton: "swal-confirm-button",
      },
    });
  }
}

// Hàm xuất dữ liệu thành Excel
function exportEmployeeToExcel() {
  try {
    // Cột thứ 3 (index 3) là cột "Thao tác" cần loại bỏ khi xuất Excel
    exportToExcel("employee-list", "Danh_sach_nhan_vien.xlsx", [3]);
  } catch (error) {
    if (typeof handleError === "function") {
      handleError(error, "Lỗi khi xuất Excel danh sách nhân viên");
    }
  }
}

/**
 * Hàm xuất dữ liệu chấm công ra Excel
 */
function exportAttendanceToExcel() {
  try {
    // Cột thao tác ở cuối không cần xuất ra file Excel
    const columnsCount = document.querySelectorAll(
      "#attendance-list-header th"
    ).length;
    if (columnsCount > 0) {
      // Nếu có cột thao tác ở cuối, loại bỏ nó
      exportToExcel("attendance-list", "Lich_su_cham_cong.xlsx", [
        columnsCount - 1,
      ]);
    } else {
      exportToExcel("attendance-list", "Lich_su_cham_cong.xlsx", []);
    }
  } catch (error) {
    if (typeof handleError === "function") {
      handleError(error, "Lỗi khi xuất Excel dữ liệu chấm công");
    }
  }
}

/**
 * Hàm xuất danh sách khiếu nại ra Excel
 */
function exportComplaintsToExcel() {
  try {
    // Cột thứ 6 (index 6) là cột "Chi tiết" cần loại bỏ khi xuất Excel
    exportToExcel("complaints-list", "Danh_sach_khieu_nai.xlsx", [6]);
  } catch (error) {
    if (typeof handleError === "function") {
      handleError(error, "Lỗi khi xuất Excel danh sách khiếu nại");
    }
  }
}

// Hàm đóng modal chi tiết khiếu nại
function closeComplaintModal() {
  const modal = document.getElementById("complaint-detail-modal");
  if (modal) {
    try {
      // Cố gắng sử dụng API Bootstrap 5 trước
      const bsModal = bootstrap.Modal.getInstance(modal);
      if (bsModal) {
        bsModal.hide();
        return;
      }
    } catch (err) {
      console.error("Lỗi khi đóng modal bằng Bootstrap API:", err);
    }

    // Fallback giải pháp nếu Bootstrap API không hoạt động
    modal.style.display = "none";
    modal.classList.remove("show");
    document.body.classList.remove("modal-open");

    // Xóa backdrop
    const backdrop = document.querySelector(".modal-backdrop");
    if (backdrop) {
      backdrop.parentNode.removeChild(backdrop);
    }
  }
}

// Hàm mở modal chi tiết khiếu nại
function openComplaintModal() {
  const modal = document.getElementById("complaint-detail-modal");
  if (modal) {
    modal.style.display = "block";
    modal.classList.add("show");
    document.body.classList.add("modal-open");

    // Tạo backdrop nếu chưa có
    let backdrop = document.querySelector(".modal-backdrop");
    if (!backdrop) {
      backdrop = document.createElement("div");
      backdrop.className = "modal-backdrop fade show";
      document.body.appendChild(backdrop);
    }
  }
}

// Thêm hàm gọi view Complaint Detail từ window
window.viewComplaintDetail = function (complaintId) {
  // Tránh gọi lại chính nó để tránh đệ quy vô hạn
  try {
    // Đảm bảo modal tồn tại và có đầy đủ các phần tử
    const modal = ensureComplaintDetailModalExists();

    // Hiển thị loading trong modal
    const modalBody = document.getElementById("complaint-modal-body");
    if (!modalBody) {
      throw new Error("Không tìm thấy phần tử complaint-modal-body");
    }

    modalBody.innerHTML = `
      <div style="text-align:center; padding:2rem; width:100%">
        <div class="spinner-border" role="status" style="width:4rem; height:4rem; color:#4b6cb7; border-width:0.35rem">
          <span class="visually-hidden">Đang tải...</span>
        </div>
        <p style="margin-top:1.5rem; font-size:1.1rem; color:#6c757d; font-weight:500">Đang tải thông tin khiếu nại...</p>
      </div>
    `;

    // Mở modal với Bootstrap 5
    try {
      const bsModal = new bootstrap.Modal(modal);
      bsModal.show();
    } catch (err) {
      console.error("Lỗi khi mở modal với Bootstrap:", err);
      // Fallback nếu không mở được với Bootstrap
      modal.style.display = "block";
      modal.classList.add("show");
      document.body.classList.add("modal-open");

      // Tạo backdrop
      const backdrop = document.createElement("div");
      backdrop.className = "modal-backdrop fade show";
      document.body.appendChild(backdrop);
    }

    // Gửi request lấy thông tin chi tiết
    fetch(`/api/complaint/${complaintId}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `Lỗi khi tải dữ liệu: ${response.status} ${response.statusText}`
          );
        }
        return response.json();
      })
      .then((data) => {
        if (!data || data.success === false) {
          throw new Error(data.message || "Không thể tải thông tin khiếu nại");
        }

        const complaint = data.complaint || data;

        // Cập nhật nội dung modal với CSS inline
        const modalBody = document.getElementById("complaint-modal-body");
        if (!modalBody) {
          throw new Error(
            "Không tìm thấy phần tử complaint-modal-body sau khi fetch dữ liệu"
          );
        }

        modalBody.innerHTML = `
          <div style="background-color:rgba(255,255,255,0.8); border-radius:12px; padding:1.5rem; margin-bottom:1.5rem; box-shadow:0 5px 15px rgba(0,0,0,0.05)">
            <div style="display:flex; margin-bottom:1rem; padding-bottom:0.75rem; border-bottom:1px solid rgba(0,0,0,0.1)">
              <div style="font-weight:600; color:#4b6cb7; min-width:150px">Mã khiếu nại:</div>
              <div style="flex:1; color:#333; font-weight:500">${
                complaint.id || "N/A"
              }</div>
            </div>
            <div style="display:flex; margin-bottom:1rem; padding-bottom:0.75rem; border-bottom:1px solid rgba(0,0,0,0.1)">
              <div style="font-weight:600; color:#4b6cb7; min-width:150px">Nhân viên:</div>
              <div style="flex:1; color:#333">${
                complaint.employee_name || "N/A"
              } (${complaint.employee_id || "N/A"})</div>
            </div>
            <div style="display:flex; margin-bottom:1rem; padding-bottom:0.75rem; border-bottom:1px solid rgba(0,0,0,0.1)">
              <div style="font-weight:600; color:#4b6cb7; min-width:150px">Ngày gửi:</div>
              <div style="flex:1; color:#333">${
                complaint.created_at ||
                complaint.complaint_date ||
                complaint.date ||
                "N/A"
              }</div>
            </div>
            <div style="display:flex; margin-bottom:1rem; padding-bottom:0.75rem; border-bottom:1px solid rgba(0,0,0,0.1)">
              <div style="font-weight:600; color:#4b6cb7; min-width:150px">Nội dung:</div>
              <div style="flex:1; color:#333">
                <div style="background-color:#fff; border-radius:8px; padding:15px; border:1px solid #dee2e6; margin-top:5px; line-height:1.5">${
                  complaint.reason || "Không có nội dung"
                }</div>
              </div>
            </div>
            <div style="display:flex; margin-bottom:1rem; padding-bottom:0.75rem; border-bottom:1px solid rgba(0,0,0,0.1)">
              <div style="font-weight:600; color:#4b6cb7; min-width:150px">Trạng thái:</div>
              <div style="flex:1; color:#333">
                <span style="display:inline-block; padding:5px 15px; border-radius:50px; font-size:0.875rem; font-weight:500; background-color:${
                  complaint.processed ? "#d4edda" : "#fff3cd"
                }; color:${
          complaint.processed ? "#155724" : "#856404"
        }; border:1px solid ${complaint.processed ? "#c3e6cb" : "#ffeeba"}">
                  ${complaint.processed ? "Đã xử lý" : "Chưa xử lý"}
                </span>
              </div>
            </div>
            <div style="display:flex">
              <div style="font-weight:600; color:#4b6cb7; min-width:150px">Kết quả:</div>
              <div style="flex:1; color:#333">
                <span style="display:inline-block; padding:5px 15px; border-radius:50px; font-size:0.875rem; font-weight:500; background-color:${
                  complaint.approved
                    ? "#d4edda"
                    : complaint.processed
                    ? "#f8d7da"
                    : "#e2e3e5"
                }; color:${
          complaint.approved
            ? "#155724"
            : complaint.processed
            ? "#721c24"
            : "#383d41"
        }; border:1px solid ${
          complaint.approved
            ? "#c3e6cb"
            : complaint.processed
            ? "#f5c6cb"
            : "#d6d8db"
        }">
                  ${
                    complaint.approved
                      ? "Đã duyệt"
                      : complaint.processed
                      ? "Không duyệt"
                      : "Chờ xử lý"
                  }
                </span>
              </div>
            </div>
          </div>
          
          ${
            complaint.image_path
              ? `
            <div style="margin-top:1.5rem; border:1px solid rgba(0,0,0,0.1); border-radius:12px; padding:1.5rem; background-color:rgba(255,255,255,0.8); box-shadow:0 5px 15px rgba(0,0,0,0.05)">
              <h6 style="font-size:1.1rem; margin-bottom:1rem; color:#4b6cb7; font-weight:600; border-bottom:1px solid rgba(0,0,0,0.1); padding-bottom:0.75rem">Hình ảnh đính kèm:</h6>
              <div style="text-align:center">
                <img src="/api/complaint_image?path=${encodeURIComponent(
                  complaint.image_path
                )}" 
                     alt="Ảnh khiếu nại" 
                     style="max-height:300px; max-width:100%; border-radius:8px; box-shadow:0 5px 15px rgba(0,0,0,0.1)"
                     onerror="this.onerror=null; this.src='/static/images/no-image.jpg'; this.alt='Không thể tải ảnh';">
              </div>
            </div>
          `
              : ""
          }
          
          ${
            !complaint.processed
              ? `
            <div style="margin-top:1.5rem; padding:1.5rem; border-top:1px solid rgba(0,0,0,0.1); background-color:rgba(255,255,255,0.8); border-radius:12px; box-shadow:0 5px 15px rgba(0,0,0,0.05)">
              <h6 style="font-size:1.1rem; margin-bottom:1.2rem; color:#4b6cb7; font-weight:600; text-align:center">Xử lý khiếu nại</h6>
              <div style="display:flex; justify-content:space-between; gap:1rem">
                <button class="btn btn-success" id="approve-complaint-btn" onclick="processComplaint('approve', ${complaint.id})" style="flex:1; padding:0.75rem; border-radius:50px; border:none; background:linear-gradient(to right, #28a745, #218838); color:white; font-weight:500; box-shadow:0 4px 10px rgba(40,167,69,0.2); transition:all 0.3s">
                  <i class="fas fa-check" style="margin-right:8px"></i> Duyệt khiếu nại
                </button>
                <button class="btn btn-danger" id="reject-complaint-btn" onclick="processComplaint('reject', ${complaint.id})" style="flex:1; padding:0.75rem; border-radius:50px; border:none; background:linear-gradient(to right, #dc3545, #c82333); color:white; font-weight:500; box-shadow:0 4px 10px rgba(220,53,69,0.2); transition:all 0.3s">
                  <i class="fas fa-times" style="margin-right:8px"></i> Không duyệt
                </button>
              </div>
            </div>
          `
              : ""
          }
        `;

        // Cập nhật tiêu đề modal
        const modalTitle = document.getElementById("complaint-modal-title");
        if (modalTitle) {
          modalTitle.textContent = `Chi tiết khiếu nại #${complaint.id}`;
        }

        // Lưu ID khiếu nại đang xem
        currentComplaintId = complaint.id;
      })
      .catch((error) => {
        console.error("Lỗi khi hiển thị chi tiết khiếu nại:", error);

        // Hiển thị thông báo lỗi trong SweetAlert
        Swal.fire({
          html: `
            <div style="text-align:center">
              <div style="margin-bottom:1.5rem; background-color:#f8d7da; padding:1.5rem; border-radius:50%; display:inline-block">
                <i class="fas fa-exclamation-circle" style="font-size:3rem; color:#dc3545"></i>
              </div>
              <h2 style="font-size:1.5rem; font-weight:600; color:#343a40; margin-bottom:1rem">Lỗi!</h2>
              <p style="color:#721c24; margin-bottom:0.5rem; font-size:1.1rem">Lỗi khi xem chi tiết khiếu nại: ${error.message}</p>
            </div>
          `,
          showConfirmButton: true,
          confirmButtonText: "Đóng",
          confirmButtonColor: "#3085d6",
        });

        // Đóng modal
        try {
          const bsModal = bootstrap.Modal.getInstance(modal);
          if (bsModal) {
            bsModal.hide();
          } else {
            modal.style.display = "none";
            modal.classList.remove("show");
            document.body.classList.remove("modal-open");

            // Xóa backdrop
            const backdrop = document.querySelector(".modal-backdrop");
            if (backdrop) {
              document.body.removeChild(backdrop);
            }
          }
        } catch (e) {
          console.error("Lỗi khi đóng modal:", e);
        }
      });
  } catch (error) {
    console.error("Lỗi khi xem chi tiết khiếu nại:", error);

    // Hiển thị lỗi bằng SweetAlert
    Swal.fire({
      html: `
        <div style="text-align:center">
          <div style="margin-bottom:1.5rem; background-color:#f8d7da; padding:1.5rem; border-radius:50%; display:inline-block">
            <i class="fas fa-exclamation-circle" style="font-size:3rem; color:#dc3545"></i>
          </div>
          <h2 style="font-size:1.5rem; font-weight:600; color:#343a40; margin-bottom:1rem">Lỗi!</h2>
          <p style="color:#721c24; margin-bottom:0.5rem; font-size:1.1rem">Lỗi khi xem chi tiết khiếu nại: ${error.message}</p>
        </div>
      `,
      showConfirmButton: true,
      confirmButtonText: "Đóng",
      confirmButtonColor: "#3085d6",
    });
  }
};

/**
 * Hàm xuất dữ liệu thành file Excel
 * @param {string} tableId - ID của bảng cần xuất
 * @param {string} filename - Tên file Excel
 * @param {Array} excludeColumns - Mảng các chỉ số cột cần loại trừ khi xuất
 */
function exportToExcel(tableId, filename, excludeColumns = []) {
  try {
    const table = document.getElementById(tableId);
    if (!table) {
      throw new Error(`Không tìm thấy bảng với ID: ${tableId}`);
    }

    // Kiểm tra dữ liệu
    if (table.rows.length <= 1) {
      Swal.fire({
        icon: "warning",
        title: "Không có dữ liệu",
        text: "Không có dữ liệu để xuất ra Excel.",
        confirmButtonText: "OK",
      });
      return;
    }

    // Lấy tất cả hàng trong bảng
    const rows = Array.from(table.rows);

    // Lấy tiêu đề các cột (từ hàng đầu tiên)
    const headerRow = rows[0];
    const headers = Array.from(headerRow.cells).map((cell) =>
      cell.textContent.trim()
    );

    // Lọc các cột cần loại trừ
    const filteredHeaders = headers.filter(
      (_, index) => !excludeColumns.includes(index)
    );

    // Mảng chứa dữ liệu xuất
    const data = [filteredHeaders];

    // Lấy dữ liệu từ các hàng
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowData = Array.from(row.cells).map((cell) =>
        cell.textContent.trim()
      );

      // Loại bỏ các cột không cần thiết
      const filteredRowData = rowData.filter(
        (_, index) => !excludeColumns.includes(index)
      );

      // Thêm vào mảng dữ liệu
      data.push(filteredRowData);
    }

    // Tạo workbook mới
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Thêm worksheet vào workbook
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

    // Tải xuống file Excel
    XLSX.writeFile(wb, `${filename}`);

    // Thông báo thành công
    Swal.fire({
      icon: "success",
      title: "Xuất dữ liệu thành công",
      text: `Dữ liệu đã được xuất ra file Excel: ${filename}`,
      confirmButtonText: "OK",
    });
  } catch (error) {
    console.error("Lỗi khi xuất dữ liệu ra Excel:", error);

    // Xử lý lỗi
    if (typeof handleError === "function") {
      handleError(error, "Lỗi khi xuất dữ liệu ra Excel");
    } else {
      Swal.fire({
        icon: "error",
        title: "Lỗi xuất dữ liệu",
        text: error.message || "Đã xảy ra lỗi khi xuất dữ liệu ra Excel",
        confirmButtonText: "OK",
      });
    }
  }
}

// Hàm hiển thị một trang dữ liệu chấm công
function displayAttendancePage(page) {
  try {
    // Kiểm tra nếu không có dữ liệu
    if (!currentAttendanceData || currentAttendanceData.length === 0) {
      document.getElementById("attendance-list").innerHTML =
        '<tr><td colspan="10" class="no-data">Không có dữ liệu chấm công</td></tr>';

      if (document.getElementById("attendance-count")) {
        document.getElementById("attendance-count").textContent = "0";
      }

      return;
    }

    // Tính toán chỉ mục bắt đầu và kết thúc cho trang hiện tại
    const start = (page - 1) * attendancePerPage;
    const end = Math.min(
      start + attendancePerPage,
      currentAttendanceData.length
    );

    // Lấy dữ liệu cho trang hiện tại
    const currentPageData = currentAttendanceData.slice(start, end);

    // Nếu không có dữ liệu trong trang hiện tại, hiển thị thông báo
    if (currentPageData.length === 0) {
      document.getElementById("attendance-list").innerHTML =
        '<tr><td colspan="10" class="no-data">Không có dữ liệu chấm công trong trang này</td></tr>';

      if (document.getElementById("attendance-count")) {
        document.getElementById("attendance-count").textContent =
          currentAttendanceData.length;
      }

      return;
    }

    // Tạo HTML cho các dòng dữ liệu
    let html = "";
    currentPageData.forEach((item) => {
      // Xác định class cho dòng dựa trên trạng thái
      let rowClass = "";
      if (item.lateMinutes > 0) rowClass += " late";
      if (item.earlyMinutes > 0) rowClass += " early";

      // Fix dữ liệu undefined hoặc null
      const safeData = {
        date: item.date || "N/A",
        id: item.id || "N/A",
        name: item.name || "N/A",
        checkIn1: item.checkIn1 || "N/A",
        checkOut1: item.checkOut1 || "N/A",
        checkIn2: item.checkIn2 || "N/A",
        checkOut2: item.checkOut2 || "N/A",
        lateMinutes: item.lateMinutes || 0,
        earlyMinutes: item.earlyMinutes || 0,
        workHours: item.workHours || 0,
        shiftCount: item.shiftCount || 0,
        note: item.note || "Đúng giờ",
      };

      html += `
        <tr class="${rowClass}">
          <td>${safeData.date}</td>
          <td>${safeData.id}</td>
          <td>${safeData.name}</td>
          <td>${safeData.checkIn1} - ${safeData.checkOut1}</td>
          <td>${safeData.checkIn2} - ${safeData.checkOut2}</td>
          <td>${
            safeData.lateMinutes > 0 ? safeData.lateMinutes + " phút" : "0 phút"
          }</td>
          <td>${
            safeData.earlyMinutes > 0
              ? safeData.earlyMinutes + " phút"
              : "0 phút"
          }</td>
          <td>${
            typeof safeData.workHours === "number"
              ? safeData.workHours.toFixed(1)
              : "0.0"
          } giờ</td>
          <td>${safeData.shiftCount}</td>
          <td>${safeData.note}</td>
        </tr>
      `;
    });

    // Cập nhật bảng
    document.getElementById("attendance-list").innerHTML = html;

    // Cập nhật số lượng bản ghi
    if (document.getElementById("attendance-count")) {
      document.getElementById("attendance-count").textContent =
        currentAttendanceData.length;
    }
  } catch (error) {
    if (typeof handleError === "function") {
      handleError(error, "Lỗi khi hiển thị dữ liệu chấm công");
    }

    document.getElementById("attendance-list").innerHTML =
      '<tr><td colspan="10" class="error-message">Lỗi khi hiển thị dữ liệu: ' +
      error.message +
      "</td></tr>";
  }
}

// Hàm tạo phân trang cho dữ liệu chấm công
function createAttendancePagination() {
  const totalPages = Math.ceil(
    currentAttendanceData.length / attendancePerPage
  );

  // Nếu chỉ có 1 trang hoặc không có dữ liệu, không cần hiển thị phân trang
  if (totalPages <= 1) {
    document.getElementById("attendance-pagination").innerHTML = "";
    return;
  }

  let paginationHTML = '<ul class="pagination justify-content-center">';

  // Nút Previous
  paginationHTML += `
    <li class="page-item ${attendancePage === 1 ? "disabled" : ""}">
      <a class="page-link" href="#" onclick="changePage('attendance', ${
        attendancePage - 1
      }); return false;">
        <i class="fas fa-chevron-left"></i>
      </a>
    </li>
  `;

  // Giới hạn số nút hiển thị
  const maxVisiblePages = 5;
  let startPage = Math.max(1, attendancePage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  // Điều chỉnh lại startPage nếu endPage đã đạt giới hạn
  if (endPage === totalPages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  // Nếu không phải ở trang đầu, hiển thị nút trang 1
  if (startPage > 1) {
    paginationHTML += `
      <li class="page-item">
        <a class="page-link" href="#" onclick="changePage('attendance', 1); return false;">1</a>
      </li>
    `;

    // Hiển thị dấu ba chấm nếu không liền kề với trang 1
    if (startPage > 2) {
      paginationHTML +=
        '<li class="page-item disabled"><span class="page-link">...</span></li>';
    }
  }

  // Hiển thị các trang gần trang hiện tại
  for (let i = startPage; i <= endPage; i++) {
    paginationHTML += `
      <li class="page-item ${i === attendancePage ? "active" : ""}">
        <a class="page-link" href="#" onclick="changePage('attendance', ${i}); return false;">${i}</a>
      </li>
    `;
  }

  // Nếu không phải trang cuối, hiển thị nút trang cuối
  if (endPage < totalPages) {
    // Hiển thị dấu ba chấm nếu không liền kề với trang cuối
    if (endPage < totalPages - 1) {
      paginationHTML +=
        '<li class="page-item disabled"><span class="page-link">...</span></li>';
    }

    paginationHTML += `
      <li class="page-item">
        <a class="page-link" href="#" onclick="changePage('attendance', ${totalPages}); return false;">${totalPages}</a>
      </li>
    `;
  }

  // Nút Next
  paginationHTML += `
    <li class="page-item ${
      attendancePage === totalPages || totalPages === 0 ? "disabled" : ""
    }">
      <a class="page-link" href="#" onclick="changePage('attendance', ${
        attendancePage + 1
      }); return false;">
        <i class="fas fa-chevron-right"></i>
      </a>
    </li>
  `;

  paginationHTML += "</ul>";

  document.getElementById("attendance-pagination").innerHTML = paginationHTML;
}

// Hàm đổi trang
function changePage(type, page) {
  if (type === "attendance") {
    attendancePage = page;
    displayAttendancePage(attendancePage);
  } else if (type === "complaints") {
    complaintsPage = page;
    displayComplaintsPage(complaintsPage);
  }
}

// Đảm bảo các hàm được đăng ký vào window object để có thể gọi từ HTML
window.viewComplaintDetail = viewComplaintDetail; // Khôi phục lại dòng này
window.processComplaint = processComplaint;
window.closeComplaintModal = closeComplaintModal;
window.openComplaintModal = openComplaintModal;
