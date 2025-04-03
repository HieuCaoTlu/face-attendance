// Biến lưu trữ tham chiếu đến các biểu đồ
let lateChart = null;
let earlyChart = null;
let monthlyChart = null;

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
  if (!timeString || timeString === 'N/A') return 0;
  
  const [hours, minutes] = timeString.split(':').map(num => parseInt(num, 10));
  return hours * 60 + minutes;
}

// Xử lý tabs
document.addEventListener('DOMContentLoaded', function() {
  // Setup tabs
  setupTabs();
  
  // Thiết lập sự kiện
  setupEventHandlers();

  // QUẢN LÝ NHÂN VIÊN
  const employeeModal = document.getElementById('employeeModal');
  const employeeForm = document.getElementById('employee-form');
  const employeeList = document.getElementById('employee-list');
  
  // Đóng modal khi click ra ngoài
  employeeModal.addEventListener('click', (e) => {
    if (e.target === employeeModal) {
      employeeModal.style.display = 'none';
    }
  });
  
  // Đóng modal khi nhấn nút Hủy
  document.getElementById('cancel-employee-btn').addEventListener('click', () => {
    employeeModal.style.display = 'none';
  });
  
  // Xử lý form thêm/sửa nhân viên
  employeeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const employeeId = document.getElementById('employee-id').value;
    const name = document.getElementById('employee-name').value;
    const position = document.getElementById('employee-position').value;
    
    try {
      let response;
      
      if (!employeeId) {
        // Thêm mới nhân viên
        const formData = new FormData();
        formData.append('name', name);
        formData.append('position', position);
        
        response = await fetch('/api/employee', {
          method: 'POST',
          body: formData
        });
        
        const data = await response.json();
        
        if (data.employee_id) {
          // Chuyển hướng đến trang train để đăng ký khuôn mặt
          window.location.href = `/train?employee_id=${data.employee_id}&name=${encodeURIComponent(name)}`;
          return;
        }
      } else {
        // Cập nhật nhân viên
        const formData = new FormData();
        formData.append('name', name);
        formData.append('position', position);
        
        response = await fetch(`/api/employee/${employeeId}`, {
          method: 'PUT',
          body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
          // Cập nhật trực tiếp dòng trong bảng nếu thành công
          const row = document.querySelector(`#employee-list tr[data-id="${employeeId}"]`);
          if (row) {
            row.querySelector('.employee-name').textContent = name;
            row.querySelector('.employee-position').textContent = position;
            row.setAttribute('data-name', name.toLowerCase());
            row.setAttribute('data-position', position.toLowerCase());
            // Cập nhật data attributes cho nút sửa
            const editBtn = row.querySelector('.edit-btn');
            if (editBtn) {
              editBtn.dataset.name = name;
              editBtn.dataset.position = position;
            }
          } else {
            // Nếu không tìm thấy dòng, tải lại danh sách
            loadEmployees();
          }
          
          employeeModal.style.display = 'none';
          alert('Cập nhật thông tin nhân viên thành công!');
        } else {
          alert(data.message || 'Có lỗi xảy ra khi cập nhật nhân viên');
        }
      }
    } catch (error) {
      console.error('Lỗi:', error);
      alert('Có lỗi xảy ra khi xử lý yêu cầu');
    }
  });
  
  // Xử lý tìm kiếm nhân viên
  const searchEmployeeBtn = document.getElementById('search-employee-btn');
  const resetEmployeeFilterBtn = document.getElementById('reset-employee-filter-btn');
  
  searchEmployeeBtn.addEventListener('click', () => {
    filterEmployees();
  });
  
  resetEmployeeFilterBtn.addEventListener('click', () => {
    document.getElementById('employee-search').value = '';
    filterEmployees();
  });
  
  // Tìm kiếm khi nhấn Enter
  document.getElementById('employee-search').addEventListener('keyup', (e) => {
    if (e.key === 'Enter') filterEmployees();
  });
  
  // Xử lý xuất Excel danh sách nhân viên
  document.getElementById('export-employee-excel-btn').addEventListener('click', () => {
    exportToExcel('employee-list', 'Danh_sach_nhan_vien.xlsx');
  });
  
  // Load danh sách nhân viên từ API
  loadEmployees();

  // QUẢN LÝ CA LÀM VIỆC
  const shiftModal = document.getElementById('shiftModal');
  const shiftForm = document.getElementById('shift-form');
  const shiftsList = document.getElementById('shifts-list');
  
  // Mở modal thêm ca làm việc
  const addShiftBtn = document.getElementById('add-shift-btn');
  if (addShiftBtn) {
    addShiftBtn.addEventListener('click', () => {
      const shiftModalTitle = document.getElementById('shift-modal-title');
      if (shiftModalTitle) {
        shiftModalTitle.textContent = 'Thêm ca làm việc';
      }
      if (shiftForm) {
        shiftForm.reset();
      }
      const shiftId = document.getElementById('shift-id');
      if (shiftId) {
        shiftId.value = '';
      }
      if (shiftModal) {
        shiftModal.style.display = 'flex';
      }
    });
  }
  
  // Đóng modal khi click ra ngoài
  if (shiftModal) {
    shiftModal.addEventListener('click', (e) => {
      if (e.target === shiftModal) {
        shiftModal.style.display = 'none';
      }
    });
  }
  
  // Đóng modal khi nhấn nút Hủy
  const cancelShiftBtn = document.getElementById('cancel-shift-btn');
  if (cancelShiftBtn) {
    cancelShiftBtn.addEventListener('click', () => {
      if (shiftModal) {
        shiftModal.style.display = 'none';
      }
    });
  }
  
  // Xử lý form thêm/sửa ca làm việc
  if (shiftForm) {
    shiftForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const shiftId = document.getElementById('shift-id')?.value || '';
      const name = document.getElementById('shift-name')?.value || '';
      const checkIn = document.getElementById('shift-check-in')?.value || '';
      const checkOut = document.getElementById('shift-check-out')?.value || '';
      
      try {
        const formData = new FormData();
        formData.append('name', name);
        formData.append('checkin', checkIn);
        formData.append('checkout', checkOut);
        
        let response;
        
      if (!shiftId) {
          // Thêm mới ca làm việc
          response = await fetch('/api/shift', {
            method: 'POST',
            body: formData
          });
      } else {
          // Cập nhật ca làm việc
          response = await fetch(`/api/shift/${shiftId}`, {
            method: 'PUT',
            body: formData
          });
        }
        
        const data = await response.json();
        
        if (data.success) {
          // Tải lại danh sách ca làm việc
          loadShifts();
        shiftModal.style.display = 'none';
          alert('Thao tác thành công!');
        } else {
          alert(data.message || 'Có lỗi xảy ra khi thực hiện thao tác');
        }
      } catch (error) {
        console.error('Lỗi:', error);
        alert('Có lỗi xảy ra khi xử lý yêu cầu');
      }
    });
  }
  
  // Load danh sách ca làm việc từ API
  loadShifts();

  // QUẢN LÝ CHẤM CÔNG
  // Thiết lập ngày mặc định là ngày hôm nay
  const today = new Date();
  document.getElementById('attendance-date-from').valueAsDate = new Date(today.getFullYear(), today.getMonth(), 1); // Ngày đầu tháng
  document.getElementById('attendance-date-to').valueAsDate = today;
  
  // Xử lý tìm kiếm chấm công
  const searchAttendanceBtn = document.getElementById('search-attendance-btn');
  const resetAttendanceFilterBtn = document.getElementById('reset-attendance-filter-btn');
  
  searchAttendanceBtn.addEventListener('click', () => {
    filterAttendance();
  });
  
  resetAttendanceFilterBtn.addEventListener('click', () => {
    document.getElementById('attendance-search').value = '';
    document.getElementById('attendance-date-from').valueAsDate = new Date(today.getFullYear(), today.getMonth(), 1);
    document.getElementById('attendance-date-to').valueAsDate = today;
    document.getElementById('status-filter').value = 'all';
    document.getElementById('late-filter').value = 'all';
    document.getElementById('early-filter').value = 'all';
    document.getElementById('shift-count-filter').value = 'all';
    filterAttendance();
  });
  
  // Tìm kiếm khi nhấn Enter
  document.getElementById('attendance-search').addEventListener('keyup', (e) => {
    if (e.key === 'Enter') filterAttendance();
  });
  
  // Xử lý xuất Excel lịch sử chấm công
  document.getElementById('export-attendance-excel-btn').addEventListener('click', () => {
    exportToExcel('attendance-list', 'Lich_su_cham_cong.xlsx');
  });
  
  // Load dữ liệu chấm công
  loadAttendance();

  // QUẢN LÝ CA LÀM VIỆC
  const shiftsConfigForm = document.getElementById('shifts-config-form');
  const errorMessage = document.getElementById('shifts-error-message');
  
  // Xử lý sự kiện submit form cấu hình ca làm việc
  shiftsConfigForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Lấy giá trị từ form
    const shift1CheckIn = document.getElementById('shift1-check-in').value;
    const shift1CheckOut = document.getElementById('shift1-check-out').value;
    const shift2CheckIn = document.getElementById('shift2-check-in').value;
    const shift2CheckOut = document.getElementById('shift2-check-out').value;
    
    // Kiểm tra ca 1 và ca 2 có hợp lệ không
    if (!isValidShift(shift1CheckIn, shift1CheckOut)) {
      showError('Thời gian bắt đầu ca 1 phải trước thời gian kết thúc ca 1');
      return;
    }
    
    if (!isValidShift(shift2CheckIn, shift2CheckOut)) {
      showError('Thời gian bắt đầu ca 2 phải trước thời gian kết thúc ca 2');
      return;
    }
    
    // Kiểm tra thời gian giữa ca 1 và ca 2
    if (!isValidBreakBetweenShifts(shift1CheckOut, shift2CheckIn)) {
      showError('Thời gian giữa ca 1 và ca 2 phải cách nhau ít nhất 10 phút');
      return;
    }
    
    // Ẩn thông báo lỗi nếu không có lỗi
    hideError();
    
    // Hiển thị thông báo đang xử lý
    document.getElementById('save-shifts-btn').disabled = true;
    document.getElementById('save-shifts-btn').textContent = 'Đang lưu...';
    
    // Chuẩn bị dữ liệu để gửi API
    const config = {
      shift1: {
        checkIn: shift1CheckIn,
        checkOut: shift1CheckOut
      },
      shift2: {
        checkIn: shift2CheckIn,
        checkOut: shift2CheckOut
      }
    };
    
    // Gửi API cập nhật cấu hình ca làm việc
    const success = await updateShiftsConfig(config);
    
    // Cập nhật trạng thái nút
    document.getElementById('save-shifts-btn').disabled = false;
    document.getElementById('save-shifts-btn').textContent = 'Lưu cấu hình';
    
    if (success) {
      // Hiển thị thông báo thành công (đã được hiển thị trong hàm updateShiftsConfig)
      // Tự động reload lại dữ liệu chấm công để cập nhật với ca mới
      loadAttendance();
    }
  });
  
  // Cải thiện logic kiểm tra ca làm hợp lệ
  function isValidShift(checkIn, checkOut) {
    if (!checkIn || !checkOut) return false;
    
    const checkInTime = convertTimeToMinutes(checkIn);
    const checkOutTime = convertTimeToMinutes(checkOut);
    
    // Ca làm tối thiểu 30 phút
    return checkInTime < checkOutTime && (checkOutTime - checkInTime) >= 30;
  }
  
  // Hàm kiểm tra thời gian nghỉ giữa ca 1 và ca 2 (tối thiểu 10 phút)
  function isValidBreakBetweenShifts(shift1CheckOut, shift2CheckIn) {
    if (!shift1CheckOut || !shift2CheckIn) return false;
    
    const shift1EndTime = convertTimeToMinutes(shift1CheckOut);
    const shift2StartTime = convertTimeToMinutes(shift2CheckIn);
    
    // Khoảng cách tối thiểu là 10 phút
    return (shift2StartTime - shift1EndTime) >= 10;
  }
  
  // Thiết lập cấu hình ca làm việc mặc định
  function setDefaultShiftsConfig() {
    // Cập nhật biến toàn cục
    shiftsConfig = {
      shift1: {
        checkIn: '07:00',
        checkOut: '12:00'
      },
      shift2: {
        checkIn: '13:00',
        checkOut: '17:00'
      }
    };
    
    // Hiển thị cấu hình lên form
    document.getElementById('shift1-check-in').value = shiftsConfig.shift1.checkIn;
    document.getElementById('shift1-check-out').value = shiftsConfig.shift1.checkOut;
    document.getElementById('shift2-check-in').value = shiftsConfig.shift2.checkIn;
    document.getElementById('shift2-check-out').value = shiftsConfig.shift2.checkOut;
  }
});

