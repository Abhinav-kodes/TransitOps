from fastapi import APIRouter
from api.authentication.router import router as auth_router
from api.fleet.router import router as fleet_router
from api.operations.router import router as ops_router
from api.finance.router import router as finance_router
from api.analytics.router import router as analytics_router

api_router = APIRouter()
api_router.include_router(auth_router, prefix="/auth", tags=["Authentication"])
api_router.include_router(fleet_router, prefix="/fleet", tags=["Fleet Management"])
api_router.include_router(ops_router, prefix="/operations", tags=["Trip & Workshop Operations"])
api_router.include_router(finance_router, prefix="/finance", tags=["Financials"])
api_router.include_router(analytics_router, prefix="/analytics", tags=["Dashboard Analytics"])


