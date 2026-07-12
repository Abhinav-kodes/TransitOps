import os
import json
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import select, func
from sqlmodel.ext.asyncio.session import AsyncSession

from api.dependencies import get_db, get_current_user
from packages.db.models.fleet import Vehicle, Driver
from packages.db.models.ops import Trip, MaintenanceLog
from packages.db.models.finance import FuelLog, Expense

router = APIRouter()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    response: str


SYSTEM_PROMPT = """You are TransitOps AI — an intelligent assistant for the TransitOps fleet management platform.

You have access to a live snapshot of the fleet's data (provided as JSON context below).
Answer the user's question based ONLY on this data. Be concise and professional.
Use bullet points for lists. Use numbers for summaries.
If the user asks about something outside fleet operations, politely redirect them to ask about vehicles, drivers, trips, maintenance, fuel, expenses, or analytics.
Never fabricate data. If the data doesn't contain the answer, say so."""


async def build_fleet_context(db: AsyncSession) -> dict:
    """Run fast queries to build a fleet data snapshot for the LLM."""

    # Vehicle stats
    vehicles_res = await db.exec(select(Vehicle))
    vehicles = vehicles_res.all()
    vehicle_status_counts = {}
    for v in vehicles:
        vehicle_status_counts[v.status] = vehicle_status_counts.get(v.status, 0) + 1

    vehicles_summary = [
        {
            "id": v.id,
            "reg_no": v.reg_no,
            "name": v.name_model,
            "type": v.type,
            "capacity_kg": v.capacity_kg,
            "status": v.status,
            "odometer": v.odometer,
            "acq_cost": float(v.acq_cost),
        }
        for v in vehicles
    ]

    # Driver stats
    drivers_res = await db.exec(select(Driver))
    drivers = drivers_res.all()
    driver_status_counts = {}
    for d in drivers:
        driver_status_counts[d.status] = driver_status_counts.get(d.status, 0) + 1

    drivers_summary = [
        {
            "id": d.id,
            "name": d.name,
            "license_no": d.license_no,
            "category": d.category,
            "safety_score": d.safety_score,
            "status": d.status,
        }
        for d in drivers
    ]

    # Trip stats
    trips_res = await db.exec(select(Trip))
    trips = trips_res.all()
    trip_status_counts = {}
    for t in trips:
        trip_status_counts[t.status] = trip_status_counts.get(t.status, 0) + 1

    recent_trips = [
        {
            "id": t.id,
            "trip_code": t.trip_code,
            "source": t.source,
            "destination": t.destination,
            "status": t.status,
            "cargo_weight": t.cargo_weight,
            "planned_distance": t.planned_dist,
            "toll_cost": t.toll_cost,
        }
        for t in sorted(trips, key=lambda x: x.id, reverse=True)[:10]
    ]

    # Fuel stats
    fuel_res = await db.exec(select(FuelLog))
    fuel_logs = fuel_res.all()
    total_fuel_cost = float(sum(fl.fuel_cost for fl in fuel_logs))
    total_fuel_liters = float(sum(fl.liters for fl in fuel_logs))

    # Expense stats
    expense_res = await db.exec(select(Expense))
    expenses = expense_res.all()
    total_expense_cost = float(sum(e.total_cost for e in expenses))

    # Maintenance stats
    maint_res = await db.exec(select(MaintenanceLog))
    maint_logs = maint_res.all()
    maint_status_counts = {}
    total_maint_cost = 0.0
    for m in maint_logs:
        maint_status_counts[m.status] = maint_status_counts.get(m.status, 0) + 1
        total_maint_cost += float(m.cost)

    # Overall totals
    total_operational_cost = total_fuel_cost + total_expense_cost + total_maint_cost

    return {
        "fleet_overview": {
            "total_vehicles": len(vehicles),
            "vehicle_status_breakdown": vehicle_status_counts,
            "total_drivers": len(drivers),
            "driver_status_breakdown": driver_status_counts,
        },
        "vehicles": vehicles_summary,
        "drivers": drivers_summary,
        "trips": {
            "total": len(trips),
            "status_breakdown": trip_status_counts,
            "recent_trips": recent_trips,
        },
        "financials": {
            "total_fuel_cost": round(total_fuel_cost, 2),
            "total_fuel_liters": round(total_fuel_liters, 2),
            "total_expenses": round(total_expense_cost, 2),
            "total_maintenance_cost": round(total_maint_cost, 2),
            "total_operational_cost": round(total_operational_cost, 2),
        },
        "maintenance": {
            "total_records": len(maint_logs),
            "status_breakdown": maint_status_counts,
        },
    }


@router.post("", response_model=ChatResponse)
async def chat(
    req: ChatRequest,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    if not GEMINI_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Gemini API key not configured.",
        )

    from google import genai

    client = genai.Client(api_key=GEMINI_API_KEY)

    # Build fleet context
    context = await build_fleet_context(db)
    context_str = json.dumps(context, indent=2)

    # Generate response
    try:
        response = client.models.generate_content(
            model="gemini-3.1-flash-lite",
            contents=[
                SYSTEM_PROMPT + f"\n\n--- FLEET DATA CONTEXT ---\n{context_str}\n--- END CONTEXT ---",
                req.message,
            ],
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Gemini API error: {str(e)}",
        )

    text = response.text or "I'm sorry, I couldn't generate a response. Please try again."

    return ChatResponse(response=text)
