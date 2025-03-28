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
  
  // Mở modal thêm nhân viên
  document.getElementById('add-employee-btn').addEventListener('click', () => {
    document.getElementById('employee-modal-title').textContent = 'Thêm nhân viên mới';
    employeeForm.reset();
    document.getElementById('employee-id').value = '';
    employeeModal.style.display = 'flex';
  });
  
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
  employeeForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const employeeId = document.getElementById('employee-id').value;
    const name = document.getElementById('employee-name').value;
    const position = document.getElementById('employee-position').value;
    
    // TODO: Gửi API thêm/sửa nhân viên
    
    // Fake data để demo
    if (!employeeId) {
      // Thêm mới
      const newId = employeeList.children.length + 1;
      appendEmployeeRow(newId, name, position);
    } else {
      // Cập nhật
      // TODO: Cập nhật row trong bảng
      alert('Đã cập nhật nhân viên!');
    }
    
    employeeModal.style.display = 'none';
  });
  
  // Load danh sách nhân viên demo
  loadDemoEmployees();

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
  
  // Load danh sách ca làm việc demo
  loadDemoShifts();

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
  row.innerHTML = `
    <td>${id}</td>
    <td>${name}</td>
    <td>${position}</td>
    <td>
      <button class="edit-btn" data-id="${id}" data-name="${name}" data-position="${position}">Sửa</button>
      <button class="delete-btn" data-id="${id}">Xóa</button>
    </td>
  `;
  
  document.getElementById('employee-list').appendChild(row);
  
  // Thêm event listeners cho các nút
  const editBtn = row.querySelector('.edit-btn');
  const deleteBtn = row.querySelector('.delete-btn');
  
  editBtn.addEventListener('click', function() {
    const id = this.dataset.id;
    const name = this.dataset.name;
    const position = this.dataset.position;
    
    document.getElementById('employee-modal-title').textContent = 'Sửa nhân viên';
    document.getElementById('employee-id').value = id;
    document.getElementById('employee-name').value = name;
    document.getElementById('employee-position').value = position;
    
    document.getElementById('employeeModal').style.display = 'flex';
  });
  
  deleteBtn.addEventListener('click', function() {
    if (confirm('Bạn có chắc muốn xóa nhân viên này?')) {
      // TODO: Gửi API xóa
      row.remove();
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
    <td>
      <button class="edit-btn" data-id="${id}" data-name="${name}" 
        data-checkin="${checkIn}" data-checkout="${checkOut}" data-active="${isActive}">Sửa</button>
      <button class="delete-btn" data-id="${id}">Xóa</button>
    </td>
  `;
  
  document.getElementById('shifts-list').appendChild(row);
  
  // Thêm event listeners cho các nút
  const editBtn = row.querySelector('.edit-btn');
  const deleteBtn = row.querySelector('.delete-btn');
  
  editBtn.addEventListener('click', function() {
    const id = this.dataset.id;
    const name = this.dataset.name;
    const checkIn = this.dataset.checkin;
    const checkOut = this.dataset.checkout;
    const isActive = this.dataset.active === 'true';
    
    document.getElementById('shift-modal-title').textContent = 'Sửa ca làm việc';
    document.getElementById('shift-id').value = id;
    document.getElementById('shift-name').value = name;
    document.getElementById('shift-check-in').value = checkIn;
    document.getElementById('shift-check-out').value = checkOut;
    document.getElementById('shift-active').checked = isActive;
    
    document.getElementById('shiftModal').style.display = 'flex';
  });
  
  deleteBtn.addEventListener('click', function() {
    if (confirm('Bạn có chắc muốn xóa ca làm việc này?')) {
      // TODO: Gửi API xóa
      row.remove();
    }
  });
}

// Load demo employees
function loadDemoEmployees() {
  const demoEmployees = [
    { id: 1, name: 'Nguyễn Văn A', position: 'Nhân viên' },
    { id: 2, name: 'Trần Thị B', position: 'Kế toán' },
    { id: 3, name: 'Lê Văn C', position: 'IT' }
  ];
  
  demoEmployees.forEach(emp => {
    appendEmployeeRow(emp.id, emp.name, emp.position);
  });
}

// Load demo shifts
function loadDemoShifts() {
  const demoShifts = [
    { id: 1, name: 'Ca sáng', checkIn: '08:00', checkOut: '12:00', active: true },
    { id: 2, name: 'Ca chiều', checkIn: '13:00', checkOut: '17:00', active: true },
    { id: 3, name: 'Ca tối', checkIn: '18:00', checkOut: '22:00', active: false }
  ];
  
  demoShifts.forEach(shift => {
    appendShiftRow(shift.id, shift.name, shift.checkIn, shift.checkOut, shift.active);
  });
}

// Load demo attendance data
function loadDemoAttendance() {
  const attendanceList = document.getElementById('attendance-list');
  attendanceList.innerHTML = '';
  
  const demoAttendance = [
    { id: 1, name: 'Nguyễn Văn A', shift: 'Ca sáng', checkIn: '08:10', checkOut: '12:00', status: 'Đi muộn' },
    { id: 2, name: 'Trần Thị B', shift: 'Ca sáng', checkIn: '07:55', checkOut: '12:00', status: 'Đúng giờ' },
    { id: 3, name: 'Lê Văn C', shift: 'Ca chiều', checkIn: '13:00', checkOut: '16:45', status: 'Về sớm' }
  ];
  
  demoAttendance.forEach(att => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${att.id}</td>
      <td>${att.name}</td>
      <td>${att.shift}</td>
      <td>${att.checkIn}</td>
      <td>${att.checkOut}</td>
      <td>${att.status}</td>
      <td>
        <button class="edit-btn">Sửa</button>
      </td>
    `;
    attendanceList.appendChild(row);
  });
}

// Load demo complaints
function loadDemoComplaints() {
  const complaintsList = document.getElementById('complaints-list');
  complaintsList.innerHTML = '';
  
  const demoComplaints = [
    { id: 1, employee: 'Nguyễn Văn A', date: '2023-05-15', content: 'Máy chấm công lỗi, không nhận diện', status: 'Đang xử lý' },
    { id: 2, employee: 'Trần Thị B', date: '2023-05-14', content: 'Đã chấm công nhưng không được ghi nhận', status: 'Đã xử lý' }
  ];
  
  demoComplaints.forEach(comp => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${comp.id}</td>
      <td>${comp.employee}</td>
      <td>${comp.date}</td>
      <td>${comp.content}</td>
      <td>${comp.status}</td>
      <td>
        <button class="resolve-btn" data-id="${comp.id}">
          ${comp.status === 'Đang xử lý' ? 'Xử lý' : 'Chi tiết'}
        </button>
      </td>
    `;
    complaintsList.appendChild(row);
  });
} 