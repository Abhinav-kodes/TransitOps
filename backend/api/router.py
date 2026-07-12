from fastapi import APIRouter
from api.authentication.router import router as auth_router
from api.fleet.router import router as fleet_router

api_router = APIRouter()
api_router.include_router(auth_router, prefix="/auth", tags=["Authentication"])
api_router.include_router(fleet_router, prefix="/fleet", tags=["Fleet Management"])

