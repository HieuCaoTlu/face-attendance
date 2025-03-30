// Xử lý tabs
document.addEventListener('DOMContentLoaded', function() {
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
    });
  });

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

  // Tab chấm công - đặt ngày mặc định
  document.getElementById('attendance-date').valueAsDate = new Date();
  
  // Load dữ liệu chấm công demo
  loadDemoAttendance();
  
  // Load dữ liệu khiếu nại demo
  loadDemoComplaints();
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
    // Xóa dữ liệu cũ
    const employeeList = document.getElementById('employee-list');
    employeeList.innerHTML = '';
    
    // Lấy danh sách nhân viên từ API
    const response = await fetch('/api/employees');
    
    // Kiểm tra xem API có thành công không
    if (!response.ok) {
      throw new Error('Không thể kết nối với API');
    }
    
    const data = await response.json();
    
    if (data.employees && data.employees.length > 0) {
      // Thêm dữ liệu từ API vào bảng
      data.employees.forEach(employee => {
        appendEmployeeRow(employee.id, employee.name, employee.position);
      });
    } else {
      // Hiển thị dữ liệu mẫu nếu không có nhân viên từ API
      console.log('Không có dữ liệu từ API, hiển thị dữ liệu mẫu');
      loadDemoEmployees();
    }
  } catch (error) {
    console.error('Lỗi khi tải danh sách nhân viên:', error);
    // Tải dữ liệu mẫu khi có lỗi
    loadDemoEmployees();
  }
}

// Load dữ liệu nhân viên mẫu
function loadDemoEmployees() {
  const employees = [
    { id: 1, name: 'Nguyễn Văn A', position: 'Giám đốc' },
    { id: 2, name: 'Trần Thị B', position: 'Trưởng phòng nhân sự' },
    { id: 3, name: 'Lê Văn C', position: 'Nhân viên IT' },
    { id: 4, name: 'Phạm Thị D', position: 'Kế toán' },
    { id: 5, name: 'Hoàng Văn E', position: 'Nhân viên kinh doanh' }
  ];
  
  const employeeList = document.getElementById('employee-list');
  employeeList.innerHTML = '';
  
  employees.forEach(emp => {
    appendEmployeeRow(emp.id, emp.name, emp.position);
  });
}

// Load danh sách ca làm việc từ API
async function loadShifts() {
  try {
    // Xóa dữ liệu cũ
    const shiftsList = document.getElementById('shifts-list');
    shiftsList.innerHTML = '';
    
    // Lấy danh sách ca làm việc từ API
    const response = await fetch('/api/shifts');
    
    // Kiểm tra xem API có thành công không
    if (!response.ok) {
      throw new Error('Không thể kết nối với API');
    }
    
    const data = await response.json();
    
    if (data.shifts && data.shifts.length > 0) {
      // Thêm dữ liệu từ API vào bảng
      data.shifts.forEach(shift => {
        appendShiftRow(shift.id, shift.name, shift.check_in, shift.check_out, shift.active);
      });
    } else {
      // Hiển thị dữ liệu mẫu nếu không có ca làm việc từ API
      console.log('Không có dữ liệu từ API, hiển thị dữ liệu mẫu');
      loadDemoShifts();
    }
  } catch (error) {
    console.error('Lỗi khi tải danh sách ca làm việc:', error);
    // Tải dữ liệu mẫu khi có lỗi
    loadDemoShifts();
  }
}

// Load demo data cho ca làm việc
function loadDemoShifts() {
  const shifts = [
    { id: 1, name: 'Ca sáng', checkIn: '08:00', checkOut: '12:00', isActive: true },
    { id: 2, name: 'Ca chiều', checkIn: '13:00', checkOut: '17:00', isActive: true },
    { id: 3, name: 'Ca tối', checkIn: '18:00', checkOut: '22:00', isActive: false }
  ];
  
  const shiftsList = document.getElementById('shifts-list');
  shiftsList.innerHTML = '';
  
  shifts.forEach(shift => {
    appendShiftRow(shift.id, shift.name, shift.checkIn, shift.checkOut, shift.isActive);
  });
}

// Thêm event listeners cho các nút trong bảng ca làm việc bằng event delegation
document.getElementById('shifts-list').addEventListener('click', function(e) {
  // Xử lý nút sửa
  if (e.target.classList.contains('edit-btn')) {
    const button = e.target;
    const id = button.dataset.id;
    const name = button.dataset.name;
    const checkIn = button.dataset.checkin;
    const checkOut = button.dataset.checkout;
    const isActive = button.dataset.active === 'true';
    
    document.getElementById('shift-modal-title').textContent = 'Sửa ca làm việc';
    document.getElementById('shift-id').value = id;
    document.getElementById('shift-name').value = name;
    document.getElementById('shift-check-in').value = checkIn;
    document.getElementById('shift-check-out').value = checkOut;
    document.getElementById('shift-active').checked = isActive;
    
    document.getElementById('shiftModal').style.display = 'flex';
  }
  
  // Xử lý nút xóa
  if (e.target.classList.contains('delete-btn')) {
    if (confirm('Bạn có chắc muốn xóa ca làm việc này?')) {
      const button = e.target;
      const id = button.dataset.id;
      const row = button.closest('tr');
      
      try {
        fetch(`/api/shifts/${id}`, {
          method: 'DELETE'
        })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            row.remove();
            alert('Xóa ca làm việc thành công!');
          } else {
            alert(data.message || 'Có lỗi xảy ra khi xóa ca làm việc');
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

// Load demo data cho chấm công
function loadDemoAttendance() {
  const attendances = [
    { id: 1, empId: 'NV001', name: 'Nguyễn Văn A', shift: 'Ca sáng', checkIn: '07:55', checkOut: '12:05', status: 'Đúng giờ' },
    { id: 2, empId: 'NV002', name: 'Trần Thị B', shift: 'Ca sáng', checkIn: '08:10', checkOut: '11:50', status: 'Đi muộn' },
    { id: 3, empId: 'NV003', name: 'Lê Văn C', shift: 'Ca chiều', checkIn: '13:05', checkOut: '16:45', status: 'Về sớm' }
  ];
  
  const tbody = document.getElementById('attendance-list');
  tbody.innerHTML = '';
  
  attendances.forEach(att => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${att.empId}</td>
      <td>${att.name}</td>
      <td>${att.shift}</td>
      <td>${att.checkIn}</td>
      <td>${att.checkOut}</td>
      <td>${att.status}</td>
      <td class="action-buttons">
        <button class="edit-btn" data-id="${att.id}">Sửa</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

// Load demo data cho khiếu nại
function loadDemoComplaints() {
  const complaints = [
    { id: 1, employee: 'Nguyễn Văn A', date: '15/05/2023', content: 'Máy chấm công lỗi, không nhận diện được khuôn mặt', status: 'Đang xử lý' },
    { id: 2, employee: 'Trần Thị B', date: '12/05/2023', content: 'Chấm công không đúng giờ làm việc', status: 'Đã xử lý' }
  ];
  
  const tbody = document.getElementById('complaints-list');
  tbody.innerHTML = '';
  
  complaints.forEach(comp => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${comp.id}</td>
      <td>${comp.employee}</td>
      <td>${comp.date}</td>
      <td>${comp.content}</td>
      <td>${comp.status}</td>
      <td class="action-buttons">
        <button class="edit-btn" data-id="${comp.id}">Xử lý</button>
      </td>
    `;
    tbody.appendChild(row);
  });
} 