from sqlalchemy import create_engine, Column, Integer, String, DateTime, ForeignKey, LargeBinary
from sqlalchemy.orm import sessionmaker, declarative_base, relationship
from datetime import datetime
import pytz

engine = create_engine('sqlite:///database.db')  

# 🔹 Tạo BaseModel
Base = declarative_base()

VN_TZ = pytz.timezone('Asia/Ho_Chi_Minh')

def get_vn_time():
    return datetime.now(VN_TZ)

# 🔹 BaseModel cho các bảng có cột `created_at`
class BaseModel(Base):
    __abstract__ = True
    created_at = Column(DateTime, default=get_vn_time)

# 🔹 Bảng Employee (Nhân viên)
class Employee(BaseModel):
    __tablename__ = 'employees'
    
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    position = Column(String, nullable=False)
    attendances = relationship('Attendance', back_populates='employee', lazy=True)

# 🔹 Bảng Attendance (Chấm công)
class Attendance(BaseModel):
    __tablename__ = 'attendance'

    id = Column(Integer, primary_key=True)
    employee_id = Column(Integer, ForeignKey('employees.id'), nullable=False)  
    check_in_time = Column(DateTime, default=get_vn_time)
    check_out_time = Column(DateTime, nullable=True)  
    status = Column(String, default='on_time')
    employee = relationship('Employee', back_populates='attendances')

# 🔹 Định nghĩa Model
class Embedding(Base):
    __tablename__ = 'embeddings'

    id = Column(Integer, primary_key=True)
    employee_id = Column(String, nullable=False) 
    embedding = Column(LargeBinary, nullable=False)

# 🔹 Tạo database nếu chưa tồn tại
Base.metadata.create_all(engine)

# 🔹 Khởi tạo session
Session = sessionmaker(bind=engine)
session = Session()