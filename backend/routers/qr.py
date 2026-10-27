import io
from typing import Optional
from fastapi import APIRouter, Query, Response
import qrcode
from backend.core.config import settings, get_reachable_base_url, get_lan_ip

router = APIRouter(prefix="/api/qr", tags=["In-Store QR Code"])

@router.get("")
def generate_store_qr(
    session_id: Optional[str] = Query(None, description="Customer dressing room session ID"),
    size: int = Query(8, ge=4, le=16, description="QR code box size scale")
):
    """
    Generates a live QR Code pointing to the mobile upload page for the customer's session.
    Encodes the computer's reachable LAN IP (or configured public URL) so phones on the same Wi-Fi can connect.
    """
    base_url = get_reachable_base_url()
    if session_id:
        target_url = f"{base_url}/mobile-upload?session={session_id.strip()}"
    else:
        target_url = f"{base_url}/mobile-upload"

    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=size,
        border=2,
    )
    qr.add_data(target_url)
    qr.make(fit=True)

    img = qr.make_image(fill_color="#120e14", back_color="#ffffff")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)

    return Response(content=buf.getvalue(), media_type="image/png")

@router.get("/info")
def get_qr_info(session_id: Optional[str] = Query(None)):
    """Retrieve the URL and metadata embedded inside the in-store QR code."""
    base_url = get_reachable_base_url()
    if session_id:
        target_url = f"{base_url}/mobile-upload?session={session_id.strip()}"
    else:
        target_url = f"{base_url}/mobile-upload"

    return {
        "reachable_base_url": base_url,
        "session_id": session_id,
        "mobile_upload_url": target_url,
        "qr_image_endpoint": f"/api/qr{f'?session_id={session_id}&size=8' if session_id else '?size=8'}",
        "lan_ip": get_lan_ip(),
        "port": settings.PORT
    }

@router.get("/network-info")
def get_network_info():
    """Diagnostic endpoint to inspect host network configuration."""
    base_url = get_reachable_base_url()
    return {
        "lan_ip": get_lan_ip(),
        "port": settings.PORT,
        "reachable_base_url": base_url,
        "is_custom_public_url": base_url != f"http://{get_lan_ip()}:{settings.PORT}"
    }

