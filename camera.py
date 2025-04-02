from ai import detect_face, predict, train
from tools import checkin
import threading
import numpy as np
import base64
import cv2
import time
import json

APPLY_ATTENDANCE = 2
APPLY_COOLDOWN = 3.5
APPLY_TRAIN = 10
STEP = 50
SCALE = 3
QUALITY = 70

video_capture = None
latest_frame = None
frame_lock = threading.Lock()
camera_thread = None
thread_running = False

directions = [
    "Giữ nguyên khuôn mặt",
    "Vui lòng nghiêng nhẹ sang trái",
    "Vui lòng nghiêng nhẹ sang phải",
    "Vui lòng ngẩng nhẹ lên trên",
]

def init_camera():
    global video_capture, camera_thread, thread_running

    # Khởi tạo camera nếu chưa có
    if video_capture is None or not video_capture.isOpened():
        video_capture = cv2.VideoCapture(0)
        video_capture.set(cv2.CAP_PROP_FRAME_WIDTH, 800)
        video_capture.set(cv2.CAP_PROP_FRAME_HEIGHT, 600)
        video_capture.set(cv2.CAP_PROP_FPS, 60)
        video_capture.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        video_capture.set(cv2.CAP_PROP_AUTOFOCUS, 0)
        video_capture.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc(*'MJPG'))

    # Kiểm tra nếu thread chưa chạy thì mới khởi động
    if camera_thread is None or not camera_thread.is_alive():
        thread_running = True
        camera_thread = threading.Thread(target=capture_frames, daemon=True)
        camera_thread.start()
        print("Camera thread started.")

def capture_frames():
    global latest_frame, thread_running
    while thread_running:
        ret, frame = video_capture.read()
        if not ret:
            continue
        frame = cv2.flip(frame, 1)
        with frame_lock:
            latest_frame = frame

def stop_camera():
    global video_capture, camera_thread, thread_running

    # Dừng thread
    if thread_running:
        thread_running = False
        if camera_thread is not None and camera_thread.is_alive():
            camera_thread.join() #đợi thread kết thúc
            print("Camera thread stopped.")
        camera_thread = None

    # Giải phóng camera
    if video_capture is not None and video_capture.isOpened():
        video_capture.release()
        print("Camera released.")
        video_capture = None

