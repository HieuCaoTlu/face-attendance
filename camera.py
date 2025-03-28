import cv2
import base64
from ai import detect_face, predict, train
import time
import json
import threading
import atexit
from collections import deque
from tools import checkin
from utils.speech import text_to_speech
import numpy as np
import os

APPLY_ATTENDANCE = 5
APPLY_COOLDOWN = 5
APPLY_TRAIN = 12

# Tạo class SingletonCamera để duy trì trạng thái camera giữa các request
class SingletonCamera:
    _instance = None
    _lock = threading.Lock()
    
    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = cls()
        return cls._instance
    
    def __init__(self):
        self.video_capture = None
        self.camera_lock = threading.Lock()
        self.camera_is_running = False
        self.camera_init_time = 0
        self.last_frame = None
        self.global_frame_count = 0
        self.keep_alive_thread = None
        
        # Sử dụng file lock để đảm bảo chỉ có một tiến trình có thể mở camera
        self.lock_file_path = os.path.join(os.path.dirname(__file__), 'camera.lock')
        try:
            with open(self.lock_file_path, 'w') as f:
                f.write(str(os.getpid()))
        except Exception as e:
            print(f"Không thể tạo file lock: {e}")
        
        # Đăng ký hàm giải phóng khi thoát
        atexit.register(self.release_camera)
    
    def camera_keep_alive(self):
        try:
            while self.camera_is_running:
                if self.video_capture is not None and self.video_capture.isOpened():
                    try:
                        ret, frame = self.video_capture.read()
                        if ret and frame is not None:
                            with self.camera_lock:
                                self.last_frame = frame.copy()
                                self.global_frame_count += 1
                        else:
                            # Nếu không đọc được frame, thử lại
                            time.sleep(0.05)
                    except Exception as e:
                        print(f"Lỗi khi đọc frame trong thread keep-alive: {e}")
                        time.sleep(0.1)
                else:
                    time.sleep(0.1)
        except Exception as e:
            print(f"Lỗi trong thread keep-alive: {e}")
    
    def is_camera_in_use(self):
        """Kiểm tra xem camera có đang được sử dụng bởi tiến trình khác không"""
        try:
            # Kiểm tra file lock có tồn tại không
            if not os.path.exists(self.lock_file_path):
                return False
                
            # Đọc PID từ file lock
            with open(self.lock_file_path, 'r') as f:
                pid = int(f.read().strip())
                
            # Kiểm tra PID có hợp lệ không và có phải tiến trình hiện tại không
            if pid == os.getpid():
                return False
                
            # Kiểm tra tiến trình có tồn tại không
            try:
                os.kill(pid, 0)  # Gửi tín hiệu 0 để kiểm tra tiến trình tồn tại
                return True  # Tiến trình tồn tại và đang sử dụng camera
            except OSError:
                # Tiến trình không tồn tại, ghi đè file lock
                with open(self.lock_file_path, 'w') as f:
                    f.write(str(os.getpid()))
                return False
        except Exception as e:
            print(f"Lỗi khi kiểm tra camera đang sử dụng: {e}")
            return False
    
    def release_camera(self):
        # Dừng thread giữ kết nối
        self.camera_is_running = False
        if self.keep_alive_thread is not None and self.keep_alive_thread.is_alive():
            self.keep_alive_thread.join(timeout=0.5)
        
        with self.camera_lock:
            if self.video_capture is not None:
                try:
                    self.video_capture.release()
                    print("Camera đã được giải phóng")
                except Exception as e:
                    print(f"Lỗi khi giải phóng camera: {e}")
                finally:
                    self.video_capture = None
        
        # Xóa file lock
        try:
            if os.path.exists(self.lock_file_path):
                os.remove(self.lock_file_path)
        except Exception as e:
            print(f"Lỗi khi xóa file lock: {e}")
    
    def init_camera(self, force=False):
        # Kiểm tra xem camera đã được khởi tạo gần đây chưa
        current_time = time.time()
        
        # Nếu camera đang chạy tốt và chưa hết hạn, sử dụng lại
        if not force and self.camera_is_running and self.video_capture is not None and self.video_capture.isOpened():
            if current_time - self.camera_init_time < 300:  # Tăng thời gian lên 5 phút
                print("Camera đã được khởi tạo gần đây, tiếp tục sử dụng")
                return True
        
        # Kiểm tra xem camera có đang được sử dụng bởi tiến trình khác không
        if self.is_camera_in_use():
            print("Camera đang được sử dụng bởi tiến trình khác")
            # Trả về False để báo lỗi
            return False
        
        with self.camera_lock:
            # Nếu camera đang mở, giải phóng trước khi mở lại
            if self.video_capture is not None:
                try:
                    self.video_capture.release()
                    print("Giải phóng camera cũ trước khi khởi tạo lại")
                except Exception as e:
                    print(f"Lỗi khi giải phóng camera cũ: {e}")
                self.video_capture = None
            
            # Thử mở camera với DirectShow để tăng tốc độ mở (chỉ với Windows)
            try:
                # Trên Windows
                if os.name == 'nt':
                    self.video_capture = cv2.VideoCapture(0, cv2.CAP_DSHOW)
                else:
                    # Trên Linux/Mac
                    self.video_capture = cv2.VideoCapture(0)
                
                # Thiết lập camera với cấu hình cao
                self.video_capture.set(cv2.CAP_PROP_FRAME_WIDTH, 800)
                self.video_capture.set(cv2.CAP_PROP_FRAME_HEIGHT, 600)
                self.video_capture.set(cv2.CAP_PROP_FPS, 60)
                self.video_capture.set(cv2.CAP_PROP_BUFFERSIZE, 3)
                
                # Thêm các tùy chọn để tăng tốc độ mở camera
                if os.name == 'nt':  # Chỉ với Windows
                    self.video_capture.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc(*'MJPG'))
                
                # Kiểm tra xem camera có mở thành công không
                if not self.video_capture.isOpened():
                    print("Không thể mở camera với DirectShow, thử cách khác")
                    self.video_capture = cv2.VideoCapture(0)
                    self.video_capture.set(cv2.CAP_PROP_FRAME_WIDTH, 800)
                    self.video_capture.set(cv2.CAP_PROP_FRAME_HEIGHT, 600)
                    self.video_capture.set(cv2.CAP_PROP_FPS, 60)
                    self.video_capture.set(cv2.CAP_PROP_BUFFERSIZE, 3)
                
                # Đọc frame đầu tiên để kiểm tra camera có hoạt động không
                start_time = time.time()
                max_retry = 5
                retry = 0
                
                while retry < max_retry:
                    ret, _ = self.video_capture.read()
                    if ret:
                        break
                    
                    print(f"Thử đọc frame lần {retry+1}/{max_retry}")
                    retry += 1
                    time.sleep(0.1)
                
                if retry >= max_retry:
                    print("Không thể đọc frame từ camera sau nhiều lần thử")
                    return False
                
                print(f"Đã mở camera sau {time.time() - start_time:.2f} giây")
                
                self.camera_is_running = True
                self.camera_init_time = current_time
                
                # Khởi động thread giữ kết nối camera
                if self.keep_alive_thread is None or not self.keep_alive_thread.is_alive():
                    self.keep_alive_thread = threading.Thread(target=self.camera_keep_alive, daemon=True)
                    self.keep_alive_thread.start()
                    
                print(f"Khởi tạo camera thành công (FPS: 60)")
                return True
                
            except Exception as e:
                print(f"Lỗi khi khởi tạo camera: {e}")
                if self.video_capture is not None:
                    try:
                        self.video_capture.release()
                    except:
                        pass
                self.video_capture = None
                self.camera_is_running = False
                return False
    
    def get_frame(self):
        """Đọc frame từ camera một cách an toàn với xử lý lỗi"""
        # Nếu camera chưa mở, thử khởi tạo
        if not self.camera_is_running or self.video_capture is None or not self.video_capture.isOpened():
            if not self.init_camera():
                # Tạo một frame trống nếu không thể khởi tạo camera
                empty_frame = create_error_frame("Không thể kết nối với camera")
                return False, empty_frame
        
        # Sử dụng frame từ thread keep-alive nếu có
        with self.camera_lock:
            if self.last_frame is not None:
                return True, self.last_frame.copy()
        
        # Nếu không có frame từ thread, đọc trực tiếp
        try:
            ret, frame = self.video_capture.read()
            if not ret or frame is None:
                # Thử khởi tạo lại camera nếu đọc frame thất bại
                print("Đọc frame thất bại, thử khởi tạo lại camera")
                if self.init_camera(force=True):
                    ret, frame = self.video_capture.read()
                    if not ret or frame is None:
                        empty_frame = create_error_frame("Lỗi khi đọc frame từ camera")
                        return False, empty_frame
                else:
                    empty_frame = create_error_frame("Không thể kết nối lại với camera")
                    return False, empty_frame
            return ret, frame
        except Exception as e:
            print(f"Lỗi khi đọc frame: {e}")
            empty_frame = create_error_frame(f"Lỗi: {str(e)}")
            return False, empty_frame

