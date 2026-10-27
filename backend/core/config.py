import os
from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings

# Root directory of the repository
BASE_DIR = Path(__file__).resolve().parent.parent.parent
BACKEND_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    SECRET_KEY: str = "virtual-dressing-room-secret-key-32chars"

    # Public Store URL for QR Code
    PUBLIC_STORE_URL: str = "http://localhost:5173"

    # AI Model Providers: "idm-vton", "fashn", or "nano-banana"
    AI_TRYON_PROVIDER: str = "idm-vton"
    COLAB_VTON_URL: str = ""
    HF_TOKEN: str = ""
    FASHN_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    TRYONCLOUD_API_KEY: str = ""

    # Database
    DATABASE_URL: str = "sqlite:///./virtual_dressing_room.db"

    # Admin Credentials
    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD: str = "adminpass123"
    ADMIN_SECRET_KEY: str = "admin-session-secret-key-dev-only"

    # Privacy & Storage Retention
    TEMPORARY_RETENTION_SECONDS: int = 1800  # 30 minutes
    MAX_UPLOAD_SIZE_MB: int = 10

    # Paths
    IMAGES_DIR: Path = BACKEND_DIR / "images"
    OUTPUTS_DIR: Path = BACKEND_DIR / "outputs"

    # CORS
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:8000"

    @property
    def cors_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    class Config:
        env_file = str(BASE_DIR / ".env")
        env_file_encoding = "utf-8"
        extra = "ignore"

def get_lan_ip() -> str:
    """Detect the reachable local network IP of this machine."""
    import socket
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(0.5)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        if ip and ip != "127.0.0.1":
            return ip
    except Exception:
        pass

    try:
        hostname = socket.gethostname()
        ip = socket.gethostbyname(hostname)
        if ip and not ip.startswith("127."):
            return ip
    except Exception:
        pass

    return "127.0.0.1"

def get_reachable_base_url() -> str:
    """
    Returns the URL reachable by other devices (such as customer mobile phones on same Wi-Fi).
    Prioritizes PUBLIC_STORE_URL if configured with a real domain/tunnel,
    otherwise uses the machine's LAN IP on the backend port.
    """
    pub = (settings.PUBLIC_STORE_URL or "").strip()
    if pub and "localhost" not in pub and "127.0.0.1" not in pub:
        return pub.rstrip("/")

    lan_ip = get_lan_ip()
    return f"http://{lan_ip}:{settings.PORT}"

settings = Settings()

# Ensure required directories exist
settings.IMAGES_DIR.mkdir(parents=True, exist_ok=True)
settings.OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)