def generate_predict_camera():
    global video_capture, APPLY_ATTENDANCE, APPLY_COOLDOWN, SCALE, QUALITY, latest_frame, thread_running
    init_camera()
    attendance_successful = False
    prev_label, label_start_time = None, None
    prev_time = time.time()
    attendance_cooldown = 0

    while thread_running: 
        image = None
        with frame_lock:
            if latest_frame is None:
                continue
            image = latest_frame.copy()
        
        curr_time = time.time()
        elapsed_time = curr_time - prev_time
        fps = 1 / elapsed_time if elapsed_time > 0 else 0
        prev_time = curr_time

        if curr_time < attendance_cooldown:
            time.sleep(0.02)
            continue

        h, w = image.shape[:2]
        small_image = cv2.resize(image, (w // SCALE, h // SCALE))
        result = detect_face(small_image)
        bbox, face = None, None

        if result is not None:
            face, bbox = result

        predicted_label = None
        if bbox is not None and face is not None:
            x1, y1 = bbox[0]
            x2, y2 = bbox[2]
            x1, y1 = int(x1 * SCALE), int(y1 * SCALE)
            x2, y2 = int(x2 * SCALE), int(y2 * SCALE)
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
        
        ret, buffer = cv2.imencode('.jpeg', image, [cv2.IMWRITE_JPEG_QUALITY, QUALITY])
        if not ret:
            continue
        frame_binary = base64.b64encode(buffer).decode('utf-8')
        data = { "image": frame_binary }

        if attendance_successful:
            data["attendance"] = checkin(prev_label)
            data["valid"] = True
            attendance_successful = False
            prev_label = None
            label_start_time = curr_time
            attendance_cooldown = curr_time + APPLY_COOLDOWN

        yield f"data: {json.dumps(data)}\n\n"

def generate_train_camera(label):
    global video_capture, APPLY_TRAIN, STEP, SCALE, latest_frame, thread_running
    init_camera()

    start_time = prev_time = last_speak_time = time.time()
    speak_count = frame_count = 0
    training = True
    notice = True
    saved_faces = []

    while thread_running and training:
        image = None
        with frame_lock:
            if latest_frame is None:
                continue
            image = latest_frame.copy()
        raw_image = image.copy()
        curr_time = time.time()
        fps = 1 / (curr_time - prev_time) if curr_time > prev_time else 0
        prev_time = curr_time
        h, w = image.shape[:2]
        small_image = cv2.resize(image, (w // SCALE, h // SCALE))
        result = detect_face(small_image)
        bbox = None
        face = None
        data = dict()

        if result is not None:
            face, bbox = result

        if bbox is not None and face is not None:
            x1, y1 = bbox[0]
            x2, y2 = bbox[2]
            x1, y1 = int(x1 * SCALE), int(y1 * SCALE)
            x2, y2 = int(x2 * SCALE), int(y2 * SCALE)
            cv2.rectangle(image, (x1, y1), (x2, y2), (0, 255, 0), 2)

            if frame_count % STEP == 0:
                cropped_face = raw_image[y1:y2, x1:x2]
                saved_faces.append(cropped_face)

        cv2.putText(image, f"FPS: {fps:.2f}", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)        
        
        if (curr_time - last_speak_time >= 2.5 or speak_count == 0) and speak_count < len(directions):
            data["speech"] = directions[speak_count]
            last_speak_time, speak_count = curr_time, speak_count + 1

        if (curr_time - start_time >= APPLY_TRAIN - 0.2):
            black_image = np.zeros((600, 800, 3), dtype=np.uint8)
            _, buffer = cv2.imencode('.jpg', black_image)
            if notice == True:
                data["speech"] = "Đang xử lí"
                notice = False
        else:
            _, buffer = cv2.imencode('.jpg', image, [cv2.IMWRITE_JPEG_QUALITY, QUALITY])
        
        data['image'] = base64.b64encode(buffer).decode('utf-8')
        
        if curr_time - start_time >= APPLY_TRAIN:
            data["message"] = "Success"
            print(len(saved_faces))
            train(saved_faces, label)
            training = False

        yield f"data: {json.dumps(data)}\n\n"
        frame_count += 1

def generate_complaint_camera():
    global video_capture, QUALITY, latest_frame, thread_running
    init_camera()
    while latest_frame is None:
        time.sleep(0.1) 
    image = latest_frame.copy()
    image = cv2.resize(latest_frame, (300, 200))
    _, buffer = cv2.imencode('.jpeg', image)
    frame_binary = base64.b64encode(buffer).decode('utf-8')
    return frame_binary
    
def train_via_video(video_path, label):
    global SCALE
    cap = cv2.VideoCapture(video_path)
    saved_faces = []
    frame_count = 0
    while True:
        ret, frame = cap.read()
        if not ret:
            break

        h, w = frame.shape[:2]
        small_image = cv2.resize(frame, (w // SCALE, h // SCALE))
        result = detect_face(small_image)
        bbox = None
        face = None

        if result is not None:
            face, bbox = result

        if bbox is not None and face is not None:
            x1, y1 = bbox[0]
            x2, y2 = bbox[2]
            x1, y1 = int(x1 * SCALE), int(y1 * SCALE)
            x2, y2 = int(x2 * SCALE), int(y2 * SCALE)
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
            if frame_count % 5 == 0:
                cropped_face = frame[y1:y2, x1:x2]
                saved_faces.append(cropped_face)

        if len(saved_faces) == 30: break
        frame_count += 1
    cap.release()
    if saved_faces:
        train(saved_faces, label)
        return True
