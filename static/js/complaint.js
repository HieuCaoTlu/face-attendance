// Tách các hàm xử lý khiếu nại từ predict.js
// Biến lưu hình ảnh hiện tại
let currentImageBase64 = null;

// Lấy tham chiếu các phần tử DOM
const complaintModal = document.getElementById("complaintModal");
const complaintImage = document.getElementById("complaint-image");
const complainEmployeeId = document.getElementById("complaint-employee-id");
const complainEmployeeName = document.getElementById("complaint-employee-name");
const complainTime = document.getElementById("complaint-time");
const complainReason = document.getElementById("complaint-reason");
const retakePhotoBtn = document.getElementById("retake-photo");
const sendComplaintBtn = document.getElementById("send-complaint");
const cancelComplaintBtn = document.getElementById("cancel-complaint");
const complaintBtn = document.getElementById("complaint-btn");

// Hàm xử lý ảnh để loại bỏ FPS và hiển thị trong modal khiếu nại
function processAndDisplayComplaintImage(base64Image) {
  // Tạo một canvas tạm thời để xử lý ảnh
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');
  const img = new Image();
  
  img.onload = function() {
    // Đặt kích thước canvas bằng kích thước ảnh
    tempCanvas.width = img.width;
    tempCanvas.height = img.height;
    
    // Vẽ ảnh lên canvas
    tempCtx.drawImage(img, 0, 0);
    
    // Loại bỏ FPS bằng cách vẽ một hình chữ nhật đen đè lên
    tempCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    tempCtx.fillRect(0, 0, 150, 30); // Điều chỉnh kích thước để phủ vùng FPS
    
    // Chuyển đổi canvas thành base64 và hiển thị
    complaintImage.src = tempCanvas.toDataURL('image/jpeg');
    
    // Hiển thị modal
    const modal = new bootstrap.Modal(document.getElementById('complaintModal'));
    modal.show();
  };
  
  // Đặt nguồn cho ảnh
  img.src = `data:image/jpeg;base64,${base64Image}`;
}

// Export hàm processAndDisplayComplaintImage để module khác có thể gọi
window.processAndDisplayComplaintImage = processAndDisplayComplaintImage;

