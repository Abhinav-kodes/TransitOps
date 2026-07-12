import random
from datetime import date, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from api.dependencies import get_db, require_roles
from api.authentication.security import get_password_hash
from packages.db.models.auth import User, Role, RoleName
from packages.db.models.fleet import Vehicle, Driver, VehicleStatus, DriverStatus
from packages.db.models.ops import Trip, TripStatus, MaintenanceLog, MaintenanceStatus
from packages.db.models.finance import FuelLog, Expense

router = APIRouter()

ADMIN_ONLY = ["Admin"]

# --- Static seed data ---

SEED_USERS = [
    {"email": "admin@transitops.in", "role": RoleName.ADMIN, "password": "admin123"},
    {"email": "fleet@transitops.in", "role": RoleName.FLEET_MANAGER, "password": "fleet123"},
    {"email": "dispatch@transitops.in", "role": RoleName.DISPATCHER, "password": "dispatch123"},
    {"email": "driver1@transitops.in", "role": RoleName.DRIVER, "password": "driver123"},
    {"email": "driver2@transitops.in", "role": RoleName.DRIVER, "password": "driver123"},
    {"email": "driver3@transitops.in", "role": RoleName.DRIVER, "password": "driver123"},
    {"email": "safety@transitops.in", "role": RoleName.SAFETY_OFFICER, "password": "safety123"},
    {"email": "finance@transitops.in", "role": RoleName.FINANCIAL_ANALYST, "password": "finance123"},
]

SEED_VEHICLES = [
    {"reg_no": "MH-12-AB-1001", "name_model": "TATA ACE-01", "type": "Mini", "capacity_kg": 750, "odometer": 23400, "acq_cost": 450000, "status": VehicleStatus.AVAILABLE},
    {"reg_no": "MH-14-CD-2002", "name_model": "EICER VED-02", "type": "Van", "capacity_kg": 1200, "odometer": 41200, "acq_cost": 680000, "status": VehicleStatus.ON_TRIP},
    {"reg_no": "MH-01-EF-3003", "name_model": "ASHOK LEY-03", "type": "Truck", "capacity_kg": 5000, "odometer": 67800, "acq_cost": 1850000, "status": VehicleStatus.AVAILABLE},
    {"reg_no": "KA-05-GH-4004", "name_model": "MAHINDRA-04", "type": "Mini", "capacity_kg": 600, "odometer": 15600, "acq_cost": 390000, "status": VehicleStatus.IN_SHOP},
    {"reg_no": "DL-03-IJ-5005", "name_model": "TATA PRIMA-05", "type": "Truck", "capacity_kg": 8000, "odometer": 92300, "acq_cost": 2400000, "status": VehicleStatus.ON_TRIP},
    {"reg_no": "TN-07-KL-6006", "name_model": "FORCE VHD-06", "type": "Van", "capacity_kg": 1500, "odometer": 33100, "acq_cost": 720000, "status": VehicleStatus.AVAILABLE},
    {"reg_no": "GJ-06-MN-7007", "name_model": "EICER VED-07", "type": "Van", "capacity_kg": 1100, "odometer": 28900, "acq_cost": 650000, "status": VehicleStatus.AVAILABLE},
    {"reg_no": "RJ-14-OP-8008", "name_model": "TATA ACE-08", "type": "Mini", "capacity_kg": 700, "odometer": 52400, "acq_cost": 430000, "status": VehicleStatus.RETIRED},
    {"reg_no": "UP-32-QR-9009", "name_model": "BHARATBEN-09", "type": "Truck", "capacity_kg": 6000, "odometer": 48700, "acq_cost": 2100000, "status": VehicleStatus.AVAILABLE},
    {"reg_no": "AP-09-ST-1010", "name_model": "ASHOK LEY-10", "type": "Truck", "capacity_kg": 7500, "odometer": 71200, "acq_cost": 2600000, "status": VehicleStatus.ON_TRIP},
    {"reg_no": "KL-07-UV-1111", "name_model": "TATA ACE-11", "type": "Mini", "capacity_kg": 800, "odometer": 19800, "acq_cost": 470000, "status": VehicleStatus.AVAILABLE},
    {"reg_no": "MP-09-WX-1212", "name_model": "MAHINDRA-12", "type": "Mini", "capacity_kg": 650, "odometer": 36500, "acq_cost": 410000, "status": VehicleStatus.IN_SHOP},
]

