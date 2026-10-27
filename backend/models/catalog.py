from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, Text, DateTime
from backend.db.database import Base

class CatalogItem(Base):
    __tablename__ = "catalog_items"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), nullable=False, index=True)
    category = Column(String(50), nullable=False, index=True) # e.g. sarees, kurtis, lehengas, sherwanis, dresses, shirts, t-shirts, jackets
    department = Column(String(50), nullable=False, default="Indian") # "Indian" or "Western"
    gender = Column(String(20), nullable=False, default="women") # "women", "men", "unisex"
    clothing_type = Column(String(50), nullable=False, default="one-piece") # "one-piece", "upper_body", "lower_body"
    fabric = Column(String(100), nullable=True)
    color = Column(String(50), nullable=True)
    price = Column(Float, nullable=False, default=0.0)
    image_filename = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    occasion = Column(String(100), nullable=True)
    stock_status = Column(String(50), nullable=False, default="in_stock") # in_stock, out_of_stock
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "category": self.category,
            "department": self.department,
            "gender": self.gender,
            "clothing_type": self.clothing_type,
            "fabric": self.fabric,
            "color": self.color,
            "price": self.price,
            "image_filename": self.image_filename,
            "image_url": f"/images/{self.image_filename}",
            "description": self.description,
            "occasion": self.occasion,
            "stock_status": self.stock_status,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