// Thêm dòng nhân viên vào bảng
function appendEmployeeRow(id, name, position) {
  const row = document.createElement('tr');
  row.setAttribute('data-id', id);
  row.setAttribute('data-name', name.toLowerCase());
  row.setAttribute('data-position', position.toLowerCase());
  row.innerHTML = `
    <td>${id}</td>
    <td class="employee-name">${name}</td>
    <td class="employee-position">${position}</td>
    <td class="action-buttons">
      <button class="edit-btn" data-id="${id}" data-name="${name}" data-position="${position}">Sửa</button>
      <button class="delete-btn" data-id="${id}">Xóa</button>
    </td>
  `;
  
  document.getElementById('employee-list').appendChild(row);
}

// Thêm event listeners cho các nút trong bảng nhân viên bằng event delegation
document.getElementById('employee-list').addEventListener('click', function(e) {
  // Xử lý nút sửa
  if (e.target.classList.contains('edit-btn')) {
    const button = e.target;
    const id = button.dataset.id;
    const name = button.dataset.name;
    const position = button.dataset.position;
    
    document.getElementById('employee-modal-title').textContent = 'Sửa nhân viên';
    document.getElementById('employee-id').value = id;
    document.getElementById('employee-name').value = name;
    document.getElementById('employee-position').value = position;
    
    document.getElementById('employeeModal').style.display = 'flex';
  }
  
  // Xử lý nút xóa
  if (e.target.classList.contains('delete-btn')) {
    if (confirm('Bạn có chắc muốn xóa nhân viên này?')) {
      const button = e.target;
      const id = button.dataset.id;
      const row = button.closest('tr');
      
      try {
        fetch(`/api/employee/${id}`, {
          method: 'DELETE'
        })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            row.remove();
            alert('Xóa nhân viên thành công!');
          } else {
            alert(data.message || 'Có lỗi xảy ra khi xóa nhân viên');
          }
        })
        .catch(error => {
          console.error('Lỗi:', error);
          alert('Có lỗi xảy ra khi xử lý yêu cầu');
        });
      } catch (error) {
        console.error('Lỗi:', error);
        alert('Có lỗi xảy ra khi xử lý yêu cầu');
      }
    }
  }
});

// Lọc nhân viên theo các tiêu chí đã nhập
function filterEmployees() {
  const searchTerm = document.getElementById('employee-search').value.toLowerCase();
  
  const rows = document.querySelectorAll('#employee-list tr');
  
  rows.forEach(row => {
    if (!row.hasAttribute('data-id')) return; // Bỏ qua dòng không phải nhân viên
    
    const id = row.getAttribute('data-id').toLowerCase();
    const name = row.getAttribute('data-name');
    const position = row.getAttribute('data-position');
    
    const matchesSearch = 
      id.includes(searchTerm) || 
      name.includes(searchTerm) || 
      position.includes(searchTerm);
    
    // Hiển thị nếu phù hợp với tất cả các điều kiện lọc
    if (matchesSearch) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  });
}

// Thêm dòng ca làm việc vào bảng
function appendShiftRow(id, name, checkIn, checkOut, isActive) {
  const row = document.createElement('tr');
  row.innerHTML = `
    <td>${id}</td>
    <td>${name}</td>
    <td>${checkIn}</td>
    <td>${checkOut}</td>
    <td>${isActive ? 'Hoạt động' : 'Vô hiệu'}</td>
    <td class="action-buttons">
      <button class="edit-btn" data-id="${id}" data-name="${name}" 
        data-checkin="${checkIn}" data-checkout="${checkOut}" data-active="${isActive}">Sửa</button>
      <button class="delete-btn" data-id="${id}">Xóa</button>
    </td>
  `;
  
  document.getElementById('shifts-list').appendChild(row);
}