SEED_DRIVERS = [
    {"name": "Rajesh Kumar", "license_no": "MH-12-2023-001", "category": "LMV", "expiry": "2028-06-15", "contact": "+91 98765 43210", "score": 92, "status": DriverStatus.ON_TRIP, "user_email": "driver1@transitops.in"},
    {"name": "Suresh Patil", "license_no": "MH-14-2022-045", "category": "HMV", "expiry": "2027-11-30", "contact": "+91 98765 43211", "score": 88, "status": DriverStatus.AVAILABLE, "user_email": "driver2@transitops.in"},
    {"name": "Anita Sharma", "license_no": "KA-05-2024-112", "category": "LMV", "expiry": "2029-03-20", "contact": "+91 98765 43212", "score": 95, "status": DriverStatus.AVAILABLE, "user_email": "driver3@transitops.in"},
    {"name": "Vikram Singh", "license_no": "DL-03-2023-078", "category": "HMV", "expiry": "2028-09-10", "contact": "+91 98765 43213", "score": 76, "status": DriverStatus.SUSPENDED, "user_email": None},
    {"name": "Prakash Mehta", "license_no": "TN-07-2022-201", "category": "LMV", "expiry": "2027-07-25", "contact": "+91 98765 43214", "score": 85, "status": DriverStatus.OFF_DUTY, "user_email": None},
    {"name": "Deepak Jadhav", "license_no": "GJ-06-2024-033", "category": "LMV", "expiry": "2029-01-14", "contact": "+91 98765 43215", "score": 91, "status": DriverStatus.ON_TRIP, "user_email": None},
    {"name": "Manoj Gupta", "license_no": "RJ-14-2023-067", "category": "HMV", "expiry": "2028-05-09", "contact": "+91 98765 43216", "score": 70, "status": DriverStatus.AVAILABLE, "user_email": None},
    {"name": "Arun Nair", "license_no": "KL-07-2024-155", "category": "LMV", "expiry": "2029-08-22", "contact": "+91 98765 43217", "score": 97, "status": DriverStatus.AVAILABLE, "user_email": None},
]

CITIES = ["Mumbai", "Pune", "Delhi", "Bangalore", "Chennai", "Hyderabad", "Ahmedabad", "Jaipur", "Kolkata", "Lucknow"]

SERVICE_TYPES = ["Oil Change", "Brake Service", "Engine Overhaul", "Tire Replacement", "AC Service", "Battery Replacement", "Clutch Repair", "General Service"]
TRIP_CODES = [f"TRP-{1000+i}" for i in range(1, 21)]


