import logging
from contextlib import asynccontextmanager
from pathlib import Path

from typing import Optional
from fastapi import FastAPI, File, Form, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

from backend.core.config import settings, BASE_DIR
from backend.db.database import Base, engine, SessionLocal
from backend.models import CatalogItem, TryonJob
from backend.services.catalog_service import init_catalog_seeds
from backend.services.cleanup_service import cleanup_expired_files
from backend.routers import catalog, tryon, admin, qr

# Ensure tables exist
Base.metadata.create_all(bind=engine)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("dressing-room-app")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create DB tables and seed inventory
    logger.info("Initializing database schema...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        init_catalog_seeds(db)
    finally:
        db.close()

    # Initial cleanup of any stale scratch files
    cleanup_expired_files()
    logger.info(f"AI Virtual Dressing Room backend ready. Active provider: {settings.AI_TRYON_PROVIDER}")
    yield
    # Shutdown
    cleanup_expired_files()

app = FastAPI(
    title="AI Virtual Dressing Room Studio",
    description="Modern AI-powered virtual dressing room for Indian and Western outfits inspired by Looklet.",
    version="4.0.0",
    lifespan=lifespan
)

# CORS: Allow all origins so phones on the same LAN (Wi-Fi) or tunnels can connect without browser blocks
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers
app.include_router(catalog.router)
app.include_router(tryon.router)
app.include_router(admin.router)
app.include_router(qr.router)

# Mount Static Directories for Images and Outputs
app.mount("/images", StaticFiles(directory=str(settings.IMAGES_DIR)), name="images")
app.mount("/outputs", StaticFiles(directory=str(settings.OUTPUTS_DIR)), name="outputs")

# Mobile Upload HTML Serving for QR code scans
MOBILE_UPLOAD_HTML = Path(__file__).resolve().parent / "templates" / "mobile_upload.html"

@app.get("/mobile-upload")
@app.get("/upload")
def serve_mobile_upload():
    """Serves the in-store mobile portrait upload page scanned via QR code."""
    if MOBILE_UPLOAD_HTML.exists():
        return FileResponse(MOBILE_UPLOAD_HTML, media_type="text/html")
    return JSONResponse(status_code=404, content={"detail": "mobile_upload.html not found"})

# Session synchronization backwards compatibility aliases
@app.post("/api/session-upload")
async def legacy_session_upload(
    photo: Optional[UploadFile] = None,
    person: Optional[UploadFile] = None,
    session_id: str = Form(...),
):
    upload_file = photo or person
    return await tryon.upload_session_photo(
        session_id=session_id,
        person=upload_file,
        use_demo=False,
        user_consent=True
    )

@app.get("/api/session-status")
def legacy_session_status(session_id: str = Query(...)):
    return tryon.get_session_status(session_id=session_id)

@app.get("/api/network-info")
def legacy_network_info():
    return qr.get_network_info()

# Backwards compatibility endpoints
@app.get("/api/sarees")
def legacy_sarees():
    """Legacy endpoint returning Indian sarees."""
    db = SessionLocal()
    try:
        from backend.services.catalog_service import get_catalog_items
        sarees = get_catalog_items(db, category="sarees")
        return [item.to_dict() for item in sarees]
    finally:
        db.close()

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "provider": settings.AI_TRYON_PROVIDER,
        "environment": settings.ENVIRONMENT,
        "lan_ip": qr.get_lan_ip(),
        "reachable_base_url": qr.get_reachable_base_url()
    }

# Serve Built Frontend SPA if available
FRONTEND_DIST = BASE_DIR / "frontend" / "dist"
if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Don't hijack API, static, or mobile upload routes
        if any(full_path.startswith(prefix) for prefix in ["api", "images", "outputs", "mobile-upload", "upload"]):
            return JSONResponse(status_code=404, content={"detail": "Not found"})
        target_file = FRONTEND_DIST / full_path
        if target_file.is_file():
            return FileResponse(target_file)
        return FileResponse(FRONTEND_DIST / "index.html")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=settings.PORT, reload=True)

