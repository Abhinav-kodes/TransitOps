from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from typing import List, Optional

from api.dependencies import get_db, require_roles
from packages.db.models.auth import User, Role, RoleName
from packages.db.models.fleet import Vehicle, Driver
from api.fleet.schemas import (
    VehicleCreate, VehicleResponse, VehicleUpdate,
    DriverCreate, DriverResponse, DriverUpdate
)

router = APIRouter()

# Role constants
ALL_AUTHENTICATED = ["Fleet Manager", "Dispatcher", "Driver", "Safety Officer", "Financial Analyst", "Admin"]
FLEET_AND_SAFETY = ["Fleet Manager", "Safety Officer", "Admin"]
FLEET_ONLY = ["Fleet Manager", "Admin"]

# =====================================================================
# VEHICLES REGISTRY ENDPOINTS
# =====================================================================

@router.post("/vehicles", response_model=VehicleResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_roles(FLEET_ONLY))])
async def create_vehicle(vehicle_in: VehicleCreate, db: AsyncSession = Depends(get_db)):
    """Registers a fresh fleet vehicle. Validates unique registration parameters."""
    stmt = select(Vehicle).where(Vehicle.reg_no == vehicle_in.reg_no)
    result = await db.exec(stmt)
    if result.first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Vehicle with registration number '{vehicle_in.reg_no}' already exists."
        )
    
    # Initialize with default operational status 'Available' if not specified
    db_vehicle = Vehicle(**vehicle_in.model_dump())
    db.add(db_vehicle)
    await db.commit()
    await db.refresh(db_vehicle)
    return db_vehicle

@router.get("/vehicles", response_model=List[VehicleResponse], dependencies=[Depends(require_roles(ALL_AUTHENTICATED))])
async def list_vehicles(
    status_filter: Optional[str] = Query(None, alias="status"),
    type_filter: Optional[str] = Query(None, alias="type"),
    search: Optional[str] = Query(None, alias="search"),
    available_only: bool = Query(False, alias="available_only"),
    db: AsyncSession = Depends(get_db)
):
    """Fetches list of vehicles. Supports filtering for dispatch selection drops."""
    stmt = select(Vehicle)
    if status_filter:
        stmt = stmt.where(Vehicle.status == status_filter)
    if available_only:
        stmt = stmt.where(Vehicle.status == "Available")
    if type_filter:
        stmt = stmt.where(Vehicle.type == type_filter)
    if search:
        stmt = stmt.where(Vehicle.reg_no.ilike(f"%{search}%"))
        
    result = await db.exec(stmt)
    return result.all()

@router.put("/vehicles/{vehicle_id}", response_model=VehicleResponse, dependencies=[Depends(require_roles(FLEET_ONLY))])
async def update_vehicle(vehicle_id: int, vehicle_in: VehicleUpdate, db: AsyncSession = Depends(get_db)):
    """Updates internal metrics, lifecycle statuses, or manual odometer readings."""
    db_vehicle = await db.get(Vehicle, vehicle_id)
    if not db_vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle asset not found.")
    
    update_data = vehicle_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_vehicle, key, value)
        
    await db.commit()
    await db.refresh(db_vehicle)
    return db_vehicle