// Tải danh sách nhân viên
async function loadEmployees() {
  try {
    console.log('Đang tải danh sách nhân viên...');
    
    // Hiển thị thông báo đang tải
    document.getElementById('employee-list').innerHTML = 
      '<tr><td colspan="4" class="loading-message">Đang tải danh sách nhân viên...</td></tr>';
    
    // Gọi API để lấy danh sách nhân viên
    const response = await fetch('/api/employee');
    
    if (!response.ok) {
      throw new Error(`Lỗi khi gọi API: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Dữ liệu nhân viên:', data);
    
    // Hiển thị dữ liệu vào bảng
    const employeeList = document.getElementById('employee-list');
    employeeList.innerHTML = '';
    
    // Kiểm tra xem có dữ liệu không
    if (!data.employees || data.employees.length === 0) {
      employeeList.innerHTML = '<tr><td colspan="4" class="no-data">Không có nhân viên nào</td></tr>';
      return;
    }
    
    // Lưu dữ liệu vào biến toàn cục
      allEmployeesData = data.employees;
    
    // Hiển thị từng nhân viên
      data.employees.forEach(employee => {
      // Tạo dòng mới trong bảng
      const row = document.createElement('tr');
      row.setAttribute('data-id', employee.id);
      
      // Thêm nội dung vào dòng
      row.innerHTML = `
        <td>${employee.id}</td>
        <td class="employee-name">${employee.name}</td>
        <td class="employee-position">Đang tải...</td>
        <td class="action-buttons">
          <button class="edit-btn" data-id="${employee.id}" data-name="${employee.name}">Sửa</button>
          <button class="delete-btn" data-id="${employee.id}">Xóa</button>
        </td>
      `;
      
      // Thêm dòng vào bảng
      employeeList.appendChild(row);
      
      // Lấy chi tiết nhân viên và cập nhật vị trí
      fetch(`/api/employee/${employee.id}`)
        .then(response => response.json())
        .then(detailData => {
          if (detailData.success) {
            const position = detailData.position || 'Không có';
            const positionCell = row.querySelector('.employee-position');
            if (positionCell) {
              positionCell.textContent = position;
            }
            
            // Cập nhật nút sửa với thông tin đầy đủ
            const editButton = row.querySelector('.edit-btn');
            if (editButton) {
              editButton.setAttribute('data-position', position);
            }
          }
        })
        .catch(error => {
          console.error(`Lỗi khi lấy chi tiết nhân viên ${employee.id}:`, error);
          const positionCell = row.querySelector('.employee-position');
          if (positionCell) {
            positionCell.textContent = 'Không có';
          }
        });
    });
  } catch (error) {
    console.error('Lỗi khi tải danh sách nhân viên:', error);
    document.getElementById('employee-list').innerHTML = 
      '<tr><td colspan="4" class="error-message">Lỗi: ' + error.message + '</td></tr>';
  }
}

// Hàm lấy chi tiết một nhân viên và hiển thị
function loadEmployeeDetail(employee, employeeList) {
  fetch(`/api/employee/${employee.id}`)
    .then(response => response.json())
    .then(detailData => {
      if (detailData.success) {
        const position = detailData.position || 'Không có';
        
        // Tạo dòng mới trong bảng
        const row = document.createElement('tr');
        row.setAttribute('data-id', employee.id);
        row.setAttribute('data-name', employee.name.toLowerCase());
        row.setAttribute('data-position', position.toLowerCase());
        
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
    .catch(error => {
      console.error(`Lỗi khi lấy chi tiết nhân viên ${employee.id}:`, error);
      
      // Nếu không lấy được chi tiết, vẫn hiển thị thông tin cơ bản
      const row = document.createElement('tr');
      row.setAttribute('data-id', employee.id);
      row.setAttribute('data-name', employee.name.toLowerCase());
      
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
    const response = await fetch('/api/shift');
    const data = await response.json();
    
    const shiftsList = document.querySelector('#shifts-list');
      if (shiftsList) {
        shiftsList.innerHTML = '';
        
        if (data.shifts && data.shifts.length > 0) {
          data.shifts.forEach(shift => {
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
            shiftsList.innerHTML = '<tr><td colspan="5" class="no-data">Không có ca làm việc nào</td></tr>';
          }
        }
      }
      
      // Cập nhật cấu hình ca làm việc hiện tại
      updateCurrentShiftsDisplay();
  } catch (error) {
    console.error('Lỗi khi tải dữ liệu ca làm việc:', error);
    if (document.getElementById('shifts-list')) {
      document.getElementById('shifts-list').innerHTML = 
        '<tr><td colspan="5" class="error-message">Lỗi khi tải dữ liệu. Vui lòng thử lại sau.</td></tr>';
    }
  }
}

async function loadAttendance() {
  try {
    // Hiển thị thông báo đang tải
    document.getElementById('attendance-list').innerHTML = 
      '<tr><td colspan="10" class="loading-message">Đang tải dữ liệu chấm công...</td></tr>';
    
    // Lấy giá trị các bộ lọc
    const searchText = document.getElementById('attendance-search').value.trim();
    const fromDate = document.getElementById('attendance-date-from').value;
    const toDate = document.getElementById('attendance-date-to').value;
    
    // Tạo URL với tham số truy vấn
    let url = '/api/attendance';
    const params = new URLSearchParams();
    
    if (fromDate) params.append('from_date', fromDate);
    if (toDate) params.append('to_date', toDate);
    
    if (params.toString()) {
      url += '?' + params.toString();
    }
    
    const response = await fetch(url);
    const data = await response.json();
    
    // Xử lý dữ liệu trả về
    if (data && data.attendance && data.attendance.length > 0) {
      // Lưu dữ liệu API gốc
      apiAttendanceData = [...data.attendance];
      
      // Format dữ liệu
      allAttendanceData = formatAttendanceData(data.attendance);
      
      // Lọc dữ liệu nếu có các bộ lọc
      let filteredData = [...allAttendanceData];
      
      if (searchText) {
        filteredData = filteredData.filter(item => {
          return (item.id && item.id.toString().includes(searchText)) || 
                 (item.name && item.name.toLowerCase().includes(searchText.toLowerCase()));
        });
      }
      
      // Cập nhật dữ liệu hiện tại
      currentAttendanceData = filteredData;
      attendancePage = 1;
      displayAttendancePage(attendancePage);
      createAttendancePagination();
    } else {
      document.getElementById('attendance-list').innerHTML = 
        '<tr><td colspan="10" class="no-data">Không có dữ liệu chấm công</td></tr>';
      document.getElementById('attendance-pagination').innerHTML = '';
    }
  } catch (error) {
    console.error('Lỗi khi tải dữ liệu chấm công:', error);
    document.getElementById('attendance-list').innerHTML = 
      '<tr><td colspan="10" class="error-message">Lỗi khi tải dữ liệu. Vui lòng thử lại sau.</td></tr>';
    document.getElementById('attendance-pagination').innerHTML = '';
  }
}

async function loadStatisticsCharts() {
  try {
    // Lấy tháng và năm từ bộ lọc
    const selectedMonth = document.getElementById('stat-month-filter').value;
    const selectedYear = document.getElementById('stat-year-filter').value;
    
    console.log(`Đang tải biểu đồ thống kê cho tháng ${selectedMonth}/${selectedYear}`);
    
    // Đặt mặc định cho tháng hiện tại
    const currentDate = new Date();
    if (!document.getElementById('stat-month-filter').value) {
      document.getElementById('stat-month-filter').value = currentDate.getMonth() + 1;
    }
    if (!document.getElementById('stat-year-filter').value) {
      document.getElementById('stat-year-filter').value = currentDate.getFullYear();
    }
    
    // Hiển thị loading indicator
    document.getElementById('late-chart').innerHTML = '<div class="loading-spinner"></div>';
    document.getElementById('early-chart').innerHTML = '<div class="loading-spinner"></div>';
    document.getElementById('monthly-chart').innerHTML = '<div class="loading-spinner"></div>';
    
    // Lấy dữ liệu từ API với tháng/năm đã chọn
    const response = await fetch(`/api/attendance?month=${selectedMonth}&year=${selectedYear}`);
    
    if (!response.ok) {
      throw new Error(`Lỗi HTTP: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Xử lý dữ liệu
    let attendanceData = data.attendance || [];
    
    // Đảm bảo attendanceData luôn là một mảng
    if (!Array.isArray(attendanceData)) {
      console.warn('Dữ liệu chấm công không phải là mảng:', attendanceData);
      attendanceData = [];
    }
    
    if (attendanceData.length === 0) {
      document.getElementById('late-chart').innerHTML = '<div class="no-data-message">Không có dữ liệu cho khoảng thời gian đã chọn</div>';
      document.getElementById('early-chart').innerHTML = '<div class="no-data-message">Không có dữ liệu cho khoảng thời gian đã chọn</div>';
      document.getElementById('monthly-chart').innerHTML = '<div class="no-data-message">Không có dữ liệu cho khoảng thời gian đã chọn</div>';
      return;
    }
    
    // Tạo các biểu đồ
    const lateStats = processLateStatistics(attendanceData);
    createLateChart(lateStats);
    
    const earlyStats = processEarlyStatistics(attendanceData);
    createEarlyChart(earlyStats);
    
    const monthlyStats = processMonthlyStatistics(attendanceData);
    createMonthlyChart(monthlyStats);
    
  } catch (error) {
    console.error('Lỗi khi tải biểu đồ thống kê:', error);
    document.getElementById('late-chart').innerHTML = '<div class="error-message">Lỗi khi tải dữ liệu: ' + error.message + '</div>';
    document.getElementById('early-chart').innerHTML = '<div class="error-message">Lỗi khi tải dữ liệu: ' + error.message + '</div>';
    document.getElementById('monthly-chart').innerHTML = '<div class="error-message">Lỗi khi tải dữ liệu: ' + error.message + '</div>';
  }
}

// Hàm định dạng dữ liệu chấm công từ API để hiển thị
function formatAttendanceData(apiData) {
  // Khởi tạo mảng kết quả
  const result = [];
  
  // Nhóm các bản ghi chấm công theo nhân viên và ngày
  const groupedByEmployeeAndDate = {};
  
  // Bước 1: Nhóm tất cả các chấm công theo nhân viên và ngày, và thu thập tất cả các thời điểm chấm công
  apiData.forEach(item => {
    const key = `${item.employee_id}_${item.date}`;
    if (!groupedByEmployeeAndDate[key]) {
      groupedByEmployeeAndDate[key] = {
        id: item.employee_id,
        name: item.employee_name,
        date: item.date,
        allCheckTimes: [], // Lưu tất cả các thời điểm chấm công theo thứ tự
        shiftInfo: {} // Lưu thông tin ca theo id
      };
    }
    
    // Thêm thời điểm chấm công nếu có
    if (item.check_in_time) {
      groupedByEmployeeAndDate[key].allCheckTimes.push({
        time: item.check_in_time,
        type: 'in',
        shiftId: item.shift_id,
        expected: item.expected_check_in
      });
    }
    
    if (item.check_out_time) {
      groupedByEmployeeAndDate[key].allCheckTimes.push({
        time: item.check_out_time,
        type: 'out',
        shiftId: item.shift_id,
        expected: item.expected_check_out
      });
    }
    
    // Lưu thông tin ca
    if (!groupedByEmployeeAndDate[key].shiftInfo[item.shift_id]) {
      groupedByEmployeeAndDate[key].shiftInfo[item.shift_id] = {
        shiftId: item.shift_id,
        shiftName: item.shift_name,
        expectedCheckIn: item.expected_check_in,
        expectedCheckOut: item.expected_check_out
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
      checkIn1: 'N/A',
      checkOut1: 'N/A',
      checkIn2: 'N/A',
      checkOut2: 'N/A',
      lateMinutes: 0,
      earlyMinutes: 0,
      workHours: 0,
      shiftCount: 0, // Sẽ được tính sau khi đã xác định các ca
      note: 'Đúng giờ'
    };
    
    // Lấy thông tin ca từ record
    const shifts = Object.values(record.shiftInfo);
    
    // Sắp xếp ca theo thời gian bắt đầu
    shifts.sort((a, b) => {
      if (!a.expectedCheckIn) return 1;
      if (!b.expectedCheckIn) return -1;
      return convertTimeToMinutes(a.expectedCheckIn) - convertTimeToMinutes(b.expectedCheckIn);
    });
    
    // Phân loại các lần chấm công theo ca
    const shift1CheckTimes = [];
    const shift2CheckTimes = [];
    
    // Quy tắc mới: thời gian 00:00-12:00 thuộc ca 1, 13:00-23:59 thuộc ca 2
    record.allCheckTimes.forEach(checkTime => {
      const hourValue = parseInt(checkTime.time.split(':')[0]);
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
        attendanceRecord.checkOut1 = shift1CheckTimes[shift1CheckTimes.length - 1].time;
      }
      
      // Tính số phút đi muộn và về sớm cho ca 1
      if (shifts.length > 0 && shifts[0].expectedCheckIn) {
        const late = calculateLateMinutes(attendanceRecord.checkIn1, shifts[0].expectedCheckIn);
        attendanceRecord.lateMinutes += late;
      }
      
      if (attendanceRecord.checkOut1 !== 'N/A' && shifts.length > 0 && shifts[0].expectedCheckOut) {
        const early = calculateEarlyMinutes(attendanceRecord.checkOut1, shifts[0].expectedCheckOut);
        attendanceRecord.earlyMinutes += early;
      }
      
      // Nếu có đủ cả check in và check out cho ca 1, tăng số ca làm
      if (attendanceRecord.checkIn1 !== 'N/A' && attendanceRecord.checkOut1 !== 'N/A') {
        attendanceRecord.shiftCount++;
      }
    }
    
    // Xử lý dữ liệu cho ca 2
    if (shift2CheckTimes.length > 0) {
      // Check in cho ca 2 là lần chấm công đầu tiên của ca 2
      attendanceRecord.checkIn2 = shift2CheckTimes[0].time;
      
      // Check out cho ca 2 là lần chấm công cuối cùng của ca 2
      if (shift2CheckTimes.length > 1) {
        attendanceRecord.checkOut2 = shift2CheckTimes[shift2CheckTimes.length - 1].time;
      }
      
      // Tính số phút đi muộn và về sớm cho ca 2
      if (shifts.length > 1 && shifts[1].expectedCheckIn) {
        const late = calculateLateMinutes(attendanceRecord.checkIn2, shifts[1].expectedCheckIn);
        attendanceRecord.lateMinutes += late;
      }
      
      if (attendanceRecord.checkOut2 !== 'N/A' && shifts.length > 1 && shifts[1].expectedCheckOut) {
        const early = calculateEarlyMinutes(attendanceRecord.checkOut2, shifts[1].expectedCheckOut);
        attendanceRecord.earlyMinutes += early;
      }
      
      // Nếu có đủ cả check in và check out cho ca 2, tăng số ca làm
      if (attendanceRecord.checkIn2 !== 'N/A' && attendanceRecord.checkOut2 !== 'N/A') {
        attendanceRecord.shiftCount++;
      }
    }
    
    // Tính tổng số giờ làm việc, chỉ tính trong khoảng giờ quy định của mỗi ca
    attendanceRecord.workHours = calculateWorkHours(
      attendanceRecord.checkIn1, 
      attendanceRecord.checkOut1, 
      attendanceRecord.checkIn2, 
      attendanceRecord.checkOut2,
      shifts
    );
    
    // Xác định ghi chú dựa trên đi muộn và về sớm
    if (attendanceRecord.lateMinutes > 0 && attendanceRecord.earlyMinutes > 0) {
      attendanceRecord.note = 'Check in muộn & Check out sớm';
    } else if (attendanceRecord.lateMinutes > 0) {
      attendanceRecord.note = 'Check in muộn';
    } else if (attendanceRecord.earlyMinutes > 0) {
      attendanceRecord.note = 'Check out sớm';
    }
    
    // Kiểm tra nếu có bất kỳ bản ghi nào được đánh dấu là lỗi máy chấm công
    const hasError = apiData.some(item => 
      item.employee_id == record.id && 
      item.date === record.date && 
      item.error === true
    );
    
    if (hasError) {
      attendanceRecord.note = 'Máy chấm công lỗi';
    }
    
    result.push(attendanceRecord);
  }
  
  return result;
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
  if (checkIn1 !== 'N/A' && checkOut1 !== 'N/A') {
    let effectiveCheckIn = checkIn1;
    let effectiveCheckOut = checkOut1;
    
    // Đảm bảo thời gian check-in không sớm hơn thời gian bắt đầu ca
    if (convertTimeToMinutes(effectiveCheckIn) < convertTimeToMinutes(shift1Start)) {
      effectiveCheckIn = shift1Start;
    }
    
    // Đảm bảo thời gian check-out không muộn hơn thời gian kết thúc ca
    if (convertTimeToMinutes(effectiveCheckOut) > convertTimeToMinutes(shift1End)) {
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
  if (checkIn2 !== 'N/A' && checkOut2 !== 'N/A') {
    let effectiveCheckIn = checkIn2;
    let effectiveCheckOut = checkOut2;
    
    // Đảm bảo thời gian check-in không sớm hơn thời gian bắt đầu ca
    if (convertTimeToMinutes(effectiveCheckIn) < convertTimeToMinutes(shift2Start)) {
      effectiveCheckIn = shift2Start;
    }
    
    // Đảm bảo thời gian check-out không muộn hơn thời gian kết thúc ca
    if (convertTimeToMinutes(effectiveCheckOut) > convertTimeToMinutes(shift2End)) {
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
async function updateShiftsConfig() {
  try {
    // Lấy giá trị từ form
    const shift1Start = document.getElementById('shift1-start').value;
    const shift1End = document.getElementById('shift1-end').value;
    const shift2Start = document.getElementById('shift2-start').value;
    const shift2End = document.getElementById('shift2-end').value;
    
    // Kiểm tra dữ liệu hợp lệ
    if (!shift1Start || !shift1End || !shift2Start || !shift2End) {
      alert('Vui lòng nhập đầy đủ thời gian cho cả hai ca làm việc');
      return;
    }
    
    // Chuyển đổi sang đối tượng Date để so sánh
    const s1Start = new Date(`2000-01-01T${shift1Start}`);
    const s1End = new Date(`2000-01-01T${shift1End}`);
    const s2Start = new Date(`2000-01-01T${shift2Start}`);
    const s2End = new Date(`2000-01-01T${shift2End}`);
    
    // Kiểm tra thời gian check-in phải trước check-out
    if (s1Start >= s1End) {
      alert('Ca 1: Thời gian check-in phải trước thời gian check-out');
      return;
    }
    
    if (s2Start >= s2End) {
      alert('Ca 2: Thời gian check-in phải trước thời gian check-out');
      return;
    }
    
    // Kiểm tra giữa hai ca phải có khoảng nghỉ
    if (s1End >= s2Start) {
      alert('Thời gian giữa hai ca phải có khoảng nghỉ (ca 1 kết thúc phải trước ca 2 bắt đầu)');
      return;
    }
    
    // Chuẩn bị dữ liệu gửi lên server theo đúng định dạng API
    const newConfig = {
      shift1: {
        checkIn: shift1Start,
        checkOut: shift1End
      },
      shift2: {
        checkIn: shift2Start,
        checkOut: shift2End
      }
    };
    
    console.log('Cấu hình ca làm mới:', newConfig);
    
    // Hiển thị trạng thái đang lưu
    const saveButton = document.getElementById('save-shifts-btn');
    saveButton.textContent = 'Đang lưu...';
    saveButton.disabled = true;
    
    // Gọi API cập nhật
    const response = await fetch('/api/shift/config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newConfig)
    });
    
    if (!response.ok) {
      throw new Error(`API trả về lỗi: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('Kết quả cập nhật ca làm:', result);
    
    if (!result.success) {
      throw new Error(result.message || 'Cập nhật cấu hình ca làm việc thất bại');
    }
    
    // Cập nhật lại dữ liệu global
    shiftsConfig = newConfig;
    
    // Cập nhật hiển thị trong card
    const shift1StartEnd = `${shift1Start} - ${shift1End}`;
    const shift2StartEnd = `${shift2Start} - ${shift2End}`;
    
    const currentShift1 = document.getElementById('current-shift1');
    const currentShift2 = document.getElementById('current-shift2');
    const lastUpdatedTime = document.getElementById('last-updated-time');
    
    if (currentShift1) currentShift1.textContent = shift1StartEnd;
    if (currentShift2) currentShift2.textContent = shift2StartEnd;
    
    // Cập nhật thời gian hiển thị
    if (lastUpdatedTime) {
      const now = new Date();
      lastUpdatedTime.textContent = now.toLocaleString('vi-VN');
    }
    
    // Hiển thị thông báo thành công
    alert('Cập nhật cấu hình ca làm việc thành công!');
    
    return true;
  } catch (error) {
    console.error('Lỗi khi cập nhật cấu hình ca làm việc:', error);
    alert('Lỗi: ' + (error.message || 'Có lỗi xảy ra khi cập nhật cấu hình ca làm việc'));
    return false;
  } finally {
    // Khôi phục nút lưu
    const saveButton = document.getElementById('save-shifts-btn');
    saveButton.textContent = 'Lưu cấu hình';
    saveButton.disabled = false;
  }
}

// Tạo biểu đồ thống kê đi muộn
function createLateChart(attendanceData) {
  // Phân tích dữ liệu
  const lateStats = processLateStatistics(attendanceData);
  
  // Lấy canvas và context
  const canvas = document.getElementById('late-chart');
  if (!canvas) return;
  
  // Xóa biểu đồ cũ nếu có
  if (lateChart) {
    lateChart.destroy();
  }
  
  // Tạo biểu đồ mới
  lateChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: lateStats.labels,
      datasets: [{
        label: 'Số lần đi muộn',
        data: lateStats.data,
        backgroundColor: 'rgba(255, 99, 132, 0.7)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
            color: 'white'
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          }
        },
        x: {
          ticks: {
            color: 'white'
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          }
        }
      },
      plugins: {
        legend: {
          labels: {
            color: 'white'
          }
        },
        title: {
          display: true,
          text: 'Thống kê số lần đi muộn theo nhân viên',
          color: 'white',
          font: {
            size: 16
          }
        }
      }
    }
  });
}

// Tạo biểu đồ thống kê về sớm
function createEarlyChart(attendanceData) {
  // Phân tích dữ liệu
  const earlyStats = processEarlyStatistics(attendanceData);
  
  // Lấy canvas
  const canvas = document.getElementById('early-chart');
  if (!canvas) return;
  
  // Xóa biểu đồ cũ nếu có
  if (earlyChart) {
    earlyChart.destroy();
  }
  
  // Tạo biểu đồ mới
  earlyChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: earlyStats.labels,
      datasets: [{
        label: 'Số lần về sớm',
        data: earlyStats.data,
        backgroundColor: 'rgba(54, 162, 235, 0.7)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
            color: 'white'
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          }
        },
        x: {
          ticks: {
            color: 'white'
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          }
        }
      },
      plugins: {
        legend: {
          labels: {
            color: 'white'
          }
        },
        title: {
          display: true,
          text: 'Thống kê số lần về sớm theo nhân viên',
          color: 'white',
          font: {
            size: 16
          }
        }
      }
    }
  });
}

// Tạo biểu đồ thống kê giờ làm theo tháng
function createMonthlyChart(attendanceData) {
  // Phân tích dữ liệu
  const monthlyStats = processMonthlyStatistics(attendanceData);
  
  // Lấy canvas
  const canvas = document.getElementById('monthly-chart');
  if (!canvas) return;
  
  // Xóa biểu đồ cũ nếu có
  if (monthlyChart) {
    monthlyChart.destroy();
  }
  
  // Tạo biểu đồ mới
  monthlyChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels: monthlyStats.labels,
      datasets: monthlyStats.datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Số giờ làm việc',
            color: 'white'
          },
          ticks: {
            color: 'white'
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Ngày',
            color: 'white'
          },
          ticks: {
            color: 'white'
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          }
        }
      },
      plugins: {
        legend: {
          labels: {
            color: 'white'
          }
        },
        title: {
          display: true,
          text: 'Số giờ làm việc theo ngày',
          color: 'white',
          font: {
            size: 16
          }
        }
      }
    }
  });
}

// Hàm xử lý dữ liệu thống kê đi muộn
function processLateStatistics(attendanceData) {
  // Nhóm dữ liệu theo nhân viên
  const employeeMap = {};
  
  attendanceData.forEach(record => {
    if (!employeeMap[record.employee_name]) {
      employeeMap[record.employee_name] = 0;
    }
    
    // Kiểm tra nếu đi muộn
    if (record.check_in_time && record.expected_check_in && 
        convertTimeToMinutes(record.check_in_time) > convertTimeToMinutes(record.expected_check_in)) {
      employeeMap[record.employee_name]++;
    }
  });
  
  // Chuyển đổi sang định dạng cho biểu đồ
  const labels = Object.keys(employeeMap);
  const data = Object.values(employeeMap);
  
  return { labels, data };
}

// Hàm xử lý dữ liệu thống kê về sớm
function processEarlyStatistics(attendanceData) {
  // Nhóm dữ liệu theo nhân viên
  const employeeMap = {};
  
  attendanceData.forEach(record => {
    if (!employeeMap[record.employee_name]) {
      employeeMap[record.employee_name] = 0;
    }
    
    // Kiểm tra nếu về sớm
    if (record.check_out_time && record.expected_check_out && 
        convertTimeToMinutes(record.check_out_time) < convertTimeToMinutes(record.expected_check_out)) {
      employeeMap[record.employee_name]++;
    }
  });
  
  // Chuyển đổi sang định dạng cho biểu đồ
  const labels = Object.keys(employeeMap);
  const data = Object.values(employeeMap);
  
  return { labels, data };
}

// Hàm xử lý dữ liệu thống kê giờ làm theo tháng
function processMonthlyStatistics(attendanceData) {
  // Nhóm dữ liệu theo ngày và nhân viên
  const dailyMap = {};
  const employeeSet = new Set();
  
  attendanceData.forEach(record => {
    const employeeName = record.employee_name;
    employeeSet.add(employeeName);
    
    if (!dailyMap[record.date]) {
      dailyMap[record.date] = {};
    }
    
    if (!dailyMap[record.date][employeeName]) {
      dailyMap[record.date][employeeName] = 0;
    }
    
    // Tính tổng số giờ làm trong ngày
    let workHours = 0;
    
    // Ca 1
    if (record.check_in_time && record.check_out_time) {
      const checkInMinutes = convertTimeToMinutes(record.check_in_time);
      const checkOutMinutes = convertTimeToMinutes(record.check_out_time);
      
      if (checkOutMinutes > checkInMinutes) {
        workHours += (checkOutMinutes - checkInMinutes) / 60;
      }
    }
    
    dailyMap[record.date][employeeName] += workHours;
  });
  
  // Sắp xếp ngày theo thứ tự tăng dần
  const sortedDates = Object.keys(dailyMap).sort((a, b) => {
    const dateA = new Date(a.split('/').reverse().join('-'));
    const dateB = new Date(b.split('/').reverse().join('-'));
    return dateA - dateB;
  });
  
  // Tạo dataset cho mỗi nhân viên
  const employees = Array.from(employeeSet);
  const datasets = employees.map((employee, index) => {
    // Tạo màu ngẫu nhiên cho mỗi nhân viên
    const hue = (index * 137) % 360; // Đảm bảo màu đa dạng
    const color = `hsl(${hue}, 70%, 60%)`;
    
    return {
      label: employee,
      data: sortedDates.map(date => dailyMap[date][employee] || 0),
      backgroundColor: color,
      borderColor: color,
      borderWidth: 2,
      tension: 0.2
    };
  });
  
  return {
    labels: sortedDates,
    datasets: datasets
  };
}

// Tạo các biểu đồ mẫu khi không có dữ liệu thực
function createDemoCharts() {
  // Biểu đồ đi muộn
  if (!lateChart) {
    const lateCanvas = document.getElementById('late-chart');
    if (lateCanvas) {
      lateChart = new Chart(lateCanvas, {
        type: 'bar',
        data: {
          labels: ['Nguyễn Văn A', 'Trần Thị B', 'Lê Văn C', 'Phạm Thị D', 'Hoàng Văn E'],
          datasets: [{
            label: 'Số lần đi muộn',
            data: [2, 1, 4, 0, 3],
            backgroundColor: 'rgba(255, 99, 132, 0.7)',
            borderColor: 'rgba(255, 99, 132, 1)',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                stepSize: 1,
                color: 'white'
              },
              grid: {
                color: 'rgba(255, 255, 255, 0.1)'
              }
            },
            x: {
              ticks: {
                color: 'white'
              },
              grid: {
                color: 'rgba(255, 255, 255, 0.1)'
              }
            }
          },
          plugins: {
            legend: {
              labels: {
                color: 'white'
              }
            },
            title: {
              display: true,
              text: 'Thống kê số lần đi muộn theo nhân viên (Demo)',
              color: 'white',
              font: {
                size: 16
              }
            }
          }
        }
      });
    }
  }
  
  // Biểu đồ về sớm
  if (!earlyChart) {
    const earlyCanvas = document.getElementById('early-chart');
    if (earlyCanvas) {
      earlyChart = new Chart(earlyCanvas, {
        type: 'bar',
        data: {
          labels: ['Nguyễn Văn A', 'Trần Thị B', 'Lê Văn C', 'Phạm Thị D', 'Hoàng Văn E'],
          datasets: [{
            label: 'Số lần về sớm',
            data: [1, 3, 2, 0, 4],
            backgroundColor: 'rgba(54, 162, 235, 0.7)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                stepSize: 1,
                color: 'white'
              },
              grid: {
                color: 'rgba(255, 255, 255, 0.1)'
              }
            },
            x: {
              ticks: {
                color: 'white'
              },
              grid: {
                color: 'rgba(255, 255, 255, 0.1)'
              }
            }
          },
          plugins: {
            legend: {
              labels: {
                color: 'white'
              }
            },
            title: {
              display: true,
              text: 'Thống kê số lần về sớm theo nhân viên (Demo)',
              color: 'white',
              font: {
                size: 16
              }
            }
          }
        }
      });
    }
  }
  
  // Biểu đồ giờ làm theo tháng
  if (!monthlyChart) {
    const monthlyCanvas = document.getElementById('monthly-chart');
    if (monthlyCanvas) {
      monthlyChart = new Chart(monthlyCanvas, {
        type: 'line',
        data: {
          labels: ['01/06/2023', '02/06/2023', '05/06/2023', '06/06/2023', '07/06/2023', '08/06/2023', '09/06/2023', '12/06/2023', '13/06/2023', '14/06/2023', '15/06/2023'],
          datasets: [
            {
              label: 'Nguyễn Văn A',
              data: [8, 8, 8, 7.5, 8, 8, 8, 8, 8, 7, 8],
              backgroundColor: 'rgba(255, 99, 132, 0.5)',
              borderColor: 'rgba(255, 99, 132, 1)',
              borderWidth: 2,
              tension: 0.2
            },
            {
              label: 'Trần Thị B',
              data: [7, 8, 7.5, 8, 6, 8, 7, 8, 8, 8, 7.5],
              backgroundColor: 'rgba(54, 162, 235, 0.5)',
              borderColor: 'rgba(54, 162, 235, 1)',
              borderWidth: 2,
              tension: 0.2
            },
            {
              label: 'Lê Văn C',
              data: [7.5, 8, 8, 8, 8, 7, 6.5, 8, 7, 8, 7],
              backgroundColor: 'rgba(255, 206, 86, 0.5)',
              borderColor: 'rgba(255, 206, 86, 1)',
              borderWidth: 2,
              tension: 0.2
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Số giờ làm việc',
                color: 'white'
              },
              ticks: {
                color: 'white'
              },
              grid: {
                color: 'rgba(255, 255, 255, 0.1)'
              }
            },
            x: {
              title: {
                display: true,
                text: 'Ngày',
                color: 'white'
              },
              ticks: {
                color: 'white'
              },
              grid: {
                color: 'rgba(255, 255, 255, 0.1)'
              }
            }
          },
          plugins: {
            legend: {
              labels: {
                color: 'white'
              }
            },
            title: {
              display: true,
              text: 'Số giờ làm việc theo ngày (Demo)',
              color: 'white',
              font: {
                size: 16
              }
            }
          }
        }
      });
    }
  }
}

// Hàm cập nhật thông tin tổng hợp điểm danh
function updateAttendanceSummary(attendanceData) {
  try {
    // Lấy ngày hiện tại để lọc các dữ liệu của ngày hôm nay
    const today = new Date();
    const formattedToday = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
    
    // Lấy tổng số nhân viên
    fetch('/api/employees')
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          document.getElementById('total-employees').textContent = data.employees.length;
          
          // Tính toán các thông số cho ngày hôm nay
          const todayAttendance = attendanceData.filter(record => record.date === formattedToday);
          const uniqueEmployees = new Set(todayAttendance.map(record => record.employee_id));
          
          // Số nhân viên có mặt hôm nay
          document.getElementById('present-today').textContent = uniqueEmployees.size;
          
          // Số nhân viên vắng mặt hôm nay
          document.getElementById('absent-today').textContent = data.employees.length - uniqueEmployees.size;
          
          // Số nhân viên đi muộn hôm nay
          const lateToday = todayAttendance.filter(record => 
            record.check_in_time && record.expected_check_in && 
            convertTimeToMinutes(record.check_in_time) > convertTimeToMinutes(record.expected_check_in)
          ).length;
          document.getElementById('late-today').textContent = lateToday;
          
          // Số nhân viên về sớm hôm nay
          const earlyToday = todayAttendance.filter(record => 
            record.check_out_time && record.expected_check_out && 
            convertTimeToMinutes(record.check_out_time) < convertTimeToMinutes(record.expected_check_out)
          ).length;
          document.getElementById('early-today').textContent = earlyToday;
        }
      })
      .catch(error => {
        console.error('Lỗi khi lấy danh sách nhân viên:', error);
      });
  } catch (error) {
    console.error('Lỗi khi cập nhật thông tin tổng hợp:', error);
  }
}

// Khởi tạo trang khi tải xong DOM
document.addEventListener('DOMContentLoaded', function() {
  // Khởi tạo các tab
  setupTabs();
  
  // Khởi tạo các sự kiện
  setupEventHandlers();
  
  // Tải dữ liệu ban đầu
  getShiftsConfig();
  loadEmployees();
  loadAttendance();
  loadComplaints();
});

// Thiết lập xử lý sự kiện
function setupEventHandlers() {
  // Xử lý form cấu hình ca làm việc
  const shiftsConfigForm = document.getElementById('shifts-config-form');
  if (shiftsConfigForm) {
    shiftsConfigForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      // Lấy giá trị từ form
      const shift1CheckIn = document.getElementById('shift1-check-in').value;
      const shift1CheckOut = document.getElementById('shift1-check-out').value;
      const shift2CheckIn = document.getElementById('shift2-check-in').value;
      const shift2CheckOut = document.getElementById('shift2-check-out').value;
      
      // Kiểm tra ca 1 và ca 2 có hợp lệ không
      if (!isValidShift(shift1CheckIn, shift1CheckOut)) {
        showError('Thời gian bắt đầu ca 1 phải trước thời gian kết thúc ca 1');
        return;
      }
      
      if (!isValidShift(shift2CheckIn, shift2CheckOut)) {
        showError('Thời gian bắt đầu ca 2 phải trước thời gian kết thúc ca 2');
        return;
      }
      
      // Kiểm tra thời gian giữa ca 1 và ca 2
      if (!isValidBreakBetweenShifts(shift1CheckOut, shift2CheckIn)) {
        showError('Thời gian giữa ca 1 và ca 2 phải cách nhau ít nhất 10 phút');
        return;
      }
      
      // Ẩn thông báo lỗi nếu không có lỗi
      hideError();
      
      // Hiển thị thông báo đang xử lý
      document.getElementById('save-shifts-btn').disabled = true;
      document.getElementById('save-shifts-btn').textContent = 'Đang lưu...';
      
      // Chuẩn bị dữ liệu để gửi API
      const config = {
        shift1: {
          checkIn: shift1CheckIn,
          checkOut: shift1CheckOut
        },
        shift2: {
          checkIn: shift2CheckIn,
          checkOut: shift2CheckOut
        }
      };
      
      // Gửi API cập nhật cấu hình ca làm việc
      const success = await updateShiftsConfig(config);
      
      // Cập nhật trạng thái nút
      document.getElementById('save-shifts-btn').disabled = false;
      document.getElementById('save-shifts-btn').textContent = 'Lưu cấu hình';
      
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
  
  const resetComplaintsFilterBtn = document.getElementById("reset-complaints-filter-btn");
  if (resetComplaintsFilterBtn) {
    resetComplaintsFilterBtn.addEventListener("click", resetComplaintsFilter);
  }
  
  // Thêm sự kiện Enter để tìm kiếm
  const complaintsSearch = document.getElementById("complaints-search");
  if (complaintsSearch) {
    complaintsSearch.addEventListener("keyup", function(event) {
      if (event.key === "Enter") {
        filterComplaints();
      }
    });
  }
  
  // Xử lý đóng modal chi tiết khiếu nại
  const closeComplaintDetail = document.getElementById("close-complaint-detail");
  if (closeComplaintDetail) {
    closeComplaintDetail.addEventListener("click", () => {
      const modal = document.getElementById("complaint-detail-modal");
      if (modal) {
        modal.style.display = "none";
      }
    });
  }
  
  // Xử lý click ra ngoài modal để đóng
  const complaintDetailModal = document.getElementById("complaint-detail-modal");
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
    approveComplaint.addEventListener("click", () => processComplaint('approve'));
  }
  
  // Xử lý nút không duyệt khiếu nại
  const rejectComplaint = document.getElementById("reject-complaint");
  if (rejectComplaint) {
    rejectComplaint.addEventListener("click", () => processComplaint('reject'));
  }
}

// Tải dữ liệu khiếu nại
async function loadComplaints() {
  try {
    console.log('Đang tải danh sách khiếu nại...');
    
    // Hiển thị thông báo đang tải
    document.getElementById('complaints-list').innerHTML = 
      '<tr><td colspan="6" class="loading-message">Đang tải danh sách khiếu nại...</td></tr>';
    
    // Lấy dữ liệu từ API
    const response = await fetch('/api/complaint');
    console.log('API response status:', response.status);
    
    if (!response.ok) {
      throw new Error(`API trả về lỗi: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Dữ liệu khiếu nại nhận được:', data);
    
    // Kiểm tra và xử lý dữ liệu
    if (data && data.success) {
      // Lưu dữ liệu API gốc (dù có trống hay không)
      allComplaintsData = data.complaints || [];
      console.log('Số lượng khiếu nại nhận được:', allComplaintsData.length);
      
      // Hiển thị thông báo nếu không có dữ liệu
      if (allComplaintsData.length === 0) {
        document.getElementById('complaints-list').innerHTML = 
          '<tr><td colspan="6" class="no-data">Không có khiếu nại nào</td></tr>';
    document.getElementById('complaints-pagination').innerHTML = '';
    return;
  }
  
      // Lấy giá trị các bộ lọc
      const searchText = document.getElementById('complaint-search')?.value?.trim() || '';
      const statusFilter = document.getElementById('complaint-status-filter')?.value || 'all';
      const reasonFilter = document.getElementById('complaint-reason-filter')?.value || 'all';
      
      console.log('Bộ lọc áp dụng:', { searchText, statusFilter, reasonFilter });
      
      // Lọc dữ liệu
      let filteredData = [...allComplaintsData];
      console.log('Dữ liệu trước khi lọc:', filteredData.length);
      
      if (searchText) {
        filteredData = filteredData.filter(item => {
          const matchId = item.id && item.id.toString().includes(searchText);
          const matchName = item.employee_name && item.employee_name.toLowerCase().includes(searchText.toLowerCase());
          return matchId || matchName;
        });
        console.log('Số lượng sau khi lọc theo text:', filteredData.length);
      }
      
      if (statusFilter !== 'all') {
        filteredData = filteredData.filter(item => {
          if (statusFilter === 'pending') return !item.processed;
          if (statusFilter === 'approved') return item.processed && item.status === 'Đã duyệt';
          if (statusFilter === 'rejected') return item.processed && item.status === 'Không duyệt';
          return true;
        });
        console.log('Số lượng sau khi lọc theo status:', filteredData.length);
      }
      
      if (reasonFilter !== 'all') {
        filteredData = filteredData.filter(item => {
          return item.reason === reasonFilter;
        });
        console.log('Số lượng sau khi lọc theo reason:', filteredData.length);
      }
      
      // Cập nhật dữ liệu hiện tại
      currentComplaintsData = filteredData;
    complaintsPage = 1;
      
      console.log('Dữ liệu khiếu nại sẽ hiển thị:', currentComplaintsData.length);
      
      // Hiển thị dữ liệu
  displayComplaintsPage(complaintsPage);
      createComplaintsPagination();
        } else {
      // Xử lý trường hợp API thành công nhưng có lỗi từ server
      console.error('API trả về lỗi:', data.message || 'Không có thông báo lỗi');
      document.getElementById('complaints-list').innerHTML = 
        '<tr><td colspan="6" class="error-message">Lỗi khi tải dữ liệu: ' + (data.message || 'Không rõ lỗi') + '</td></tr>';
      document.getElementById('complaints-pagination').innerHTML = '';
    }
  } catch (error) {
    console.error('Lỗi khi tải dữ liệu khiếu nại:', error);
    document.getElementById('complaints-list').innerHTML = 
      '<tr><td colspan="6" class="error-message">Lỗi khi tải dữ liệu: ' + error.message + '</td></tr>';
    document.getElementById('complaints-pagination').innerHTML = '';
  }
}

// Hiển thị một trang của danh sách khiếu nại
function displayComplaintsPage(page) {
  try {
    // Tính toán index bắt đầu và kết thúc
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const displayData = currentComplaintsData.slice(startIndex, endIndex);
    
    console.log(`Hiển thị từ ${startIndex} đến ${endIndex}, tổng số ${currentComplaintsData.length} mục`);
    
    const complaintsList = document.getElementById('complaints-list');
    complaintsList.innerHTML = '';
    
    if (!displayData || displayData.length === 0) {
      complaintsList.innerHTML = '<tr><td colspan="7" class="no-data">Không có khiếu nại nào phù hợp với bộ lọc</td></tr>';
      return;
    }
    
    // Hiển thị dữ liệu
    displayData.forEach(complaint => {
      console.log('Đang hiển thị khiếu nại:', complaint);
      
      // Xác định trạng thái và lớp CSS tương ứng
      let statusText, statusClass;
      if (!complaint.processed) {
        statusText = 'Chờ duyệt';
        statusClass = 'pending';
      } else if (complaint.status === 'Đã duyệt') {
        statusText = 'Đã duyệt';
        statusClass = 'approved';
      } else {
        statusText = 'Không duyệt';
        statusClass = 'rejected';
      }
      
      // Format ngày tháng
      let formattedDate = '';
      try {
        // Nếu complaint_date là định dạng DD-MM-YYYY
        if (complaint.complaint_date && complaint.complaint_date.includes('-')) {
          const parts = complaint.complaint_date.split('-');
          // Kiểm tra xem có phải định dạng DD-MM-YYYY không
          if (parts.length === 3 && parts[0].length <= 2) {
            // Chuyển thành MM/DD/YYYY cho đối tượng Date
            const date = new Date(`${parts[1]}/${parts[0]}/${parts[2]}`);
            formattedDate = date.toLocaleDateString('vi-VN');
          } else {
            // Nếu là định dạng YYYY-MM-DD
            const date = new Date(complaint.complaint_date);
            formattedDate = date.toLocaleDateString('vi-VN');
          }
        } else {
          // Nếu là định dạng khác, thử chuyển đổi trực tiếp
          const date = new Date(complaint.complaint_date);
          formattedDate = date.toLocaleDateString('vi-VN');
        }
      } catch (e) {
        console.error('Lỗi khi format ngày tháng:', e);
        formattedDate = complaint.complaint_date || 'Không rõ';
      }
      
      const row = document.createElement('tr');
      row.setAttribute('data-id', complaint.id);
      row.innerHTML = `
        <td>${complaint.id}</td>
        <td>${complaint.employee_name || 'Không rõ'}</td>
        <td>${formattedDate}</td>
        <td>${complaint.reason || 'Không rõ'}</td>
        <td class="status ${statusClass}">${statusText}</td>
        <td>
          <button class="btn btn-view" onclick="viewComplaintDetail(${complaint.id})">Xem chi tiết</button>
        </td>
      `;
      
      complaintsList.appendChild(row);
    });
    
    // Cập nhật số lượng hiển thị
    const countElement = document.getElementById('complaints-count');
    if (countElement) {
      countElement.textContent = `Hiển thị ${displayData.length} / ${currentComplaintsData.length} khiếu nại`;
    }
  } catch (error) {
    console.error('Lỗi khi hiển thị trang khiếu nại:', error);
    const complaintsList = document.getElementById('complaints-list');
    if (complaintsList) {
      complaintsList.innerHTML = '<tr><td colspan="7" class="error-message">Lỗi khi hiển thị dữ liệu: ' + error.message + '</td></tr>';
    }
  }
}

// Tạo phân trang cho danh sách khiếu nại
function createComplaintsPagination() {
  const totalPages = Math.ceil(currentComplaintsData.length / itemsPerPage);
  const paginationContainer = document.getElementById('complaints-pagination');
  paginationContainer.innerHTML = '';
  
  if (totalPages <= 1) {
    return;
  }
  
  // Tạo nút previous
  if (complaintsPage > 1) {
    const prevButton = document.createElement('button');
    prevButton.textContent = 'Trước';
    prevButton.className = 'pagination-btn';
    prevButton.addEventListener('click', () => {
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
    const pageButton = document.createElement('button');
    pageButton.textContent = i;
    pageButton.className = 'pagination-btn';
    if (i === complaintsPage) {
      pageButton.classList.add('active');
    }
    
    pageButton.addEventListener('click', () => {
      complaintsPage = i;
      displayComplaintsPage(complaintsPage);
      createComplaintsPagination();
    });
    
    paginationContainer.appendChild(pageButton);
  }
  
  // Tạo nút next
  if (complaintsPage < totalPages) {
    const nextButton = document.createElement('button');
    nextButton.textContent = 'Sau';
    nextButton.className = 'pagination-btn';
    nextButton.addEventListener('click', () => {
      complaintsPage++;
      displayComplaintsPage(complaintsPage);
      createComplaintsPagination();
    });
    paginationContainer.appendChild(nextButton);
  }
}

// Hàm hiển thị thông báo lỗi
function showError(message) {
  const errorMessage = document.getElementById('shifts-error-message');
  if (errorMessage) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
  }
}

// Hàm ẩn thông báo lỗi
function hideError() {
  const errorMessage = document.getElementById('shifts-error-message');
  if (errorMessage) {
    errorMessage.textContent = '';
    errorMessage.style.display = 'none';
  }
}

// Thêm sự kiện cho nút áp dụng bộ lọc thống kê
document.addEventListener('DOMContentLoaded', function() {
  // Đặt giá trị mặc định cho bộ lọc là tháng và năm hiện tại
  const currentDate = new Date();
  if (document.getElementById('stat-month-filter')) {
    document.getElementById('stat-month-filter').value = currentDate.getMonth() + 1;
  }
  if (document.getElementById('stat-year-filter')) {
    document.getElementById('stat-year-filter').value = currentDate.getFullYear();
  }
  
  // Thêm sự kiện cho nút áp dụng
  const applyButton = document.getElementById('apply-stat-filter');
  if (applyButton) {
    applyButton.addEventListener('click', function() {
      loadStatisticsCharts();
    });
  }
  
  // Tải biểu đồ khi chuyển đến tab thống kê
  const statisticsTab = document.querySelector('.tab[data-tab="statistics"]');
  if (statisticsTab) {
    statisticsTab.addEventListener('click', function() {
      setTimeout(() => {
        loadStatisticsCharts();
      }, 300);
    });
  }
});

// Hàm kiểm tra và tạo modal chi tiết khiếu nại nếu cần
function ensureComplaintModalExists() {
  let modalElement = document.getElementById('complaint-detail-modal');
  
  if (!modalElement) {
    console.log('Modal chi tiết khiếu nại không tồn tại, đang tạo mới...');
    
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    
    modalElement = document.createElement('div');
    modalElement.id = 'complaint-detail-modal';
    modalElement.className = 'modal';
    
    // Header
    const modalHeader = document.createElement('div');
    modalHeader.className = 'modal-header';
    
    const modalTitle = document.createElement('h2');
    modalTitle.textContent = 'Chi tiết khiếu nại';
    
    const closeButton = document.createElement('span');
    closeButton.className = 'close-modal';
    closeButton.id = 'close-complaint-detail';
    closeButton.innerHTML = '&times;';
    
    modalHeader.appendChild(modalTitle);
    modalHeader.appendChild(closeButton);
    
    // Body
    const modalBody = document.createElement('div');
    modalBody.className = 'modal-body';
    
    // Tạo các phần tử thông tin
    const createDetailItem = (label, id) => {
      const p = document.createElement('p');
      const strong = document.createElement('strong');
      strong.textContent = label;
      const span = document.createElement('span');
      span.id = id;
      
      p.appendChild(strong);
      p.appendChild(document.createTextNode(': '));
      p.appendChild(span);
      
      return p;
    };
    
    // Thêm các phần tử thông tin
    modalBody.appendChild(createDetailItem('Mã nhân viên', 'detail-employee-id'));
    modalBody.appendChild(createDetailItem('Tên nhân viên', 'detail-employee-name'));
    modalBody.appendChild(createDetailItem('Ngày khiếu nại', 'detail-complaint-date'));
    modalBody.appendChild(createDetailItem('Giờ khiếu nại', 'detail-complaint-time'));
    modalBody.appendChild(createDetailItem('Lý do', 'detail-reason'));
    modalBody.appendChild(createDetailItem('Trạng thái', 'detail-status'));
    
    // Container ảnh
    const imageContainer = document.createElement('div');
    imageContainer.className = 'complaint-image-container';
    
    const image = document.createElement('img');
    image.id = 'detail-complaint-image';
    image.alt = 'Ảnh khiếu nại';
    image.style.display = 'none';
    
    imageContainer.appendChild(image);
    modalBody.appendChild(imageContainer);
    
    // Footer
    const modalFooter = document.createElement('div');
    modalFooter.className = 'modal-footer';
    
    const actionButtons = document.createElement('div');
    actionButtons.className = 'complaint-actions';
    
    // Nút duyệt
    const approveButton = document.createElement('button');
    approveButton.id = 'approve-complaint';
    approveButton.className = 'approve-btn';
    approveButton.innerHTML = '<i class="fas fa-check"></i> Duyệt khiếu nại';
    
    // Nút từ chối
    const rejectButton = document.createElement('button');
    rejectButton.id = 'reject-complaint';
    rejectButton.className = 'reject-btn';
    rejectButton.innerHTML = '<i class="fas fa-times"></i> Không duyệt';
    
    actionButtons.appendChild(approveButton);
    actionButtons.appendChild(rejectButton);
    modalFooter.appendChild(actionButtons);
    
    // Ghép các phần lại
    modalContent.appendChild(modalHeader);
    modalContent.appendChild(modalBody);
    modalContent.appendChild(modalFooter);
    modalElement.appendChild(modalContent);
    
    // Thêm event listeners
    closeButton.addEventListener('click', () => {
      modalElement.style.display = 'none';
      document.body.classList.remove('modal-open');
    });
    
    modalElement.addEventListener('click', (e) => {
      if (e.target === modalElement) {
        modalElement.style.display = 'none';
        document.body.classList.remove('modal-open');
      }
    });
    
    approveButton.addEventListener('click', () => processComplaint('approve'));
    rejectButton.addEventListener('click', () => processComplaint('reject'));
    
    document.body.appendChild(modalElement);
  }
  
  return modalElement;
}

// Xem chi tiết khiếu nại
async function viewComplaintDetail(complaintId) {
  try {
    console.log('Xem chi tiết khiếu nại ID:', complaintId);
    
    // Lưu ID khiếu nại đang xem
    currentComplaintId = complaintId;
    
    // Tìm thông tin khiếu nại
    const complaint = allComplaintsData.find(item => item.id == complaintId);
    
    if (!complaint) {
      throw new Error('Không tìm thấy thông tin khiếu nại');
    }
    
    // Kiểm tra xem modal đã tồn tại chưa
    let modal = document.getElementById('complaint-detail-modal');
    
    // Nếu modal chưa tồn tại, tạo mới
    if (!modal) {
      console.log('Tạo modal chi tiết khiếu nại');
      
      // Tạo phần tử modal
      modal = document.createElement('div');
      modal.id = 'complaint-detail-modal';
      modal.className = 'modal';
      
      // Tạo nội dung modal
      const modalContent = document.createElement('div');
      modalContent.className = 'modal-content';
      
      // Tạo nội dung HTML cho modal
      modalContent.innerHTML = `
        <span class="close" id="close-complaint-modal">&times;</span>
        <h2>Chi tiết khiếu nại</h2>
        
        <div class="modal-body">
          <div class="detail-row">
            <div class="detail-label">Mã nhân viên:</div>
            <div class="detail-value" id="detail-employee-id"></div>
          </div>
          
          <div class="detail-row">
            <div class="detail-label">Tên nhân viên:</div>
            <div class="detail-value" id="detail-employee-name"></div>
          </div>
          
          <div class="detail-row">
            <div class="detail-label">Ngày khiếu nại:</div>
            <div class="detail-value" id="detail-complaint-date"></div>
          </div>
          
          <div class="detail-row">
            <div class="detail-label">Thời gian:</div>
            <div class="detail-value" id="detail-complaint-time"></div>
          </div>
          
          <div class="detail-row">
            <div class="detail-label">Lý do:</div>
            <div class="detail-value" id="detail-reason"></div>
          </div>
          
          <div class="detail-row">
            <div class="detail-label">Trạng thái:</div>
            <div class="detail-value" id="detail-status"></div>
          </div>
          
          <div class="detail-image-container">
            <img id="detail-complaint-image" src="" alt="Ảnh khiếu nại">
          </div>
          
          <div class="action-buttons">
            <button id="approve-complaint" class="btn btn-approve">Duyệt khiếu nại</button>
            <button id="reject-complaint" class="btn btn-reject">Không duyệt</button>
          </div>
        </div>
      `;
      
      // Thêm modal vào body
      modal.appendChild(modalContent);
      document.body.appendChild(modal);
      
      // Thêm sự kiện đóng modal
      document.getElementById('close-complaint-modal').addEventListener('click', () => {
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
      });
      
      // Thêm sự kiện cho nút duyệt và không duyệt
      document.getElementById('approve-complaint').addEventListener('click', () => {
        processComplaint('approve');
      });
      
      document.getElementById('reject-complaint').addEventListener('click', () => {
        processComplaint('reject');
      });
    }
    
    // Cập nhật thông tin vào modal
    document.getElementById('detail-employee-id').textContent = complaint.employee_id || 'Không có';
    document.getElementById('detail-employee-name').textContent = complaint.employee_name || 'Không có';
    
    // Format ngày tháng
    const date = new Date(complaint.complaint_date);
    document.getElementById('detail-complaint-date').textContent = date.toLocaleDateString('vi-VN');
    document.getElementById('detail-complaint-time').textContent = complaint.complaint_time || 'Không có';
    document.getElementById('detail-reason').textContent = complaint.reason || 'Không có';
    
    // Cập nhật trạng thái
    let statusText;
    if (!complaint.processed) {
      statusText = 'Chờ duyệt';
    } else if (complaint.status === 'Đã duyệt') {
      statusText = 'Đã duyệt';
    } else {
      statusText = 'Không duyệt';
    }
    document.getElementById('detail-status').textContent = statusText;
    
    // Cập nhật ảnh
    const imageElement = document.getElementById('detail-complaint-image');
    if (complaint.image_path) {
      imageElement.src = '/api/complaint_image?path=' + complaint.image_path;
      imageElement.style.display = 'block';
    } else {
      imageElement.style.display = 'none';
    }
    
    // Hiển thị hoặc ẩn nút duyệt/không duyệt dựa trên trạng thái
    const approveBtn = document.getElementById('approve-complaint');
    const rejectBtn = document.getElementById('reject-complaint');
    
    if (complaint.processed) {
      // Nếu đã xử lý thì disable các nút
      approveBtn.disabled = true;
      rejectBtn.disabled = true;
    } else {
      // Nếu chưa xử lý thì enable các nút
      approveBtn.disabled = false;
      rejectBtn.disabled = false;
    }
    
    // Hiển thị modal
    modal.style.display = 'block';
    document.body.classList.add('modal-open');
    
  } catch (error) {
    console.error('Lỗi khi hiển thị chi tiết khiếu nại:', error);
    alert('Lỗi: ' + error.message);
  }
}

// Lọc danh sách khiếu nại
function filterComplaints() {
  try {
    // Lấy giá trị các bộ lọc
    const searchText = document.getElementById('complaint-search')?.value?.trim() || '';
    const statusFilter = document.getElementById('complaint-status-filter')?.value || 'all';
    const reasonFilter = document.getElementById('complaint-reason-filter')?.value || 'all';
    
    console.log('Đang lọc khiếu nại với điều kiện:', {
      searchText,
      statusFilter,
      reasonFilter
    });
    
    // Kiểm tra xem có dữ liệu để lọc không
    if (!allComplaintsData || allComplaintsData.length === 0) {
      console.warn('Không có dữ liệu khiếu nại để lọc');
      document.getElementById('complaints-list').innerHTML = 
        '<tr><td colspan="6" class="no-data">Không có khiếu nại nào</td></tr>';
      document.getElementById('complaints-pagination').innerHTML = '';
      return;
    }
    
    // Lọc dữ liệu
    let filteredData = [...allComplaintsData];
    
    if (searchText) {
      filteredData = filteredData.filter(item => {
        const idMatch = item.id && item.id.toString().includes(searchText);
        const nameMatch = item.employee_name && item.employee_name.toLowerCase().includes(searchText.toLowerCase());
        return idMatch || nameMatch;
      });
    }
    
    if (statusFilter !== 'all') {
      filteredData = filteredData.filter(item => {
        if (statusFilter === 'pending') return !item.processed;
        if (statusFilter === 'approved') return item.processed && item.status === 'Đã duyệt';
        if (statusFilter === 'rejected') return item.processed && item.status === 'Không duyệt';
        return true;
      });
    }
    
    if (reasonFilter !== 'all') {
      filteredData = filteredData.filter(item => {
        return item.reason === reasonFilter;
      });
    }
    
    console.log(`Lọc từ ${allComplaintsData.length} khiếu nại xuống còn ${filteredData.length} khiếu nại`);
    
    // Cập nhật dữ liệu hiện tại
    currentComplaintsData = filteredData;
    complaintsPage = 1;
    
    // Hiển thị dữ liệu
    displayComplaintsPage(complaintsPage);
    createComplaintsPagination();
  } catch (error) {
    console.error('Lỗi khi lọc danh sách khiếu nại:', error);
    alert('Có lỗi xảy ra khi lọc danh sách khiếu nại: ' + error.message);
  }
}

// Reset bộ lọc khiếu nại
function resetComplaintFilters() {
  document.getElementById('complaint-search').value = '';
  document.getElementById('complaint-status-filter').value = 'all';
  document.getElementById('complaint-reason-filter').value = 'all';
  
  console.log('Đã reset bộ lọc khiếu nại');
  
  // Khôi phục dữ liệu ban đầu
  currentComplaintsData = [...allComplaintsData];
  complaintsPage = 1;
  
  // Hiển thị lại dữ liệu
  displayComplaintsPage(complaintsPage);
  createComplaintsPagination();
}

// Xử lý duyệt/không duyệt khiếu nại
async function processComplaint(action) {
  try {
    console.log('Đang xử lý khiếu nại ID:', currentComplaintId, 'Hành động:', action);
    
    if (!currentComplaintId) {
      throw new Error('Không tìm thấy ID khiếu nại');
    }
    
    const complaint = allComplaintsData.find(c => c.id === currentComplaintId);
    if (!complaint) {
      throw new Error('Không tìm thấy thông tin khiếu nại');
    }
    
    // Chuẩn bị dữ liệu gửi lên server
    const data = {
      complaint_id: currentComplaintId,
      action: action,
      employee_id: complaint.employee_id,
      complaint_date: complaint.complaint_date,
      complaint_time: complaint.complaint_time
    };
    
    // Hiển thị trạng thái xử lý
    const approveBtn = document.getElementById('approve-complaint');
    const rejectBtn = document.getElementById('reject-complaint');
    
    if (approveBtn) approveBtn.disabled = true;
    if (rejectBtn) rejectBtn.disabled = true;
    
    try {
      const response = await fetch('/api/complaint/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error(`API trả về lỗi: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Kết quả xử lý khiếu nại:', result);
      
      // Đóng modal
      const modal = document.getElementById('complaint-detail-modal');
      if (modal) {
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
      }
      
      // Cập nhật dữ liệu local
      const complaintIndex = allComplaintsData.findIndex(c => c.id === currentComplaintId);
      if (complaintIndex !== -1) {
        allComplaintsData[complaintIndex].processed = true;
        allComplaintsData[complaintIndex].status = action === 'approve' ? 'Đã duyệt' : 'Không duyệt';
      }
      
      // Hiển thị thông báo thành công
      alert(action === 'approve' ? 'Đã duyệt khiếu nại thành công!' : 'Đã từ chối khiếu nại!');
      
      // Tải lại danh sách khiếu nại
      await loadComplaints();
      
    } catch (error) {
      console.error('Lỗi khi gọi API:', error);
      throw new Error('Có lỗi xảy ra khi xử lý khiếu nại');
    } finally {
      // Khôi phục trạng thái nút
      if (approveBtn) approveBtn.disabled = false;
      if (rejectBtn) rejectBtn.disabled = false;
    }
  } catch (error) {
    console.error('Lỗi:', error);
    alert('Lỗi: ' + (error.message || 'Có lỗi xảy ra khi xử lý khiếu nại'));
  }
}

// Thiết lập tabs
function setupTabs() {
  const tabs = document.querySelectorAll('.tab');
  const tabPanes = document.querySelectorAll('.tab-pane');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      console.log('Tab clicked:', tab.getAttribute('data-tab'));
      
      // Xóa active từ tất cả tabs và panes
      tabs.forEach(t => t.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));
      
      // Thêm active cho tab được chọn
      tab.classList.add('active');
      const targetTabId = `${tab.getAttribute('data-tab')}-pane`;
      const targetPane = document.getElementById(targetTabId);
      
      if (targetPane) {
        targetPane.classList.add('active');
        
        // Tải dữ liệu dựa vào tab được chọn
        const tabName = tab.getAttribute('data-tab');
        
        if (tabName === 'employees') {
          loadEmployees();
        } else if (tabName === 'attendance') {
          loadAttendance();
        } else if (tabName === 'complaints') {
          loadComplaints();
        } else if (tabName === 'statistics') {
          loadStatisticsCharts();
        } else if (tabName === 'shifts') {
          loadShiftConfig();
        }
      } else {
        console.error('Tab pane not found:', targetTabId);
      }
    });
  });
}

/**
 * Tải cấu hình ca làm việc từ server
 */
async function loadShiftConfig() {
  try {
    const response = await fetch('/api/shift/config');
    
    if (!response.ok) {
      throw new Error(`API trả về lỗi: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('Cấu hình ca làm việc:', result);
    
    if (!result.success) {
      throw new Error(result.message || 'Không thể tải cấu hình ca làm việc');
    }
    
    // Lưu cấu hình vào biến toàn cục
    shiftsConfig = result.data;
    
    // Cập nhật giao diện với dữ liệu mới
    if (shiftsConfig) {
      // Hiển thị thông tin ca hiện tại
      const shift1 = shiftsConfig.shift1;
      const shift2 = shiftsConfig.shift2;
      
      if (shift1 && shift2) {
        // Cập nhật hiển thị trong thẻ card
        const currentShift1 = document.getElementById('current-shift1');
        const currentShift2 = document.getElementById('current-shift2');
        
        if (currentShift1) {
          currentShift1.textContent = `${shift1.checkIn} - ${shift1.checkOut}`;
        }
        
        if (currentShift2) {
          currentShift2.textContent = `${shift2.checkIn} - ${shift2.checkOut}`;
        }
        
        // Cập nhật giá trị trong form
        document.getElementById('shift1-start').value = shift1.checkIn;
        document.getElementById('shift1-end').value = shift1.checkOut;
        document.getElementById('shift2-start').value = shift2.checkIn;
        document.getElementById('shift2-end').value = shift2.checkOut;
        
        // Cập nhật thời gian cập nhật cuối
        const lastUpdatedTime = document.getElementById('last-updated-time');
        if (lastUpdatedTime) {
          const now = new Date();
          lastUpdatedTime.textContent = now.toLocaleString('vi-VN');
        }
      }
    }
    
    return true;
  } catch (error) {
    console.error('Lỗi khi tải cấu hình ca làm việc:', error);
    return false;
  }
}