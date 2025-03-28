import cv2
import numpy as np

def adjust_brightness(img, value):
    """Tăng/Giảm độ sáng ảnh"""
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    hsv[:, :, 2] = np.clip(hsv[:, :, 2] + value, 0, 255)
    return cv2.cvtColor(hsv, cv2.COLOR_HSV2BGR)

def adjust_contrast(img, alpha):
    """Tăng/Giảm độ tương phản"""
    beta = 128 * (1 - alpha)
    return np.clip(alpha * img + beta, 0, 255).astype(np.uint8)

def rotate_image(img, angle):
    """Xoay nhẹ ảnh"""
    h, w = img.shape[:2]
    center = (w // 2, h // 2)
    M = cv2.getRotationMatrix2D(center, angle, 1.0)
    return cv2.warpAffine(img, M, (w, h))

def add_gaussian_noise(img, sigma=5):
    """Thêm nhiễu Gaussian vào ảnh"""
    noise = np.random.normal(0, sigma, img.shape).astype(np.int16)
    noisy_img = cv2.add(img.astype(np.int16), noise)
    return np.clip(noisy_img, 0, 255).astype(np.uint8)

def blur_image(img, ksize=(5, 5)):
    """Làm mờ ảnh"""
    return cv2.GaussianBlur(img, ksize, 0)