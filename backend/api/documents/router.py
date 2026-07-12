from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import RedirectResponse
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from typing import Literal

from api.dependencies import get_db
from packages.db.models.fleet import Vehicle, Driver
from packages.db.models.ops import MaintenanceLog
from packages.db.models.finance import FuelLog, Expense
from packages.utils.storage import upload_file, get_file_url, delete_file

router = APIRouter()

# Maps entity_type to (ORM model, image field name, folder in MinIO)
ENTITY_MAP = {
    "vehicle": (Vehicle, "document_url", "vehicles"),
    "driver": (Driver, "license_url", "drivers"),
    "fuel_log": (FuelLog, "fuel_bill_url", "fuel_logs"),
    "expense": (Expense, "expense_bill_url", "expenses"),
    "maintenance_log": (MaintenanceLog, "maintenance_bill_url", "maintenance_logs"),
}

EntityType = Literal["vehicle", "driver", "fuel_log", "expense", "maintenance_log"]


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    entity_type: EntityType = Form(...),
    entity_id: int = Form(...),
    label: str = Form("document"),
    db: AsyncSession = Depends(get_db),
):
    """
    Uploads a document image for an existing entity.
    Stores the file in MinIO and updates the entity's image URL field.
    """
    if entity_type not in ENTITY_MAP:
        raise HTTPException(status_code=400, detail=f"Invalid entity_type: {entity_type}")

    model_class, field_name, folder = ENTITY_MAP[entity_type]

    entity = await db.get(model_class, entity_id)
    if not entity:
        raise HTTPException(status_code=404, detail=f"{entity_type} with id {entity_id} not found.")

    # Delete old file if one exists
    old_url = getattr(entity, field_name, None)
    if old_url:
        try:
            delete_file(old_url)
        except Exception:
            pass

    # Upload new file
    try:
        object_key = upload_file(file, folder, entity_id, label)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")

    # Update entity record
    setattr(entity, field_name, object_key)
    db.add(entity)
    await db.commit()
    await db.refresh(entity)

    return {"url": object_key, "message": f"Document uploaded for {entity_type} {entity_id}."}


@router.get("/file/{object_key:path}")
async def download_document(object_key: str):
    """Returns a redirect to the MinIO presigned URL for the given object key."""
    try:
        presigned_url = get_file_url(object_key)
    except Exception:
        raise HTTPException(status_code=404, detail="File not found.")
    return RedirectResponse(url=presigned_url)


@router.delete("/{object_key:path}")
async def remove_document(
    object_key: str,
    entity_type: EntityType = Form(...),
    entity_id: int = Form(...),
    db: AsyncSession = Depends(get_db),
):
    """Deletes a document from MinIO and nulls the entity's image URL field."""
    if entity_type not in ENTITY_MAP:
        raise HTTPException(status_code=400, detail=f"Invalid entity_type: {entity_type}")

    model_class, field_name, _ = ENTITY_MAP[entity_type]

    entity = await db.get(model_class, entity_id)
    if not entity:
        raise HTTPException(status_code=404, detail=f"{entity_type} with id {entity_id} not found.")

    try:
        delete_file(object_key)
    except Exception:
        pass

    setattr(entity, field_name, None)
    db.add(entity)
    await db.commit()

    return {"message": f"Document deleted for {entity_type} {entity_id}."}