@router.delete("/vehicles/{vehicle_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_roles(FLEET_ONLY))])
async def delete_vehicle(vehicle_id: int, db: AsyncSession = Depends(get_db)):
    """Deletes a vehicle that is not currently on a trip."""
    vehicle = await db.get(Vehicle, vehicle_id)
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle asset not found.")
    if vehicle.status == "On Trip":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete a vehicle that is currently on a trip.")
    await db.delete(vehicle)
    await db.commit()

# =====================================================================
# DRIVER REGISTRY ENDPOINTS
# =====================================================================

@router.get("/drivers/unlinked", response_model=List[dict], dependencies=[Depends(require_roles(ALL_AUTHENTICATED))])
async def list_unlinked_drivers(db: AsyncSession = Depends(get_db)):
    """Returns users with Driver role who don't have a linked Driver profile."""
    # Get all user IDs that are already linked to a driver
    linked_stmt = select(Driver.user_id).where(Driver.user_id.is_not(None))
    linked_result = await db.exec(linked_stmt)
    linked_user_ids = set(linked_result.all())

    # Get all users with Driver role
    stmt = select(User).join(Role).where(Role.name == RoleName.DRIVER)
    result = await db.exec(stmt)
    all_drivers = result.all()

    # Filter to unlinked
    unlinked = [u for u in all_drivers if u.id not in linked_user_ids]
    return [{"id": u.id, "email": u.email} for u in unlinked]

# =====================================================================
# DRIVER REGISTRY ENDPOINTS
# =====================================================================

@router.post("/drivers", response_model=DriverResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_roles(FLEET_AND_SAFETY))])
async def create_driver(driver_in: DriverCreate, db: AsyncSession = Depends(get_db)):
    """Creates an active driver resource registry context profile."""
    stmt = select(Driver).where(Driver.license_no == driver_in.license_no)
    result = await db.exec(stmt)
    if result.first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Driver with license number '{driver_in.license_no}' already registered."
        )
        
    db_driver = Driver(**driver_in.model_dump(), status="Available")
    db.add(db_driver)
    await db.commit()
    await db.refresh(db_driver)
    return db_driver

@router.get("/drivers", response_model=List[DriverResponse], dependencies=[Depends(require_roles(ALL_AUTHENTICATED))])
async def list_drivers(
    status_filter: Optional[str] = Query(None, alias="status"),
    available_only: bool = Query(False, alias="available_only"),
    db: AsyncSession = Depends(get_db)
):
    """Lists system operators. Can be filtered to locate available personnel."""
    stmt = select(Driver)
    if status_filter:
        stmt = stmt.where(Driver.status == status_filter)
    if available_only:
        stmt = stmt.where(Driver.status == "Available")
        
    result = await db.exec(stmt)
    return result.all()

@router.put("/drivers/{driver_id}", response_model=DriverResponse, dependencies=[Depends(require_roles(FLEET_AND_SAFETY))])
async def update_driver(driver_id: int, driver_in: DriverUpdate, db: AsyncSession = Depends(get_db)):
    """Modifies operator status fields (e.g., handling suspensions or off-duty toggles)."""
    db_driver = await db.get(Driver, driver_id)
    if not db_driver:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Driver record not found.")
        
    update_data = driver_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_driver, key, value)
        
    await db.commit()
    await db.refresh(db_driver)
    return db_driver

