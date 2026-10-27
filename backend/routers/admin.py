import os
import uuid
import logging
from typing import List, Optional
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, UploadFile, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.core.config import settings
from backend.db.database import get_db
from backend.models.catalog import CatalogItem
from backend.models.tryon_job import TryonJob
from backend.schemas.catalog import CatalogItemResponse, CatalogItemUpdate
from backend.services.catalog_service import (
    create_catalog_item,
    update_catalog_item,
    delete_catalog_item,
    get_catalog_item_by_id
)

logger = logging.getLogger("admin-router")

router = APIRouter(prefix="/api/admin", tags=["Admin Studio"])

class AdminLoginRequest(BaseModel):
    username: str
    password: str

class AdminLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str

def verify_admin_token(
    authorization: Optional[str] = Header(None),
    x_admin_key: Optional[str] = Header(None)
):
    """Authenticate admin requests using Bearer token or direct admin key."""
    expected_token = settings.ADMIN_SECRET_KEY
    token = None

    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
    elif x_admin_key:
        token = x_admin_key

    if not token or token != expected_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Admin authorization required or token expired.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return True

@router.post("/login", response_model=AdminLoginResponse)
def admin_login(creds: AdminLoginRequest):
    """Admin login endpoint to manage real clothing store catalog."""
    if creds.username == settings.ADMIN_USERNAME and creds.password == settings.ADMIN_PASSWORD:
        return AdminLoginResponse(
            access_token=settings.ADMIN_SECRET_KEY,
            username=creds.username
        )
    raise HTTPException(status_code=401, detail="Invalid administrator credentials.")

@router.get("/catalog", response_model=List[CatalogItemResponse], dependencies=[Depends(verify_admin_token)])
def admin_list_catalog(db: Session = Depends(get_db)):
    """List all products in catalog, including active and inactive items."""
    items = db.query(CatalogItem).order_by(CatalogItem.id.desc()).all()
    return [CatalogItemResponse.model_validate(item.to_dict()) for item in items]

@router.post("/catalog", response_model=CatalogItemResponse, dependencies=[Depends(verify_admin_token)])
async def admin_create_product(
    name: str = Form(...),
    category: str = Form(...),
    department: str = Form("Indian"),
    gender: str = Form("women"),
    clothing_type: str = Form("one-piece"),
    price: float = Form(...),
    fabric: Optional[str] = Form(None),
    color: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    occasion: Optional[str] = Form(None),
    stock_status: str = Form("in_stock"),
    is_active: bool = Form(True),
    image: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Add a new authentic garment to the store's catalog with image upload."""
    contents = await image.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Product image file is required.")

    ext = Path(image.filename).suffix or ".jpg"
    safe_filename = f"prod_{uuid.uuid4().hex[:8]}{ext}"
    target_path = settings.IMAGES_DIR / safe_filename
    target_path.write_bytes(contents)

    item = CatalogItem(
        name=name,
        category=category.lower().strip(),
        department=department,
        gender=gender,
        clothing_type=clothing_type,
        fabric=fabric,
        color=color,
        price=price,
        image_filename=safe_filename,
        description=description,
        occasion=occasion,
        stock_status=stock_status,
        is_active=is_active
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    logger.info(f"Admin added new product: {item.name} ({item.category})")
    return CatalogItemResponse.model_validate(item.to_dict())

@router.put("/catalog/{item_id}", response_model=CatalogItemResponse, dependencies=[Depends(verify_admin_token)])
def admin_update_product(
    item_id: int,
    data: CatalogItemUpdate,
    db: Session = Depends(get_db)
):
    """Update details, price, availability, or status of an existing product."""
    updated = update_catalog_item(db, item_id, data)
    if not updated:
        raise HTTPException(status_code=404, detail="Product not found.")
    return CatalogItemResponse.model_validate(updated.to_dict())

@router.delete("/catalog/{item_id}", dependencies=[Depends(verify_admin_token)])
def admin_delete_product(item_id: int, db: Session = Depends(get_db)):
    """Delete a product from the catalog."""
    success = delete_catalog_item(db, item_id)
    if not success:
        raise HTTPException(status_code=404, detail="Product not found.")
    return {"status": "deleted", "item_id": item_id}

@router.get("/stats", dependencies=[Depends(verify_admin_token)])
def admin_get_stats(db: Session = Depends(get_db)):
    """Retrieve usage analytics and try-on error statistics."""
    total_products = db.query(CatalogItem).count()
    active_products = db.query(CatalogItem).filter(CatalogItem.is_active == True).count()
    total_jobs = db.query(TryonJob).count()
    completed_jobs = db.query(TryonJob).filter(TryonJob.status == "completed").count()
    failed_jobs = db.query(TryonJob).filter(TryonJob.status == "failed").count()

    recent_jobs = db.query(TryonJob).order_by(TryonJob.created_at.desc()).limit(10).all()

    return {
        "products": {
            "total": total_products,
            "active": active_products
        },
        "tryons": {
            "total": total_jobs,
            "completed": completed_jobs,
            "failed": failed_jobs,
            "success_rate": f"{round((completed_jobs / total_jobs * 100), 1)}%" if total_jobs > 0 else "N/A"
        },
        "system": {
            "active_ai_provider": settings.AI_TRYON_PROVIDER,
            "public_store_url": settings.PUBLIC_STORE_URL,
            "retention_seconds": settings.TEMPORARY_RETENTION_SECONDS
        },
        "recent_activity": [job.to_dict() for job in recent_jobs]
    }

class AdminConfigUpdate(BaseModel):
    hf_token: Optional[str] = None
    fashn_api_key: Optional[str] = None
    gemini_api_key: Optional[str] = None
    colab_vton_url: Optional[str] = None
    provider: Optional[str] = None

@router.post("/config", dependencies=[Depends(verify_admin_token)])
def admin_update_config(data: AdminConfigUpdate):
    """Dynamically update AI virtual try-on tokens, Colab tunnel, or providers without restarting server."""
    from backend.services.ai_vton_service import ai_tryon_service
    if data.hf_token is not None:
        settings.HF_TOKEN = data.hf_token.strip()
        ai_tryon_service.reset_client()
        logger.info("Updated Hugging Face token via admin studio.")
    if data.colab_vton_url is not None:
        settings.COLAB_VTON_URL = data.colab_vton_url.strip()
        logger.info("Updated Google Colab VTON URL via admin studio.")
    if data.fashn_api_key is not None:
        settings.FASHN_API_KEY = data.fashn_api_key.strip()
        logger.info("Updated FASHN API key via admin studio.")
    if data.gemini_api_key is not None:
        settings.GEMINI_API_KEY = data.gemini_api_key.strip()
        logger.info("Updated Gemini API key via admin studio.")
    if data.provider is not None:
        settings.AI_TRYON_PROVIDER = data.provider.strip().lower()
        logger.info(f"Switched AI Try-On provider to: {settings.AI_TRYON_PROVIDER}")

    return {
        "status": "success",
        "provider": settings.AI_TRYON_PROVIDER,
        "colab_configured": bool(settings.COLAB_VTON_URL),
        "hf_configured": bool(settings.HF_TOKEN),
        "fashn_configured": bool(settings.FASHN_API_KEY),
        "gemini_configured": bool(settings.GEMINI_API_KEY)
    }


