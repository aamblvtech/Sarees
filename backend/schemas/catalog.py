from typing import Optional
from pydantic import BaseModel, Field

class CatalogItemBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    category: str = Field(..., description="sarees, kurtis, lehengas, sherwanis, dresses, shirts, t-shirts, jackets, etc.")
    department: str = Field("Indian", description="'Indian' or 'Western'")
    gender: str = Field("women", description="'women', 'men', or 'unisex'")
    clothing_type: str = Field("one-piece", description="'one-piece', 'upper_body', 'lower_body'")
    fabric: Optional[str] = None
    color: Optional[str] = None
    price: float = Field(..., ge=0.0)
    image_filename: str
    description: Optional[str] = None
    occasion: Optional[str] = None
    stock_status: str = Field("in_stock", description="'in_stock' or 'out_of_stock'")
    is_active: bool = True

class CatalogItemCreate(CatalogItemBase):
    pass

class CatalogItemUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    department: Optional[str] = None
    gender: Optional[str] = None
    clothing_type: Optional[str] = None
    fabric: Optional[str] = None
    color: Optional[str] = None
    price: Optional[float] = None
    image_filename: Optional[str] = None
    description: Optional[str] = None
    occasion: Optional[str] = None
    stock_status: Optional[str] = None
    is_active: Optional[bool] = None

class CatalogItemResponse(CatalogItemBase):
    id: int
    image_url: str

    class Config:
        from_attributes = True
