import logging
from typing import List, Optional
from sqlalchemy.orm import Session
from backend.models.catalog import CatalogItem
from backend.schemas.catalog import CatalogItemCreate, CatalogItemUpdate

logger = logging.getLogger("catalog-service")

SEED_CATALOG = [
    # Indian Ethnic Wear
    {
        "name": "Traditional Crimson Banarasi Silk Saree",
        "category": "sarees",
        "department": "Indian",
        "gender": "women",
        "clothing_type": "one-piece",
        "fabric": "Banarasi Katan Silk",
        "color": "Crimson Red & Gold",
        "price": 2499.0,
        "image_filename": "red-saree.jpg",
        "description": "Timeless crimson pure silk draped with intricate golden floral brocade zari border and rich festive pallu.",
        "occasion": "Bridal & Festive Celebrations",
        "stock_status": "in_stock",
        "is_active": True
    },
    {
        "name": "Peacock Royal Blue Silk Saree",
        "category": "sarees",
        "department": "Indian",
        "gender": "women",
        "clothing_type": "one-piece",
        "fabric": "Royal Chiffon Georgette Silk",
        "color": "Royal Peacock Blue",
        "price": 3299.0,
        "image_filename": "blue-saree.jpg",
        "description": "Lustrous royal peacock blue silk featuring ornate hand-embroidered silver-gold borders and modern fluid drape.",
        "occasion": "Reception & Evening Gala",
        "stock_status": "in_stock",
        "is_active": True
    },
    {
        "name": "Heritage Emerald Kanchipuram Saree",
        "category": "sarees",
        "department": "Indian",
        "gender": "women",
        "clothing_type": "one-piece",
        "fabric": "Pure Kanchipuram Silk",
        "color": "Emerald Green",
        "price": 4999.0,
        "image_filename": "green-saree.jpg",
        "description": "Lustrous emerald green weave adorned with ceremonial temple motifs and an opulent golden brocade pallu.",
        "occasion": "Traditional Ceremonies & Weddings",
        "stock_status": "in_stock",
        "is_active": True
    },
    {
        "name": "Blush Pink Embroidered Anarkali Kurti Suit",
        "category": "kurtis",
        "department": "Indian",
        "gender": "women",
        "clothing_type": "one-piece",
        "fabric": "Pure Chanderi Silk & Georgette",
        "color": "Blush Pink & Champagne Gold",
        "price": 3899.0,
        "image_filename": "kurti-suit.jpg",
        "description": "Graceful flaring Anarkali silhouette highlighted with delicate zari needlework, scalloped neckline, and flowing dupatta.",
        "occasion": "Festive Gatherings & Haldi",
        "stock_status": "in_stock",
        "is_active": True
    },
    {
        "name": "Royal Crimson Velvet Bridal Lehenga",
        "category": "lehengas",
        "department": "Indian",
        "gender": "women",
        "clothing_type": "one-piece",
        "fabric": "Micro Velvet & Net",
        "color": "Crimson Wine & Antique Gold",
        "price": 12999.0,
        "image_filename": "designer-lehenga.jpg",
        "description": "Regal flared velvet lehenga skirt embellished with authentic zardozi embroidery, peacock motifs, and embellished blouse.",
        "occasion": "Grand Wedding & Sangeet",
        "stock_status": "in_stock",
        "is_active": True
    },
    {
        "name": "Imperial Ivory Silk Brocade Sherwani",
        "category": "sherwanis",
        "department": "Indian",
        "gender": "men",
        "clothing_type": "upper_body",
        "fabric": "Raw Banarasi Brocade Silk",
        "color": "Ivory Cream & Antique Gold",
        "price": 8499.0,
        "image_filename": "royal-sherwani.jpg",
        "description": "Sophisticated ivory bespoke sherwani crafted with woven paisley patterns, handcrafted buttons, and tailored Mandarin collar.",
        "occasion": "Groom & Festive Menswear",
        "stock_status": "in_stock",
        "is_active": True
    },

    # Western Wear
    {
        "name": "French Navy Floral Chiffon Midi Dress",
        "category": "dresses",
        "department": "Western",
        "gender": "women",
        "clothing_type": "one-piece",
        "fabric": "Breathable Chiffon Georgette",
        "color": "Navy Blue & Soft White",
        "price": 2799.0,
        "image_filename": "floral-dress.jpg",
        "description": "Effortlessly elegant midi dress tailored with gentle flutter sleeves, flattering V-neckline, and waist tie sash.",
        "occasion": "Brunch & Summer Evenings",
        "stock_status": "in_stock",
        "is_active": True
    },
    {
        "name": "Tailored Sky Blue Oxford Button-Down",
        "category": "shirts",
        "department": "Western",
        "gender": "unisex",
        "clothing_type": "upper_body",
        "fabric": "100% Giza Cotton Oxford",
        "color": "Sky Blue",
        "price": 1999.0,
        "image_filename": "oxford-shirt.jpg",
        "description": "Classic smart-casual button-down shirt featuring durable pinpoint Oxford weave, mother-of-pearl buttons, and barrel cuffs.",
        "occasion": "Smart Casual & Office Wear",
        "stock_status": "in_stock",
        "is_active": True
    },
    {
        "name": "Minimalist Heavyweight Crewneck T-Shirt",
        "category": "t-shirts",
        "department": "Western",
        "gender": "unisex",
        "clothing_type": "upper_body",
        "fabric": "240 GSM Combed Organic Cotton",
        "color": "Pitch Black",
        "price": 1299.0,
        "image_filename": "premium-tshirt.jpg",
        "description": "Architectural boxy cut tee constructed from premium ring-spun cotton with reinforced ribbed collar and clean drop shoulder.",
        "occasion": "Everyday Luxury & Casual",
        "stock_status": "in_stock",
        "is_active": True
    },
    {
        "name": "Heritage Nappa Leather Biker Jacket",
        "category": "jackets",
        "department": "Western",
        "gender": "unisex",
        "clothing_type": "upper_body",
        "fabric": "Top-Grain Supple Lambskin Leather",
        "color": "Obsidian Black",
        "price": 7999.0,
        "image_filename": "leather-jacket.jpg",
        "description": "Iconic asymmetric motorcycle jacket with brushed nickel zippers, notched lapels, and interior satin lining.",
        "occasion": "Autumn, Winter & Evening",
        "stock_status": "in_stock",
        "is_active": True
    }
]

