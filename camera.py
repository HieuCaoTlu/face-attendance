from ai import detect_face, predict, train
from tools import checkin
import threading
import numpy as np
import base64
import cv2
import time
import json

APPLY_ATTENDANCE = 5
APPLY_COOLDOWN = 3
APPLY_TRAIN = 12
STEP = 50
SCALE = 4

video_capture = None
frame_lock = threading.Lock()
latest_frame = None

directions = [
    "Giữ nguyên khuôn mặt",
    "Vui lòng nghiêng nhẹ sang trái",
    "Vui lòng nghiêng nhẹ sang phải",
    "Vui lòng ngẩng nhẹ lên trên",
]

def init_camera():
    global video_capture
    if video_capture is None or not video_capture.isOpened():
        video_capture = cv2.VideoCapture(0, cv2.CAP_DSHOW)
        video_capture.set(cv2.CAP_PROP_FRAME_WIDTH, 800)
        video_capture.set(cv2.CAP_PROP_FRAME_HEIGHT, 600)
        video_capture.set(cv2.CAP_PROP_FPS, 60)
        video_capture.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        video_capture.set(cv2.CAP_PROP_AUTOFOCUS, 0)
        video_capture.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc(*'MJPG'))
    return True

def capture_frames():
    global latest_frame
    while True:
        ret, frame = video_capture.read()
        if not ret:
            continue
        frame = cv2.flip(frame, 1)
        with frame_lock:
            latest_frame = frame

def generate_predict_camera():
    global video_capture, APPLY_ATTENDANCE, APPLY_COOLDOWN, SCALE, latest_frame
    init_camera()

    capture_thread = threading.Thread(target=capture_frames, daemon=True)
    capture_thread.start()

    attendance_successful = False
    prev_label, label_start_time = None, None
    prev_time = time.time()
    attendance_cooldown = 0
    while True:
        image = None
        with frame_lock:
                if latest_frame is None:
                    continue
                image = latest_frame.copy()
        # ret, image = video_capture.read()
        # if not ret:
        #     continue
        
        # image = cv2.flip(image, 1)
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
        bbox = None
        face = None

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
        
        ret, buffer = cv2.imencode('.jpeg', image, [cv2.IMWRITE_JPEG_QUALITY, 60])
        if not ret:
            continue
        frame_binary = base64.b64encode(buffer).decode('utf-8')
        data = { "image": frame_binary }

        if attendance_successful:
            data["attendance"] = checkin(prev_label)
            data["valid"] =  True
            attendance_successful = False
            prev_label = None
            label_start_time = curr_time
            attendance_cooldown = curr_time + APPLY_COOLDOWN

        yield f"data: {json.dumps(data)}\n\n"

def generate_train_camera(label):
    global video_capture, APPLY_TRAIN, STEP, SCALE
    
    init_camera()

    capture_thread = threading.Thread(target=capture_frames, daemon=True)
    capture_thread.start()

    start_time = prev_time = last_speak_time = time.time()
    speak_count = frame_count = 0
    training = True
    notice = True
    saved_faces = []

    while training:
        # ret, image = video_capture.read()
        # if not ret: continue

        # image = cv2.flip(image, 1)
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
                ret, face_buffer = cv2.imencode('.jpeg', cropped_face, [cv2.IMWRITE_JPEG_QUALITY, 60])
                if ret:
                    saved_faces.append(face_buffer)

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
            _, buffer = cv2.imencode('.jpg', image, [cv2.IMWRITE_JPEG_QUALITY, 60])
        
        data['image'] = base64.b64encode(buffer).decode('utf-8')
        
        if curr_time - start_time >= APPLY_TRAIN:
            data["message"] = "Success"
            train(saved_faces, label)
            training = False

        yield f"data: {json.dumps(data)}\n\n"
        frame_count += 1

    