import cv2
import base64
from ai import detect_face, predict, train
import time
import json
video_capture = None

def init_camera():
    global video_capture
    if video_capture is None or not video_capture.isOpened():
        video_capture = cv2.VideoCapture(0)
        video_capture.set(cv2.CAP_PROP_FRAME_WIDTH, 800)
        video_capture.set(cv2.CAP_PROP_FRAME_HEIGHT, 600)
        video_capture.set(cv2.CAP_PROP_FPS, 30)
        video_capture.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        video_capture.set(cv2.CAP_PROP_AUTOFOCUS, 0)
        video_capture.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc(*'MJPG'))
        video_capture.set(cv2.CAP_PROP_AUTO_EXPOSURE, 0.25)
        video_capture.set(cv2.CAP_PROP_SETTINGS, 1)
    return True

def generate_predict_camera():
    global video_capture
    init_camera()
    attendance_successful = False
    prev_label = None
    label_start_time = None
    prev_time = time.time()

    while True:
        ret, image = video_capture.read()
        if not ret:
            continue
        curr_time = time.time()
        fps = 1 / (curr_time - prev_time)
        prev_time = curr_time
        
        result = detect_face(image)
        bbox = None
        face = None

        if result is not None:
            face, bbox = result
        
        predicted_label = None
        if bbox is not None and face is not None:
            x1, y1 = bbox[0]
            x2, y2 = bbox[2]
            cv2.rectangle(image, (x1, y1), (x2, y2), (0, 255, 0), 2)
            predicted_label = predict(face)

            if predicted_label:
                cv2.putText(image, predicted_label, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 2)
        cv2.putText(image, f"FPS: {fps:.2f}", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)

        if predicted_label:
            if predicted_label == prev_label:
                if label_start_time is None:
                    label_start_time = time.time()
                elif time.time() - label_start_time >= 5:
                    attendance_successful = True
            else:
                prev_label = predicted_label
                label_start_time = time.time()
        else:
            prev_label = None
            label_start_time = None
        
        ret, buffer = cv2.imencode('.jpeg', image, [cv2.IMWRITE_JPEG_QUALITY, 80])
        if not ret: continue
        frame_binary = base64.b64encode(buffer).decode('utf-8')
        data = {
            "image": frame_binary
        }
        if attendance_successful:
            data["message"] = prev_label
            attendance_successful = False
            prev_label = None
            label_start_time = time.time()

        yield f"data: {json.dumps(data)}\n\n"

def generate_train_camera(label):
    global video_capture
    init_camera()
    start_time = time.time()
    prev_time = start_time
    saved_faces = []
    frame_count = 0
    training = True

    while training: 
        ret, image = video_capture.read()
        if not ret:
            continue
        curr_time = time.time()
        fps = 1 / (curr_time - prev_time)
        prev_time = curr_time
        frame_count += 1
        
        result = detect_face(image)
        bbox = None
        face = None

        if result is not None:
            face, bbox = result
        
        if bbox is not None and face is not None:
            x1, y1 = bbox[0]
            x2, y2 = bbox[2]
            cv2.rectangle(image, (x1, y1), (x2, y2), (0, 255, 0), 2)

            if frame_count % 5 == 0:
                _, buffer = cv2.imencode('.jpeg', image, [cv2.IMWRITE_JPEG_QUALITY, 80])
                saved_faces.append(buffer)

        cv2.putText(image, f"FPS: {fps:.2f}", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)

        ret, buffer = cv2.imencode('.jpeg', image, [cv2.IMWRITE_JPEG_QUALITY, 80])
        if not ret: 
            continue
        frame_binary = base64.b64encode(buffer).decode('utf-8')
        data = {"image": frame_binary}

        if time.time() - start_time >= 10:
            training = False
            data["message"] = "Success"

        yield f"data: {json.dumps(data)}\n\n"

    if training == False:
        start_train = time.time()
        train(saved_faces, label)
        print(time.time() - start_train)