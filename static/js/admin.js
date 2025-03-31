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
        
        response = await fetch(`/api/employees/${employeeId}`, {
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
  document.getElementById('add-shift-btn').addEventListener('click', () => {
    document.getElementById('shift-modal-title').textContent = 'Thêm ca làm việc';
    shiftForm.reset();
    document.getElementById('shift-id').value = '';
    shiftModal.style.display = 'flex';
  });
  
  // Đóng modal khi click ra ngoài
  shiftModal.addEventListener('click', (e) => {
    if (e.target === shiftModal) {
      shiftModal.style.display = 'none';
    }
  });
  
  // Đóng modal khi nhấn nút Hủy
  document.getElementById('cancel-shift-btn').addEventListener('click', () => {
    shiftModal.style.display = 'none';
  });
  
  // Xử lý form thêm/sửa ca làm việc
  shiftForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const shiftId = document.getElementById('shift-id').value;
    const name = document.getElementById('shift-name').value;
    const checkIn = document.getElementById('shift-check-in').value;
    const checkOut = document.getElementById('shift-check-out').value;
    const isActive = document.getElementById('shift-active').checked;
    
    // TODO: Gửi API thêm/sửa ca làm việc
    
    // Fake data để demo
    if (!shiftId) {
      // Thêm mới
      const newId = shiftsList.children.length + 1;
      appendShiftRow(newId, name, checkIn, checkOut, isActive);
    } else {
      // Cập nhật
      // TODO: Cập nhật row trong bảng
      alert('Đã cập nhật ca làm việc!');
    }
    
    shiftModal.style.display = 'none';
  });
  
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
        fetch(`/api/employees/${id}`, {
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

// Load danh sách nhân viên từ API
async function loadEmployees() {
  try {
    const response = await fetch('/api/employees');
    const data = await response.json();
    
    const employeeList = document.getElementById('employee-list');
    employeeList.innerHTML = '';
    
    // Kiểm tra có dữ liệu không
    if (data.employees && data.employees.length > 0) {
      allEmployeesData = data.employees;
      data.employees.forEach(employee => {
        appendEmployeeRow(employee.id, employee.name, employee.position);
      });
    } else {
      employeeList.innerHTML = '<tr><td colspan="4" class="no-data">Không có nhân viên nào</td></tr>';
    }
  } catch (error) {
    console.error('Lỗi khi tải dữ liệu nhân viên:', error);
    document.getElementById('employee-list').innerHTML = 
      '<tr><td colspan="4" class="error-message">Lỗi khi tải dữ liệu. Vui lòng thử lại sau.</td></tr>';
  }
}

async function loadShifts() {
  try {
    const response = await fetch('/api/shifts');
    const data = await response.json();
    
    if (data.success) {
      const shiftsList = document.getElementById('shifts-list');
      if (shiftsList) {
        shiftsList.innerHTML = '';
        
        if (data.shifts && data.shifts.length > 0) {
          data.shifts.forEach(shift => {
            appendShiftRow(
              shift.id,
              shift.name,
              shift.check_in_time,
              shift.check_out_time,
              shift.active
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
    } else {
      console.error('Lỗi khi tải dữ liệu ca làm việc:', data.message);
      if (document.getElementById('shifts-list')) {
        document.getElementById('shifts-list').innerHTML = 
          '<tr><td colspan="5" class="error-message">Lỗi khi tải dữ liệu. Vui lòng thử lại sau.</td></tr>';
      }
    }
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
    const statusFilter = document.getElementById('status-filter').value;
    const lateFilter = document.getElementById('late-filter').value;
    const earlyFilter = document.getElementById('early-filter').value;
    const shiftCountFilter = document.getElementById('shift-count-filter').value;
    
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
      
      if (statusFilter !== 'all') {
        filteredData = filteredData.filter(item => {
          if (statusFilter === 'ontime') return item.note === 'Đúng giờ';
          if (statusFilter === 'late') return item.note === 'Check in muộn';
          if (statusFilter === 'early') return item.note === 'Check out sớm';
          if (statusFilter === 'lateearly') return item.note === 'Check in muộn & Check out sớm';
          if (statusFilter === 'error') return item.note === 'Máy chấm công lỗi';
          return true;
        });
      }
      
      if (lateFilter !== 'all') {
        filteredData = filteredData.filter(item => {
          if (lateFilter === 'yes') return item.lateMinutes > 0;
          return item.lateMinutes === 0;
        });
      }
      
      if (earlyFilter !== 'all') {
        filteredData = filteredData.filter(item => {
          if (earlyFilter === 'yes') return item.earlyMinutes > 0;
          return item.earlyMinutes === 0;
        });
      }
      
      if (shiftCountFilter !== 'all') {
        filteredData = filteredData.filter(item => {
          return item.shiftCount.toString() === shiftCountFilter;
        });
      }
      
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
    const attendanceData = data.attendance || [];
    
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

// Hàm gửi API cập nhật cấu hình ca làm
async function updateShiftsConfig(config) {
  try {
    console.log("Đang gửi cấu hình mới:", config);
    const response = await fetch('/api/shifts/config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(config)
    });
    
    const data = await response.json();
    console.log("Kết quả cập nhật:", data);
    
    if (!data.success) {
      throw new Error(data.message || 'Lỗi khi cập nhật cấu hình ca làm');
    }
    
    // Cập nhật biến toàn cục
    shiftsConfig = config;
    
    // Cập nhật hiển thị
    document.getElementById('current-shift1').textContent = `${config.shift1.checkIn} - ${config.shift1.checkOut}`;
    document.getElementById('current-shift2').textContent = `${config.shift2.checkIn} - ${config.shift2.checkOut}`;
    document.getElementById('last-updated-time').textContent = new Date().toLocaleString('vi-VN', { hour12: false });
    
    // Thông báo thành công
    alert('Cấu hình ca làm việc đã được lưu và áp dụng thành công!');
    
    return true;
  } catch (error) {
    console.error('Lỗi khi cập nhật cấu hình ca làm:', error);
    alert(`Lỗi: ${error.message}`);
    return false;
  }
}

// Hàm lấy cấu hình ca làm hiện tại
async function getShiftsConfig() {
  try {
    console.log("Đang lấy cấu hình ca làm việc...");
    const response = await fetch('/api/shifts/config');
    const data = await response.json();
    console.log("Dữ liệu cấu hình ca làm:", data);
    
    if (!data.success) {
      throw new Error(data.message || 'Lỗi khi lấy cấu hình ca làm');
    }
    
    // Cập nhật biến toàn cục
    shiftsConfig = data.config;
    
    // Hiển thị cấu hình lên form
    document.getElementById('shift1-check-in').value = shiftsConfig.shift1.checkIn;
    document.getElementById('shift1-check-out').value = shiftsConfig.shift1.checkOut;
    document.getElementById('shift2-check-in').value = shiftsConfig.shift2.checkIn;
    document.getElementById('shift2-check-out').value = shiftsConfig.shift2.checkOut;
    
    // Cập nhật thông tin hiển thị trong card
    document.getElementById('current-shift1').textContent = `${shiftsConfig.shift1.checkIn} - ${shiftsConfig.shift1.checkOut}`;
    document.getElementById('current-shift2').textContent = `${shiftsConfig.shift2.checkIn} - ${shiftsConfig.shift2.checkOut}`;
    document.getElementById('last-updated-time').textContent = new Date().toLocaleString('vi-VN', { hour12: false });
    
    console.log("Đã cập nhật UI với cấu hình:", shiftsConfig);
    return shiftsConfig;
  } catch (error) {
    console.error('Lỗi khi lấy cấu hình ca làm:', error);
    
    // Sử dụng cấu hình mặc định nếu có lỗi
    setDefaultShiftsConfig();
    
    return shiftsConfig;
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
});

// ... existing code ...

// Thiết lập xử lý sự kiện
function setupEventHandlers() {
  // Xử lý các nút trong tab khiếu nại
  document.getElementById("search-complaints-btn").addEventListener("click", filterComplaints);
  document.getElementById("reset-complaints-filter-btn").addEventListener("click", resetComplaintsFilter);
  
  // Thêm sự kiện Enter để tìm kiếm
  document.getElementById("complaints-search").addEventListener("keyup", function(event) {
    if (event.key === "Enter") {
      filterComplaints();
    }
  });
  
  // Xử lý đóng modal chi tiết khiếu nại
  document.getElementById("close-complaint-detail").addEventListener("click", () => {
    document.getElementById("complaint-detail-modal").style.display = "none";
  });
  
  // Xử lý click ra ngoài modal để đóng
  document.getElementById("complaint-detail-modal").addEventListener("click", (e) => {
    if (e.target === document.getElementById("complaint-detail-modal")) {
      document.getElementById("complaint-detail-modal").style.display = "none";
    }
  });
  
  // Xử lý nút duyệt khiếu nại
  document.getElementById("approve-complaint").addEventListener("click", () => processComplaint(true));
  
  // Xử lý nút không duyệt khiếu nại
  document.getElementById("reject-complaint").addEventListener("click", () => processComplaint(false));
  
  // Xử lý xuất Excel cho khiếu nại
  document.getElementById('export-complaints-excel-btn').addEventListener('click', () => {
    const table = document.querySelector('.complaints-table');
    exportToExcel(table, 'danh_sach_khieu_nai.xlsx');
  });
  
  // Thêm sự kiện Enter cho các thanh tìm kiếm khác
  document.getElementById("employee-search").addEventListener("keyup", function(event) {
    if (event.key === "Enter") {
      document.getElementById("search-employee-btn").click();
    }
  });
  
  document.getElementById("attendance-search").addEventListener("keyup", function(event) {
    if (event.key === "Enter") {
      document.getElementById("search-attendance-btn").click();
    }
  });
}

// ... existing code ...

// Tải dữ liệu khiếu nại
async function loadComplaints() {
  try {
    // Hiển thị trạng thái đang tải
    document.getElementById('complaints-list').innerHTML = '<tr><td colspan="7" class="loading-message">Đang tải dữ liệu khiếu nại...</td></tr>';
    
    // Gọi API để lấy dữ liệu khiếu nại
    fetch('/api/complaints')
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          // Nếu có dữ liệu khiếu nại
          if (data.complaints && data.complaints.length > 0) {
            // Lưu dữ liệu vào biến toàn cục
            allComplaintsData = data.complaints;
            
            // Hiển thị trang đầu tiên
            complaintsPage = 1;
            displayComplaintsPage(complaintsPage);
            createComplaintsPagination();
          } else {
            // Nếu không có dữ liệu khiếu nại
            document.getElementById('complaints-list').innerHTML = '<tr><td colspan="7" class="no-data">Không có khiếu nại nào</td></tr>';
            document.getElementById('complaints-pagination').innerHTML = '';
          }
        } else {
          // Nếu API trả về lỗi
          document.getElementById('complaints-list').innerHTML = `<tr><td colspan="7" class="error-message">Lỗi: ${data.message || 'Không thể tải dữ liệu khiếu nại'}</td></tr>`;
          document.getElementById('complaints-pagination').innerHTML = '';
        }
      })
      .catch(error => {
        console.error('Lỗi khi tải dữ liệu khiếu nại:', error);
        document.getElementById('complaints-list').innerHTML = '<tr><td colspan="7" class="error-message">Lỗi kết nối, vui lòng thử lại sau</td></tr>';
        document.getElementById('complaints-pagination').innerHTML = '';
      });
  } catch (error) {
    console.error('Lỗi khi tải dữ liệu khiếu nại:', error);
    document.getElementById('complaints-list').innerHTML = '<tr><td colspan="7" class="error-message">Lỗi khi xử lý dữ liệu, vui lòng thử lại sau</td></tr>';
    document.getElementById('complaints-pagination').innerHTML = '';
  }
}

// Hiển thị trang khiếu nại
function displayComplaintsPage(page, filteredData = null) {
  const complaintsList = document.getElementById('complaints-list');
  complaintsList.innerHTML = '';
  
  const data = filteredData !== null ? filteredData : allComplaintsData;
  
  if (data.length === 0) {
    complaintsList.innerHTML = '<tr><td colspan="7" class="no-data">Không có dữ liệu khiếu nại</td></tr>';
    document.getElementById('complaints-pagination').innerHTML = '';
    return;
  }
  
  // Tính số trang
  const totalPages = Math.ceil(data.length / complaintsPerPage);
  const currentPage = Math.min(page, totalPages);
  
  // Tính chỉ số bắt đầu và kết thúc
  const startIndex = (currentPage - 1) * complaintsPerPage;
  const endIndex = Math.min(startIndex + complaintsPerPage, data.length);
  
  // Lấy dữ liệu cho trang hiện tại
  const currentPageData = data.slice(startIndex, endIndex);
  
  // Hiển thị dữ liệu
  currentPageData.forEach(complaint => {
    const statusClass = complaint.processed ? 
      (complaint.status === "Đã xử lý" || complaint.status === "Đã duyệt" ? "approved" : "rejected") : 
      "pending";
    
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${complaint.complaint_date || ''}</td>
      <td>${complaint.complaint_time || ''}</td>
      <td>${complaint.employee_id || ''}</td>
      <td>${complaint.employee_name || ''}</td>
      <td>${complaint.reason || ''}</td>
      <td class="${statusClass}">${complaint.status || 'Chưa xử lý'}</td>
      <td>
        <button class="view-complaint-btn" data-id="${complaint.id}">
          <i class="fas fa-eye"></i> Xem
        </button>
      </td>
    `;
    complaintsList.appendChild(row);
  });
  
  // Thêm sự kiện cho nút xem chi tiết
  document.querySelectorAll('.view-complaint-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const complaintId = btn.getAttribute('data-id');
      showComplaintDetail(complaintId);
    });
  });
  
  // Cập nhật phân trang
  createComplaintsPagination(currentPage, totalPages, filteredData !== null);
}

// Tạo phân trang cho khiếu nại
function createComplaintsPagination(currentPage, totalPages, isFiltered) {
  const paginationContainer = document.getElementById('complaints-pagination');
  paginationContainer.innerHTML = '';
  
  if (totalPages <= 1) return;
  
  // Tạo nút Previous
  if (currentPage > 1) {
    const prevButton = document.createElement('button');
    prevButton.classList.add('pagination-button');
    prevButton.innerHTML = '&laquo; Trước';
    prevButton.addEventListener('click', () => {
      complaintsPage = currentPage - 1;
      displayComplaintsPage(complaintsPage, isFiltered ? filterComplaints(false) : null);
      createComplaintsPagination(complaintsPage, totalPages, isFiltered);
    });
    paginationContainer.appendChild(prevButton);
  }
  
  // Tạo các nút số trang
  const startPage = Math.max(1, currentPage - 2);
  const endPage = Math.min(totalPages, startPage + 4);
  
  for (let i = startPage; i <= endPage; i++) {
    const pageButton = document.createElement('button');
    pageButton.classList.add('pagination-button');
    if (i === currentPage) {
      pageButton.classList.add('active');
    }
    pageButton.textContent = i;
    pageButton.addEventListener('click', () => {
      complaintsPage = i;
      displayComplaintsPage(complaintsPage, isFiltered ? filterComplaints(false) : null);
      createComplaintsPagination(complaintsPage, totalPages, isFiltered);
    });
    paginationContainer.appendChild(pageButton);
  }
  
  // Tạo nút Next
  if (currentPage < totalPages) {
    const nextButton = document.createElement('button');
    nextButton.classList.add('pagination-button');
    nextButton.innerHTML = 'Sau &raquo;';
    nextButton.addEventListener('click', () => {
      complaintsPage = currentPage + 1;
      displayComplaintsPage(complaintsPage, isFiltered ? filterComplaints(false) : null);
      createComplaintsPagination(complaintsPage, totalPages, isFiltered);
    });
    paginationContainer.appendChild(nextButton);
  }
}

// Lọc dữ liệu khiếu nại
function filterComplaints(updateDisplay = true) {
  const searchText = document.getElementById('complaints-search').value.trim().toLowerCase();
  const fromDate = document.getElementById('complaints-date-from').value;
  const toDate = document.getElementById('complaints-date-to').value;
  const statusFilter = document.getElementById('complaint-status-filter').value;
  
  const filteredData = allComplaintsData.filter(complaint => {
    // Lọc theo tìm kiếm
    const matchesSearch = !searchText || 
      (complaint.employee_id && complaint.employee_id.toString().toLowerCase().includes(searchText)) ||
      (complaint.employee_name && complaint.employee_name.toLowerCase().includes(searchText));
    
    // Lọc theo ngày
    const complaintDate = complaint.complaint_date;
    const matchesFromDate = !fromDate || (complaintDate && complaintDate >= fromDate);
    const matchesToDate = !toDate || (complaintDate && complaintDate <= toDate);
    
    // Lọc theo trạng thái
    let matchesStatus = true;
    if (statusFilter !== 'all') {
      if (statusFilter === 'pending') {
        matchesStatus = complaint.status === 'Chưa xử lý' || !complaint.processed;
      } else if (statusFilter === 'approved') {
        matchesStatus = complaint.status === 'Đã duyệt';
      } else if (statusFilter === 'rejected') {
        matchesStatus = complaint.status === 'Không duyệt';
      }
    }
    
    return matchesSearch && matchesFromDate && matchesToDate && matchesStatus;
  });
  
  if (updateDisplay) {
    complaintsPage = 1;
    displayComplaintsPage(complaintsPage, filteredData);
    createComplaintsPagination(complaintsPage, Math.ceil(filteredData.length / complaintsPerPage), true);
  }
  
  return filteredData;
}

// Reset bộ lọc khiếu nại
function resetComplaintsFilter() {
  document.getElementById('complaints-search').value = '';
  document.getElementById('complaints-date-from').value = '';
  document.getElementById('complaints-date-to').value = '';
  document.getElementById('complaint-status-filter').value = 'all';
  
  complaintsPage = 1;
  displayComplaintsPage(complaintsPage);
  createComplaintsPagination(complaintsPage, Math.ceil(allComplaintsData.length / complaintsPerPage), false);
}

// Hiển thị chi tiết khiếu nại
async function showComplaintDetail(complaintId) {
  try {
    currentComplaintId = complaintId;
    console.log('Hiển thị chi tiết khiếu nại ID:', complaintId);
    
    const complaint = allComplaintsData.find(item => item.id === complaintId);
    if (complaint) {
      console.log('Thông tin khiếu nại:', complaint);
      
      // Cập nhật nội dung modal
      document.getElementById('detail-employee-id').textContent = complaint.employee_id;
      document.getElementById('detail-employee-name').textContent = complaint.employee_name;
      document.getElementById('detail-complaint-date').textContent = complaint.complaint_date;
      document.getElementById('detail-complaint-time').textContent = complaint.complaint_time;
      document.getElementById('detail-reason').textContent = complaint.reason;
      document.getElementById('detail-status').textContent = complaint.processed ? complaint.status : 'Chưa xử lý';
      
      // Hiển thị ảnh khiếu nại nếu có
      const imageElement = document.getElementById('detail-complaint-image');
      if (complaint.image_path) {
        imageElement.src = '/' + complaint.image_path;
        imageElement.style.display = 'block';
      } else {
        imageElement.style.display = 'none';
      }
      
      // Cập nhật trạng thái nút duyệt/không duyệt
      const approveBtn = document.getElementById('approve-complaint');
      const rejectBtn = document.getElementById('reject-complaint');
      
      if (complaint.processed) {
        approveBtn.disabled = true;
        rejectBtn.disabled = true;
        
        if (complaint.status === 'Đã duyệt' || complaint.status === 'Đã xử lý') {
          approveBtn.classList.add('disabled');
          rejectBtn.classList.remove('disabled');
        } else if (complaint.status === 'Không duyệt') {
          approveBtn.classList.remove('disabled');
          rejectBtn.classList.add('disabled');
        }
      } else {
        approveBtn.disabled = false;
        rejectBtn.disabled = false;
        approveBtn.classList.remove('disabled');
        rejectBtn.classList.remove('disabled');
      }
      
      // Hiển thị modal và thêm class cho body
      document.getElementById('complaint-detail-modal').style.display = 'block';
      document.body.classList.add('modal-open');
      
      // Thêm event listener để đóng modal khi click vào nút đóng
      document.querySelector('.close-modal').addEventListener('click', function() {
        document.getElementById('complaint-detail-modal').style.display = 'none';
        document.body.classList.remove('modal-open');
      });
      
      // Thêm event listener để đóng modal khi click ra ngoài modal
      document.getElementById('complaint-detail-modal').addEventListener('click', function(event) {
        if (event.target === this) {
          this.style.display = 'none';
          document.body.classList.remove('modal-open');
        }
      });
    } else {
      console.error('Không tìm thấy thông tin chi tiết khiếu nại ID:', complaintId);
      Swal.fire({
        title: 'Lỗi!',
        text: 'Không thể tải thông tin chi tiết khiếu nại',
        icon: 'error',
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'Đóng'
      });
    }
  } catch (error) {
    console.error('Lỗi khi tải chi tiết khiếu nại:', error);
    Swal.fire({
      title: 'Lỗi!',
      text: 'Đã xảy ra lỗi khi tải thông tin chi tiết: ' + error.message,
      icon: 'error',
      confirmButtonColor: '#3085d6',
      confirmButtonText: 'Đóng'
    });
  }
}

// Xử lý duyệt/không duyệt khiếu nại
async function processComplaint(action) {
  try {
    if (!currentComplaintId) {
      console.error('Không có ID khiếu nại được chọn');
      Swal.fire({
        title: 'Lỗi!',
        text: 'Không có khiếu nại nào được chọn để xử lý',
        icon: 'error',
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'Đóng'
      });
      return;
    }
    
    console.log(`Đang xử lý khiếu nại ID: ${currentComplaintId}, Hành động: ${action}`);
    
    // Tìm thông tin khiếu nại
    const complaint = allComplaintsData.find(item => item.id === currentComplaintId);
    if (!complaint) {
      console.error('Không tìm thấy thông tin khiếu nại với ID:', currentComplaintId);
      Swal.fire({
        title: 'Lỗi!',
        text: 'Không tìm thấy thông tin khiếu nại',
        icon: 'error',
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'Đóng'
      });
      return;
    }
    
    // Chuẩn bị dữ liệu để gửi
    const employeeId = complaint.employee_id;
    const complaintDate = complaint.complaint_date;
    const complaintTime = complaint.complaint_time;
    
    const data = {
      complaint_id: currentComplaintId,
      action: action,
      employee_id: employeeId,
      complaint_date: complaintDate,
      complaint_time: complaintTime
    };
    
    // Gửi yêu cầu xử lý
    const response = await fetch('/api/process_complaint', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Có lỗi xảy ra khi xử lý khiếu nại');
    }
    
    const result = await response.json();
    
    // Đóng modal
    document.getElementById('complaint-detail-modal').style.display = 'none';
    document.body.classList.remove('modal-open');
    
    // Hiển thị thông báo thành công
    if (action === 'approve') {
      Swal.fire({
        html: `
          <div style="display: flex; flex-direction: column; align-items: center;">
            <i class="fas fa-check-circle" style="font-size: 4rem; color: #28a745; margin-bottom: 1rem;"></i>
            <h2>Đã duyệt khiếu nại</h2>
            <p>Khiếu nại đã được duyệt thành công và đã cập nhật chấm công</p>
          </div>
        `,
        showConfirmButton: true,
        confirmButtonText: 'Đóng',
        confirmButtonColor: '#28a745',
        showClass: {
          popup: 'animate__animated animate__fadeIn faster'
        },
        hideClass: {
          popup: 'animate__animated animate__fadeOut faster'
        }
      });
    } else {
      Swal.fire({
        html: `
          <div style="display: flex; flex-direction: column; align-items: center;">
            <i class="fas fa-times-circle" style="font-size: 4rem; color: #dc3545; margin-bottom: 1rem;"></i>
            <h2>Đã từ chối khiếu nại</h2>
            <p>Khiếu nại đã bị từ chối và sẽ không cập nhật chấm công</p>
          </div>
        `,
        showConfirmButton: true,
        confirmButtonText: 'Đóng',
        confirmButtonColor: '#dc3545',
        showClass: {
          popup: 'animate__animated animate__fadeIn faster'
        },
        hideClass: {
          popup: 'animate__animated animate__fadeOut faster'
        }
      });
    }
    
    // Cập nhật dữ liệu khiếu nại trong danh sách
    complaint.processed = true;
    complaint.status = action === 'approve' ? 'Đã duyệt' : 'Không duyệt';
    
    // Cập nhật giao diện
    await loadComplaints();
    
    console.log('Xử lý khiếu nại thành công:', result);
  } catch (error) {
    console.error('Lỗi khi xử lý khiếu nại:', error);
    Swal.fire({
      title: 'Lỗi!',
      text: 'Đã xảy ra lỗi khi xử lý khiếu nại: ' + error.message,
      icon: 'error',
      confirmButtonColor: '#3085d6',
      confirmButtonText: 'Đóng'
    });
  }
}

// ... existing code ...

// Tải dữ liệu khi chuyển tab
function setupTabs() {
  const tabs = document.querySelectorAll('.tab');
  const tabPanes = document.querySelectorAll('.tab-pane');

  // Chuyển đổi tab khi click
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.dataset.tab;
      
      // Xóa active khỏi tất cả tabs và panes
      tabs.forEach(t => t.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));
      
      // Thêm active cho tab được chọn
      tab.classList.add('active');
      document.getElementById(`${targetTab}-pane`).classList.add('active');
      
      // Tải dữ liệu tương ứng với tab được chọn
      if (targetTab === 'employees') {
        // Tải dữ liệu nhân viên nếu chưa tải
        if (document.querySelector('#employee-list tr') === null) {
          loadEmployees();
        }
      } else if (targetTab === 'shifts') {
        // Tải dữ liệu ca làm việc nếu chưa tải
        if (document.querySelector('#shifts-list tr') === null) {
          loadShifts();
        }
      } else if (targetTab === 'attendance') {
        // Tải dữ liệu chấm công nếu chưa tải
        if (document.querySelector('#attendance-list tr') === null) {
          loadAttendance();
        }
      } else if (targetTab === 'complaints') {
        // Tải dữ liệu khiếu nại nếu chưa tải
        if (allComplaintsData.length === 0) {
          loadComplaints();
        }
      }
    });
  });
}

// ... existing code ...

// Hàm hiển thị trang điểm danh
function displayAttendancePage(page) {
  const attendanceList = document.getElementById('attendance-list');
  attendanceList.innerHTML = '';
  
  if (currentAttendanceData.length === 0) {
    attendanceList.innerHTML = '<tr><td colspan="10" class="no-data">Không có dữ liệu chấm công</td></tr>';
    return;
  }
  
  // Tính toán chỉ số bắt đầu và kết thúc
  const startIndex = (page - 1) * attendancePerPage;
  const endIndex = Math.min(startIndex + attendancePerPage, currentAttendanceData.length);
  
  // Lấy dữ liệu cho trang hiện tại
  const currentPageData = currentAttendanceData.slice(startIndex, endIndex);
  
  // Hiển thị dữ liệu
  currentPageData.forEach(item => {
    const row = document.createElement('tr');
    
    // Xác định trạng thái
    let statusClass = '';
    if (item.note === 'Check in muộn & Check out sớm') {
      statusClass = 'lateearly';
    } else if (item.note === 'Check in muộn') {
      statusClass = 'late';
    } else if (item.note === 'Check out sớm') {
      statusClass = 'early';
    } else if (item.note === 'Máy chấm công lỗi') {
      statusClass = 'error';
    }
    
    row.innerHTML = `
      <td>${item.date}</td>
      <td>${item.id}</td>
      <td>${item.name}</td>
      <td>${item.checkIn1} - ${item.checkOut1}</td>
      <td>${item.checkIn2} - ${item.checkOut2}</td>
      <td>${item.lateMinutes} phút</td>
      <td>${item.earlyMinutes} phút</td>
      <td>${item.workHours.toFixed(2)} giờ</td>
      <td>${item.shiftCount}</td>
      <td class="${statusClass}">${item.note}</td>
    `;
    
    attendanceList.appendChild(row);
  });
}

// Hàm tạo nút phân trang cho bảng chấm công
function createAttendancePagination() {
  const paginationContainer = document.getElementById('attendance-pagination');
  paginationContainer.innerHTML = '';
  
  const totalPages = Math.ceil(currentAttendanceData.length / attendancePerPage);
  
  if (totalPages <= 1) return;
  
  // Tạo nút Previous
  if (attendancePage > 1) {
    const prevButton = document.createElement('button');
    prevButton.classList.add('pagination-button');
    prevButton.innerHTML = '&laquo; Trước';
    prevButton.addEventListener('click', () => {
      attendancePage--;
      displayAttendancePage(attendancePage);
      createAttendancePagination();
    });
    paginationContainer.appendChild(prevButton);
  }
  
  // Tạo các nút số trang
  const startPage = Math.max(1, attendancePage - 2);
  const endPage = Math.min(totalPages, startPage + 4);
  
  for (let i = startPage; i <= endPage; i++) {
    const pageButton = document.createElement('button');
    pageButton.classList.add('pagination-button');
    if (i === attendancePage) {
      pageButton.classList.add('active');
    }
    pageButton.textContent = i;
    pageButton.addEventListener('click', () => {
      attendancePage = i;
      displayAttendancePage(attendancePage);
      createAttendancePagination();
    });
    paginationContainer.appendChild(pageButton);
  }
  
  // Tạo nút Next
  if (attendancePage < totalPages) {
    const nextButton = document.createElement('button');
    nextButton.classList.add('pagination-button');
    nextButton.innerHTML = 'Sau &raquo;';
    nextButton.addEventListener('click', () => {
      attendancePage++;
      displayAttendancePage(attendancePage);
      createAttendancePagination();
    });
    paginationContainer.appendChild(nextButton);
  }
}

// ... existing code ...

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

// ... existing code ...

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

// ... existing code ... 