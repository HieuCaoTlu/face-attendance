from sqlalchemy import create_engine, Column, Integer, String, DateTime, ForeignKey, LargeBinary, Time, Date, event, text, Boolean
from sqlalchemy.orm import sessionmaker, declarative_base, relationship
from dotenv import load_dotenv
from utils.date import *
import os

load_dotenv()


value = os.getenv('DB_PASSWORD') 
# engine = create_engine('sqlite:///database.db')  

# 🔹 Tạo BaseModel
Base = declarative_base()

# 🔹 BaseModel cho các bảng có cột `created_at`
class BaseModel(Base):
    __abstract__ = True
    created_at = Column(DateTime, default=get_accruate)

# 🔹 Bảng Shift (Ca làm việc)
class Shift(BaseModel):
    __tablename__ = 'shifts'
    
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    check_in_time = Column(Time, nullable=False)
    check_out_time = Column(Time, nullable=False)
    active = Column(Boolean, default=True)

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
    shift_id = Column(Integer, ForeignKey('shifts.id'), nullable=False)
    date = Column(Date, default=get_date)
    checkin = Column(Time, default=get_time)
    checkout = Column(Time, nullable=True)
    checkin_status = Column(String, default=True)
    checkout_status = Column(String, default=False)
    employee = relationship('Employee', back_populates='attendances')
    shift = relationship('Shift')

# 🔹 Định nghĩa Model
class Embedding(Base):
    __tablename__ = 'embeddings'

    id = Column(Integer, primary_key=True)
    employee_id = Column(String, nullable=False) 
    embedding = Column(LargeBinary, nullable=False)


psw = os.getenv('DB_PASSWORD')
engine = create_engine(f"sqlite+pysqlcipher://:{psw}@/database.db")

def forward_password(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute(f"PRAGMA key='{psw}'")
    cursor.execute("PRAGMA cipher_compatibility = 3")
    cursor.close()

event.listen(engine, "connect", forward_password)

# 🔹 Tạo database nếu chưa tồn tại
Base.metadata.create_all(engine)

# 🔹 Khởi tạo session
Session = sessionmaker(bind=engine)
session = Session()

# 🔹 Tạo ca làm việc mặc định nếu chưa có
def init_shifts():
    if session.query(Shift).count() == 0:
        # Ca 1: 8:00 - 12:00
        shift1 = Shift(
            name="Ca sáng",
            check_in_time=set_time("08:00"),
            check_out_time=set_time("12:00")
        )
        # Ca 2: 13:00 - 17:00
        shift2 = Shift(
            name="Ca chiều",
            check_in_time=set_time("13:00"),
            check_out_time=set_time("17:00")
        )
        session.add_all([shift1, shift2])
        session.commit()

init_shifts()