@router.post("/seed", dependencies=[Depends(require_roles(ADMIN_ONLY))])
async def seed_database(db: AsyncSession = Depends(get_db)):
    """Seeds the database with realistic demo data. Admin only."""

    # Check if data already exists
    existing = await db.exec(select(Vehicle))
    if existing.first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Database already contains data. Clear existing data before re-seeding."
        )

    today = date.today()
    seeded = {"users": 0, "vehicles": 0, "drivers": 0, "trips": 0, "fuel_logs": 0, "expenses": 0, "maintenance_logs": 0}

    # 1. Seed users
    user_map = {}
    for u in SEED_USERS:
        role_res = await db.exec(select(Role).where(Role.name == u["role"]))
        role = role_res.first()
        if not role:
            continue
        user = User(
            email=u["email"],
            hashed_password=get_password_hash(u["password"]),
            role_id=role.id,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        user_map[u["email"]] = user
        seeded["users"] += 1

    # 2. Seed vehicles
    vehicle_list = []
    for v in SEED_VEHICLES:
        vehicle = Vehicle(**v)
        db.add(vehicle)
        await db.commit()
        await db.refresh(vehicle)
        vehicle_list.append(vehicle)
        seeded["vehicles"] += 1

    # 3. Seed drivers (link to users where applicable)
    driver_list = []
    for d in SEED_DRIVERS:
        linked_user = user_map.get(d["user_email"]) if d["user_email"] else None
        driver = Driver(
            user_id=linked_user.id if linked_user else None,
            name=d["name"],
            license_no=d["license_no"],
            category=d["category"],
            expiry_date=date.fromisoformat(d["expiry"]),
            contact_no=d["contact"],
            safety_score=d["score"],
            status=d["status"],
        )
        db.add(driver)
        await db.commit()
        await db.refresh(driver)
        driver_list.append(driver)
        seeded["drivers"] += 1

    # 4. Seed trips
    trip_list = []
    statuses_cycle = [TripStatus.COMPLETED, TripStatus.COMPLETED, TripStatus.COMPLETED, TripStatus.DISPATCHED, TripStatus.DRAFT]
    for i in range(20):
        src = CITIES[i % len(CITIES)]
        dst = CITIES[(i + 3) % len(CITIES)]
        v = vehicle_list[i % len(vehicle_list)]
        d = driver_list[i % len(driver_list)]
        trip_status = statuses_cycle[i % len(statuses_cycle)]
        planned = random.randint(150, 900)

        trip = Trip(
            trip_code=TRIP_CODES[i],
            source=f"{src} Warehouse",
            destination=f"{dst} Hub",
            vehicle_id=v.id,
            driver_id=d.id,
            cargo_weight=random.randint(500, int(v.capacity_kg * 0.9)),
            planned_dist=planned,
            status=trip_status,
            toll_cost=round(random.uniform(100, 1200), 2),
        )
        db.add(trip)
        await db.commit()
        await db.refresh(trip)
        trip_list.append(trip)
        seeded["trips"] += 1

    # 5. Seed fuel logs (one per completed trip, spread over last 60 days)
    for i, trip in enumerate(trip_list):
        if trip.status != TripStatus.COMPLETED:
            continue
        v = await db.get(Vehicle, trip.vehicle_id)
        if not v:
            continue
        liters = round(random.uniform(20, 80), 2)
        cost_per_liter = random.uniform(95, 108)
        log_date = today - timedelta(days=random.randint(0, 60))
        fuel = FuelLog(
            vehicle_id=v.id,
            date=log_date,
            liters=liters,
            fuel_cost=round(liters * cost_per_liter, 2),
        )
        db.add(fuel)
        seeded["fuel_logs"] += 1
    await db.commit()

    # 6. Seed expenses (for completed trips)
    for trip in trip_list:
        if trip.status != TripStatus.COMPLETED:
            continue
        toll = round(random.uniform(50, 800), 2)
        other = round(random.uniform(0, 300), 2)
        expense = Expense(
            trip_id=trip.id,
            vehicle_id=trip.vehicle_id,
            toll=toll,
            other=other,
            total_cost=round(toll + other + trip.toll_cost, 2),
        )
        db.add(expense)
        seeded["expenses"] += 1
    await db.commit()

    # 7. Seed maintenance logs (spread across vehicles and last 90 days)
    maint_count = 0
    for v in vehicle_list:
        if v.status == VehicleStatus.RETIRED:
            continue
        count = random.randint(1, 3)
        for _ in range(count):
            maint = MaintenanceLog(
                vehicle_id=v.id,
                service_type=random.choice(SERVICE_TYPES),
                cost=round(random.uniform(1500, 45000), 2),
                entry_date=today - timedelta(days=random.randint(0, 90)),
                status=random.choice([MaintenanceStatus.ACTIVE, MaintenanceStatus.COMPLETED]),
            )
            db.add(maint)
            seeded["maintenance_logs"] += 1
            maint_count += 1
    await db.commit()

    return {
        "message": "Database seeded successfully",
        "data": seeded,
    }
