from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from backend.db.database import get_db
from backend.schemas.catalog import CatalogItemResponse
from backend.services.catalog_service import (
    get_catalog_items,
    get_catalog_item_by_id
)
from backend.models.catalog import CatalogItem

router = APIRouter(prefix="/api/catalog", tags=["Catalog"])

@router.get("", response_model=List[CatalogItemResponse])
def list_catalog(
    department: Optional[str] = Query(None, description="Department: 'Indian' or 'Western'"),
    category: Optional[str] = Query(None, description="Category filter (e.g., 'sarees', 'kurtis', 'dresses', etc.)"),
    gender: Optional[str] = Query(None, description="Gender filter: 'women', 'men', 'unisex'"),
    search: Optional[str] = Query(None, description="Search term for name or fabric"),
    db: Session = Depends(get_db)
):
    """Retrieve active catalog garments with optional filtering."""
    items = get_catalog_items(
        db,
        department=department,
        category=category,
        gender=gender,
        search=search,
        only_active=True
    )
    return [CatalogItemResponse.model_validate(item.to_dict()) for item in items]

@router.get("/categories")
def get_categories(db: Session = Depends(get_db)):
    """Retrieve catalog categories grouped by department with item counts."""
    items = db.query(CatalogItem).filter(CatalogItem.is_active == True).all()

    indian_categories = {}
    western_categories = {}

    for item in items:
        cat = item.category
        if item.department.lower() == "indian":
            indian_categories[cat] = indian_categories.get(cat, 0) + 1
        else:
            western_categories[cat] = western_categories.get(cat, 0) + 1

    return {
        "departments": ["All", "Indian", "Western"],
        "indian": [{"category": cat, "count": count} for cat, count in indian_categories.items()],
        "western": [{"category": cat, "count": count} for cat, count in western_categories.items()],
        "total_items": len(items)
    }

@router.get("/{item_id}", response_model=CatalogItemResponse)
def get_item(item_id: int, db: Session = Depends(get_db)):
    """Get single catalog product detail."""
    item = get_catalog_item_by_id(db, item_id)
    if not item or not item.is_active:
        raise HTTPException(status_code=404, detail="Catalog item not found.")
    return CatalogItemResponse.model_validate(item.to_dict())