# Khởi tạo singleton camera
camera = SingletonCamera.get_instance()

directions = [
    "Giữ nguyên khuôn mặt",
    "Hãy cười một cái nào",
    "Vui lòng nghiêng nhẹ sang trái",
    "Vui lòng nghiêng nhẹ sang phải",
]

def create_error_frame(error_message):
    """Tạo một frame hiển thị thông báo lỗi"""
    frame = 255 * np.ones((600, 800, 3), dtype=np.uint8)  # Frame trắng với độ phân giải cao hơn
    cv2.putText(frame, error_message, (50, 300), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
    cv2.putText(frame, "Đang kết nối lại...", (50, 350), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
    return frame

def generate_predict_camera():
    global APPLY_ATTENDANCE, APPLY_COOLDOWN
    
    # Khởi tạo biến frame_binary với giá trị mặc định
    default_error_frame = create_error_frame("Đang khởi tạo camera...")
    ret, buffer = cv2.imencode('.jpeg', default_error_frame, [cv2.IMWRITE_JPEG_QUALITY, 60])
    frame_binary = base64.b64encode(buffer).decode('utf-8') if ret else ""
    
    if not camera.init_camera():
        # Nếu không thể khởi tạo camera, trả về thông báo lỗi
        error_frame = create_error_frame("Không thể khởi tạo camera")
        ret, buffer = cv2.imencode('.jpeg', error_frame, [cv2.IMWRITE_JPEG_QUALITY, 60])
        if ret:
            frame_binary = base64.b64encode(buffer).decode('utf-8')
            yield f"data: {json.dumps({'image': frame_binary, 'error': 'Không thể kết nối với camera'})}\n\n"
        return
    
    attendance_successful = False
    prev_label, label_start_time = None, None
    prev_time = time.time()
    attendance_cooldown = 0
    frame_skip_counter = 0  # Đếm số frame để bỏ qua một số frame

    try:
        while True:
            # Tăng hiệu suất bằng cách bỏ qua một số frame
            frame_skip_counter += 1
            if frame_skip_counter % 2 != 0:  # Chỉ xử lý 1 frame và bỏ qua 1 frame
                # Ngủ ngắn để giảm tải CPU
                time.sleep(0.01)
                continue
            
            ret, image = camera.get_frame()
            if not ret:
                # Tạo frame thông báo lỗi
                error_data = {'image': frame_binary, 'error': 'Lỗi camera, đang kết nối lại...'}
                yield f"data: {json.dumps(error_data)}\n\n"
                time.sleep(0.5)  # Đợi nửa giây trước khi thử lại
                continue
            
            try:
                image = cv2.flip(image, 1)
                curr_time = time.time()
                elapsed_time = curr_time - prev_time
                fps = 1 / elapsed_time if elapsed_time > 0 else 0
                prev_time = curr_time

                if curr_time < attendance_cooldown:
                    cv2.putText(image, "Cooldown...", (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
                    ret, buffer = cv2.imencode('.jpeg', image, [cv2.IMWRITE_JPEG_QUALITY, 75])
                    if not ret:
                        continue
                    frame_binary = base64.b64encode(buffer).decode('utf-8')
                    yield f"data: {json.dumps({'image': frame_binary})}\n\n"
                    continue

                # Giảm kích thước ảnh trước khi xử lý để tăng tốc độ
                h, w = image.shape[:2]
                small_image = cv2.resize(image, (w // 4, h // 4))
                
                # Phát hiện khuôn mặt
                result = detect_face(small_image)
                bbox = None
                face = None

                if result is not None:
                    face, bbox = result
                
                predicted_label = None
                if bbox is not None and face is not None:
                    x1, y1 = bbox[0]
                    x2, y2 = bbox[2]
                    x1, y1 = int(x1 * 4), int(y1 * 4)
                    x2, y2 = int(x2 * 4), int(y2 * 4)
                    cv2.rectangle(image, (x1, y1), (x2, y2), (0, 255, 0), 2)
                    predicted_label = predict(face)

                    if predicted_label:
                        cv2.putText(image, predicted_label, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 2)
                
                cv2.putText(image, f"FPS: {fps:.2f}", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)

                if predicted_label:
                    if predicted_label == prev_label:
                        if label_start_time is None:
                            label_start_time = curr_time
                        elif curr_time - label_start_time >= APPLY_ATTENDANCE:
                            attendance_successful = True
                    else:
                        prev_label, label_start_time = predicted_label, curr_time
                else:
                    prev_label, label_start_time = None, None
                
                # Giữ kích thước ảnh gốc để chất lượng tốt hơn
                ret, buffer = cv2.imencode('.jpeg', image, [cv2.IMWRITE_JPEG_QUALITY, 75])
                if not ret:
                    continue
                
                frame_binary = base64.b64encode(buffer).decode('utf-8')
                data = {"image": frame_binary}

                if attendance_successful:
                    data["attendance"] = checkin(prev_label)
                    data["valid"] = True
                    attendance_successful = False
                    prev_label = None
                    label_start_time = curr_time
                    attendance_cooldown = curr_time + APPLY_COOLDOWN

                yield f"data: {json.dumps(data)}\n\n"
                
            except Exception as e:
                print(f"Lỗi xử lý frame: {e}")
                # Tạo frame thông báo lỗi
                error_frame = create_error_frame(f"Lỗi xử lý: {str(e)}")
                ret, buffer = cv2.imencode('.jpeg', error_frame, [cv2.IMWRITE_JPEG_QUALITY, 60])
                if ret:
                    frame_binary = base64.b64encode(buffer).decode('utf-8')
                    yield f"data: {json.dumps({'image': frame_binary, 'error': str(e)})}\n\n"
                time.sleep(0.3)  # Đợi một chút trước khi thử lại
                
    except GeneratorExit:
        # Khi generator bị đóng (người dùng đóng trang web hoặc chuyển trang)
        print("Generator bị đóng, nhưng giữ kết nối camera")
        # Không giải phóng camera để tái sử dụng
    except Exception as e:
        print(f"Lỗi không mong muốn trong generate_predict_camera: {e}")
        # Vẫn giữ camera chạy

def generate_train_camera(label):
    global APPLY_TRAIN
    
    # Khởi tạo biến frame_binary với giá trị mặc định
    default_error_frame = create_error_frame("Đang khởi tạo camera...")
    ret, buffer = cv2.imencode('.jpeg', default_error_frame, [cv2.IMWRITE_JPEG_QUALITY, 60])
    frame_binary = base64.b64encode(buffer).decode('utf-8') if ret else ""
    
    if not camera.init_camera():
        # Nếu không thể khởi tạo camera, trả về thông báo lỗi
        error_frame = create_error_frame("Không thể khởi tạo camera")
        ret, buffer = cv2.imencode('.jpeg', error_frame, [cv2.IMWRITE_JPEG_QUALITY, 60])
        if ret:
            frame_binary = base64.b64encode(buffer).decode('utf-8')
            yield f"data: {json.dumps({'image': frame_binary, 'error': 'Không thể kết nối với camera'})}\n\n"
        return
    
    start_time = prev_time = last_speak_time = time.time()
    speak_count = frame_count = 0
    training = True
    saved_faces = []
    frame_skip_counter = 0

    try:
        while training:
            # Tăng hiệu suất bằng cách bỏ qua một số frame
            frame_skip_counter += 1
            if frame_skip_counter % 2 != 0:
                time.sleep(0.01)
                continue
                
            ret, image = camera.get_frame()
            if not ret:
                # Tạo frame thông báo lỗi
                error_data = {'image': frame_binary, 'error': 'Lỗi camera, đang kết nối lại...'}
                yield f"data: {json.dumps(error_data)}\n\n"
                time.sleep(0.5)
                continue

            try:
                image = cv2.flip(image, 1)
                raw_image = image.copy()
                curr_time = time.time()
                fps = 1 / (curr_time - prev_time) if curr_time > prev_time else 0
                prev_time = curr_time
                
                # Giảm kích thước ảnh trước khi xử lý để tăng tốc độ
                h, w = image.shape[:2]
                small_image = cv2.resize(image, (w // 4, h // 4))
                
                result = detect_face(small_image)
                bbox = None
                face = None

                if result is not None:
                    face, bbox = result

                if bbox is not None and face is not None:
                    x1, y1 = bbox[0]
                    x2, y2 = bbox[2]
                    x1, y1 = int(x1 * 4), int(y1 * 4)
                    x2, y2 = int(x2 * 4), int(y2 * 4)
                    cv2.rectangle(image, (x1, y1), (x2, y2), (0, 255, 0), 2)

                    if frame_count % 5 == 0:
                        cropped_face = raw_image[y1:y2, x1:x2]
                        ret, face_buffer = cv2.imencode('.jpeg', cropped_face, [cv2.IMWRITE_JPEG_QUALITY, 90])
                        if ret:
                            saved_faces.append(face_buffer)

                cv2.putText(image, f"FPS: {fps:.2f}", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
                
                # Giữ nguyên kích thước ảnh gốc để chất lượng tốt hơn
                ret, buffer = cv2.imencode('.jpeg', image, [cv2.IMWRITE_JPEG_QUALITY, 75])
                
                data = {"image": base64.b64encode(buffer).decode('utf-8')}
                if (curr_time - last_speak_time >= 2.5 or speak_count == 0) and speak_count < len(directions):
                    data["speech"] = directions[speak_count]
                    last_speak_time, speak_count = curr_time, speak_count + 1
                
                if curr_time - start_time >= APPLY_TRAIN:
                    data["message"] = "Success"
                    data["speech"] = "Thành công"
                    training = False

                yield f"data: {json.dumps(data)}\n\n"
                frame_count += 1
                
            except Exception as e:
                print(f"Lỗi xử lý frame trong training: {e}")
                # Tạo frame thông báo lỗi
                error_frame = create_error_frame(f"Lỗi xử lý: {str(e)}")
                ret, buffer = cv2.imencode('.jpeg', error_frame, [cv2.IMWRITE_JPEG_QUALITY, 60])
                if ret:
                    frame_binary = base64.b64encode(buffer).decode('utf-8')
                    yield f"data: {json.dumps({'image': frame_binary, 'error': str(e)})}\n\n"
                time.sleep(0.3)

        # Kết thúc huấn luyện, huấn luyện mô hình với khuôn mặt đã lưu
        if len(saved_faces) > 0:
            train(saved_faces, label)
            
    except GeneratorExit:
        # Khi generator bị đóng (người dùng đóng trang web hoặc chuyển trang)
        print("Generator huấn luyện bị đóng, nhưng giữ kết nối camera")
        # Không giải phóng camera, giữ kết nối cho lần sau
    except Exception as e:
        print(f"Lỗi không mong muốn trong generate_train_camera: {e}")
        # Giữ camera chạy
