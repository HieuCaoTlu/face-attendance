import threading

# Khóa đồng bộ hóa để sử dụng với database session
db_lock = threading.Lock() 