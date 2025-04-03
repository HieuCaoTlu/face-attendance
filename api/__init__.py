from fastapi import APIRouter
from api.employee import router as employee_router
from api.attendance import router as attendance_router
from api.shift import router as shift_router
from api.utils import router as utils_router
from api.checkin import router as checkin_router
from api.complaint import router as complaint_router 

router = APIRouter()
router.include_router(employee_router)
router.include_router(attendance_router)
router.include_router(shift_router)
router.include_router(utils_router)
router.include_router(checkin_router)
router.include_router(complaint_router)