def init_catalog_seeds(db: Session):
    """Ensure catalog has starter inventory items if database is empty or all items are inactive."""
    existing_count = db.query(CatalogItem).count()
    active_count = db.query(CatalogItem).filter(CatalogItem.is_active == True).count()
    if existing_count == 0:
        logger.info("Initializing starter catalog with genuine Indian & Western inventory items...")
        for item_data in SEED_CATALOG:
            item = CatalogItem(**item_data)
            db.add(item)
        db.commit()
        logger.info(f"Successfully seeded {len(SEED_CATALOG)} catalog items.")
    elif active_count == 0:
        logger.info("Reactivating starter catalog inventory...")
        for item in db.query(CatalogItem).all():
            item.is_active = True
        db.commit()


def get_catalog_items(
    db: Session,
    department: Optional[str] = None,
    category: Optional[str] = None,
    gender: Optional[str] = None,
    search: Optional[str] = None,
    only_active: bool = True
) -> List[CatalogItem]:
    query = db.query(CatalogItem)
    if only_active:
        query = query.filter(CatalogItem.is_active == True)
    if department:
        query = query.filter(CatalogItem.department.ilike(department))
    if category and category.lower() != "all":
        query = query.filter(CatalogItem.category.ilike(category))
    if gender and gender.lower() != "all":
        query = query.filter(CatalogItem.gender.ilike(gender))
    if search:
        search_fmt = f"%{search.strip()}%"
        query = query.filter(
            (CatalogItem.name.ilike(search_fmt)) |
            (CatalogItem.description.ilike(search_fmt)) |
            (CatalogItem.fabric.ilike(search_fmt))
        )
    return query.order_by(CatalogItem.id.asc()).all()

def get_catalog_item_by_id(db: Session, item_id: int) -> Optional[CatalogItem]:
    return db.query(CatalogItem).filter(CatalogItem.id == item_id).first()

def create_catalog_item(db: Session, data: CatalogItemCreate) -> CatalogItem:
    item = CatalogItem(**data.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

def update_catalog_item(db: Session, item_id: int, data: CatalogItemUpdate) -> Optional[CatalogItem]:
    item = get_catalog_item_by_id(db, item_id)
    if not item:
        return None
    update_data = data.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(item, field, val)
    db.commit()
    db.refresh(item)
    return item

def delete_catalog_item(db: Session, item_id: int) -> bool:
    item = get_catalog_item_by_id(db, item_id)
    if not item:
        return False
    db.delete(item)
    db.commit()
    return True