@router.delete("/drivers/{driver_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_roles(FLEET_AND_SAFETY))])
async def delete_driver(driver_id: int, db: AsyncSession = Depends(get_db)):
    """Deletes a driver that is not currently on a trip."""
    driver = await db.get(Driver, driver_id)
    if not driver:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Driver record not found.")
    if driver.status == "On Trip":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete a driver that is currently on a trip.")
    await db.delete(driver)
    await db.commit()

@router.post("/drivers/remind-expiring", dependencies=[Depends(require_roles(FLEET_AND_SAFETY))])
async def remind_expiring_licenses(
    db: AsyncSession = Depends(get_db)
):
    """Checks for drivers with licenses expiring in the next 30 days and triggers real email reminders using SendGrid."""
    import os
    import httpx
    from datetime import date, timedelta
    
    threshold_date = date.today() + timedelta(days=30)
    stmt = select(Driver).where(Driver.expiry_date <= threshold_date)
    res = await db.exec(stmt)
    drivers = res.all()
    
    reminded = []
    if not drivers:
        return {
            "status": "success",
            "message": "No driver licenses expiring within the next 30 days.",
            "reminded_drivers": []
        }
        
    for driver in drivers:
        reminded.append({
            "id": driver.id,
            "name": driver.name,
            "license_no": driver.license_no,
            "expiry_date": driver.expiry_date.isoformat()
        })
        
    # Get SendGrid Configuration from environment
    sendgrid_api_key = os.getenv("SENDGRID_API_KEY")
    sendgrid_from_email = os.getenv("SENDGRID_FROM_EMAIL") or "abhinav.2428cse938@kiet.edu"
    
    # We will send the report to the notification email target or fallback to a safety admin email
    notification_email = os.getenv("NOTIFICATION_EMAIL") or "abhinavsingh6526@gmail.com"
    
    if sendgrid_api_key:
        # Build nice HTML email body
        driver_rows = "".join([
            f"<tr>"
            f"<td style='padding: 8px; border-bottom: 1px solid #ddd;'>{d['name']}</td>"
            f"<td style='padding: 8px; border-bottom: 1px solid #ddd;'>{d['license_no']}</td>"
            f"<td style='padding: 8px; border-bottom: 1px solid #ddd; color: #d9534f; font-weight: bold;'>{d['expiry_date']}</td>"
            f"</tr>"
            for d in reminded
        ])
        
        email_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #0080FF; margin-bottom: 20px;">TransitOps License Expiry Warning</h2>
                <p>Hello,</p>
                <p>This is an automated safety compliance alert. The following drivers have commercial driver licenses (CDL) that have either expired or are expiring within the next 30 days:</p>
                
                <table style="width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 15px;">
                    <thead>
                        <tr style="background-color: #f8fafc; text-align: left;">
                            <th style="padding: 8px; border-bottom: 2px solid #ddd;">Driver Name</th>
                            <th style="padding: 8px; border-bottom: 2px solid #ddd;">License No</th>
                            <th style="padding: 8px; border-bottom: 2px solid #ddd;">Expiry Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {driver_rows}
                    </tbody>
                </table>
                
                <p style="font-weight: bold; color: #d9534f;">Please note: Drivers with expired licenses cannot be assigned to dispatches or active trips.</p>
                <p>Best regards,<br>TransitOps Safety & Compliance Team</p>
            </div>
        </body>
        </html>
        """
        
        # Send mail via SendGrid REST API
        payload = {
            "personalizations": [
                {
                    "to": [{"email": notification_email, "name": notification_email}],
                    "subject": f"TransitOps Alert: {len(reminded)} License Expiration Warning(s)"
                }
            ],
            "from": {
                "email": sendgrid_from_email,
                "name": "TransitOps"
            },
            "reply_to": {
                "email": "abhinav.2428cse938@kiet.edu",
                "name": "TransitOps"
            },
            "content": [
                {
                    "type": "text/html",
                    "value": email_content
                }
            ]
        }
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    "https://api.sendgrid.com/v3/mail/send",
                    headers={
                        "Authorization": f"Bearer {sendgrid_api_key}",
                        "Content-Type": "application/json"
                    },
                    json=payload,
                    timeout=10.0
                )
                print(f"SendGrid Response Status: {response.status_code}")
                print(f"SendGrid Response Headers: {dict(response.headers)}")
                print(f"SendGrid Response Text: {response.text}")
                response.raise_for_status()
            except httpx.HTTPStatusError as e:
                error_body = e.response.text
                print(f"SendGrid HTTP Error: {e.response.status_code} - {error_body}")
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to send email via SendGrid: {e.response.status_code} - {error_body}"
                )
            except Exception as e:
                # Fallback print to logs and raising exception
                print(f"SendGrid Error details: {str(e)}")
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to send email via SendGrid: {str(e)}"
                )
    else:
        # Fallback log print so user can see it in terminal, and return descriptive error info
        print(f"[SendGrid Warning] SENDGRID_API_KEY not configured. Simulated dispatch alert for: {reminded}")
        raise HTTPException(
            status_code=400,
            detail="SendGrid API Key is not configured. Please set SENDGRID_API_KEY and SENDGRID_FROM_EMAIL in docker-compose.yml environment variables."
        )
        
    return {
        "status": "success",
        "message": f"Successfully sent email reminders to {notification_email} for {len(reminded)} driver(s).",
        "reminded_drivers": reminded
    }
