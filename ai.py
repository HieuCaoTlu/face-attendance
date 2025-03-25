import os
import cv2
import joblib
import numpy as np
import mediapipe as mp
import onnxruntime as ort
from sklearn.svm import SVC
from database import session, Embedding

model_dir = os.path.join(os.path.dirname(__file__), 'models')
rec_path = os.path.join(model_dir, 'quantized_model.onnx')
cls_path = os.path.join(model_dir, 'face_classifier.pkl')
mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(
    static_image_mode=False,  # False để sử dụng video (dynamic)
    max_num_faces=1,  # Số lượng khuôn mặt tối đa có thể phát hiện trong mỗi khung hình
    refine_landmarks=True,  # Lọc landmarks (điểm mốc) để có độ chính xác cao hơn
    min_detection_confidence=0.5,  # Mức độ tin cậy tối thiểu để phát hiện khuôn mặt
)

def load_model():
    #Kiểm tra sự tồn tại của các thư mục cần thiết
    if not os.path.exists('models'):
        os.makedirs('models')

    #Kiểm tra File ONNX
    rec_model = ort.InferenceSession(rec_path)
    print("Model ONNX sẵn sàng")

    #Kiểm tra File SVC
    if not os.path.exists(cls_path):
        print("File SVC chưa tồn tại, đang tái tạo...")
        cls_model = SVC(kernel='linear', probability=True)
        joblib.dump(cls_model, cls_path)
    cls_model = joblib.load(cls_path)
    print("Model SVC sẵn sàng")

    return rec_model, cls_model

rec_model, cls_model = load_model()

def detect_face(image):
    """
    Phát hiện khuôn mặt trong ảnh và trích xuất vùng mặt.
    - Tham số: ảnh gốc
    - Trả về: ảnh khuôn mặt đã cắt và tọa độ bounding box
    """
    global mp_face_mesh, face_mesh
    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    results = face_mesh.process(image_rgb)
    if results.multi_face_landmarks and len(results.multi_face_landmarks) > 0:
        # Khi phát hiện được mặt, lấy tọa độ, chuẩn hóa tọa độ
        face_landmarks = results.multi_face_landmarks[0].landmark
        img_h, img_w, _ = image.shape
        x_coords = [int(landmark.x * img_w) for landmark in face_landmarks]
        y_coords = [int(landmark.y * img_h) for landmark in face_landmarks]

        # Xác định giới hạn bounding box
        x1, x2 = min(x_coords), max(x_coords)
        y1, y2 = min(y_coords), max(y_coords)
        bbox = np.array([(x1, y1), (x2, y1), (x2, y2), (x1, y2)], dtype=np.int32)
        x1, y1, x2, y2 = max(0, x1), max(0, y1), min(img_w, x2), min(img_h, y2)
        return image[y1:y2, x1:x2], bbox
    return None, None

def train(saved_face, employee_id):
    """
    Huấn luyện model với tập ảnh.
    - Tham số: danh sách ảnh và mã nhân viên
    - Kết quả: trả về huấn luyện thành công
    """
    global cls_model, cls_path, rec_model
    images = []
    for buffer in saved_face:
        image_array = np.frombuffer(buffer, np.uint8)
        image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
        images.append(image)
        
    session.query(Embedding).filter_by(employee_id=employee_id).delete()
    session.commit()
    embeddings, labels = [], []
    # 🔹 Load tất cả embeddings cũ từ database trước khi train
    data = session.query(Embedding).all()
    for item in data:
        embeddings.append(np.frombuffer(item.embedding, dtype=np.float32).tolist())
        labels.append(item.employee_id)

    # 🔹 Thêm embeddings mới vào
    for image in images:
        face, bbox = detect_face(image)
        if face is None: continue
        img = cv2.cvtColor(face, cv2.COLOR_BGR2RGB)
        img = cv2.resize(img, (160, 160))
        img = img.astype('float32') / 255.0
        img = np.transpose(img, (2, 0, 1))
        img = np.expand_dims(img, axis=0)
        output = rec_model.run(None, {rec_model.get_inputs()[0].name: img})
        embedding = output[0][0].tobytes()

        # Lưu vào database
        instance = Embedding(embedding=embedding, employee_id=employee_id)
        session.add(instance)
        session.commit()

        embeddings.append(np.frombuffer(embedding, dtype=np.float32).tolist())
        labels.append(employee_id)

    if len(set(labels)) == 1:
        print("Chỉ có một nhãn duy nhất, thêm embedding giả...")
        dummy_embedding = np.random.rand(len(embeddings[0])).tolist()
        embeddings.append(dummy_embedding)
        labels.append("unknown")

    cls_model = SVC(kernel='linear', probability=True)
    cls_model.fit(embeddings, labels)
    joblib.dump(cls_model, cls_path)
    return {'status': 'Thành công', 'classes': cls_model.classes_.tolist()}

def predict(face, threshold=0.8):
    """
    Dự đoán danh tính khuôn mặt từ ảnh.
    - Đầu vào: ảnh khuôn mặt đã cắt
    - Trả về: employee_id đáp ứng ngưỡng
    """
    global cls_model, rec_model

    # Tiền xử lí ảnh cho mô hình Facenet
    img = cv2.cvtColor(face, cv2.COLOR_BGR2RGB)
    img = cv2.resize(img, (160, 160))
    img = img.astype('float32') / 255.0
    img = np.transpose(img, (2, 0, 1))
    img = np.expand_dims(img, axis=0)
    outputs = rec_model.run(None, {rec_model.get_inputs()[0].name: img})

    # Dự đoán bằng SVC, tính xác suất, kiểm tra ngưỡng rồi dự đoán
    predicted_probs = cls_model.predict_proba(outputs[0])
    confidence, predicted_index = np.max(predicted_probs), np.argmax(predicted_probs, axis=1)[0]
    predicted_label = cls_model.classes_[predicted_index]
    return predicted_label if confidence >= threshold and predicted_label.lower() != "unknown" else ""