// Khởi tạo các sự kiện khi DOM đã sẵn sàng
document.addEventListener('DOMContentLoaded', function() {
  // Xử lý nút khiếu nại
  if (complaintBtn) {
    complaintBtn.addEventListener("click", () => {
      // Lấy ảnh từ predict.js
      currentImageBase64 = window.currentImageBase64;
      
      if (!currentImageBase64) {
        Swal.fire({
          title: 'Lỗi!',
          text: 'Không thể chụp ảnh. Vui lòng thử lại sau.',
          icon: 'error',
          confirmButtonColor: '#3085d6',
          confirmButtonText: 'Đóng'
        });
        return;
      }

      // Xử lý ảnh để loại bỏ FPS trước khi hiển thị
      processAndDisplayComplaintImage(currentImageBase64);
      
      // Thiết lập thời gian hiện tại
      const now = new Date();
      const formattedDateTime = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
      complainTime.value = formattedDateTime;
      
      // Reset các trường khác
      complainEmployeeId.value = '';
      complainEmployeeName.value = '';
      complainReason.value = '';
    });
  }

  // Lấy thông tin nhân viên khi nhập ID
  if (complainEmployeeId) {
    complainEmployeeId.addEventListener('blur', async () => {
      const employeeId = complainEmployeeId.value.trim();
      if (!employeeId) return;
      
      try {
        const response = await fetch(`/api/employees/${employeeId}`);
        const data = await response.json();
        
        if (response.ok && data.success) {
          complainEmployeeName.value = data.name || '';
        } else {
          complainEmployeeName.value = 'Không tìm thấy nhân viên';
        }
      } catch (error) {
        console.error('Lỗi khi lấy thông tin nhân viên:', error);
      }
    });
  }

  // Xử lý nút chụp lại
  if (retakePhotoBtn) {
    retakePhotoBtn.addEventListener('click', () => {
      // Lấy ảnh từ predict.js
      currentImageBase64 = window.currentImageBase64;
      
      if (!currentImageBase64) {
        Swal.fire({
          title: 'Lỗi!',
          text: 'Không thể chụp ảnh. Vui lòng thử lại sau.',
          icon: 'error',
          confirmButtonColor: '#3085d6',
          confirmButtonText: 'Đóng'
        });
        return;
      }

      // Xử lý ảnh để loại bỏ FPS trước khi hiển thị
      processAndDisplayComplaintImage(currentImageBase64);
      
      // Thiết lập thời gian hiện tại
      const now = new Date();
      const formattedDateTime = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
      complainTime.value = formattedDateTime;
      
      // Reset các trường khác
      complainEmployeeId.value = '';
      complainEmployeeName.value = '';
      complainReason.value = '';
    });
  }

  // Xử lý nút gửi khiếu nại
  if (sendComplaintBtn) {
    sendComplaintBtn.addEventListener('click', async () => {
      // Lấy ảnh từ predict.js
      currentImageBase64 = window.currentImageBase64;
      
      // Kiểm tra dữ liệu
      const employeeId = complainEmployeeId.value.trim();
      const reason = complainReason.value;
      
      if (!employeeId) {
        Swal.fire({
          title: 'Thiếu thông tin!',
          text: 'Vui lòng nhập mã nhân viên',
          icon: 'warning',
          confirmButtonColor: '#3085d6',
          confirmButtonText: 'Đóng'
        });
        return;
      }
      
      if (!reason) {
        Swal.fire({
          title: 'Thiếu thông tin!',
          text: 'Vui lòng chọn lý do khiếu nại',
          icon: 'warning',
          confirmButtonColor: '#3085d6',
          confirmButtonText: 'Đóng'
        });
        return;
      }
      
      try {
        // Tạo form data
        const formData = new FormData();
        formData.append('employee_id', employeeId);
        formData.append('reason', reason);
        formData.append('image_data', `data:image/jpeg;base64,${currentImageBase64}`);
        
        // Gửi yêu cầu
        const response = await fetch('/api/complaints', {
          method: 'POST',
          body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
          // Hiển thị thông báo thành công
          Swal.fire({
            title: 'Thành công!',
            text: result.message,
            icon: 'success',
            confirmButtonColor: '#3085d6',
            confirmButtonText: 'Đóng'
          });
          
          // Đóng modal
          const modalInstance = bootstrap.Modal.getInstance(document.getElementById('complaintModal'));
          modalInstance.hide();
        } else {
          // Hiển thị thông báo lỗi
          Swal.fire({
            title: 'Lỗi!',
            text: result.message || 'Không thể gửi khiếu nại. Vui lòng thử lại sau.',
            icon: 'error',
            confirmButtonColor: '#3085d6',
            confirmButtonText: 'Đóng'
          });
        }
      } catch (error) {
        console.error('Lỗi khi gửi khiếu nại:', error);
        Swal.fire({
          title: 'Lỗi!',
          text: 'Không thể gửi khiếu nại. Vui lòng thử lại sau.',
          icon: 'error',
          confirmButtonColor: '#3085d6',
          confirmButtonText: 'Đóng'
        });
      }
    });
  }

  // Xử lý nút hủy
  if (cancelComplaintBtn) {
    cancelComplaintBtn.addEventListener('click', () => {
      // Đóng modal và xóa backdrop
      const modalInstance = bootstrap.Modal.getInstance(document.getElementById('complaintModal'));
      if (modalInstance) {
        modalInstance.hide();
        
        // Đảm bảo backdrop được xóa
        setTimeout(() => {
          const backdrop = document.querySelector('.modal-backdrop');
          if (backdrop) {
            backdrop.remove();
          }
          document.body.classList.remove('modal-open');
          document.body.style.overflow = '';
          document.body.style.paddingRight = '';
        }, 300);
      }
    });
  }

  // Đảm bảo backdrop được xóa khi ẩn modal
  if (complaintModal) {
    complaintModal.addEventListener('hidden.bs.modal', function() {
      const backdrop = document.querySelector('.modal-backdrop');
      if (backdrop) {
        backdrop.remove();
      }
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    });
  }
});
