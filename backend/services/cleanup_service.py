import logging
import time
from pathlib import Path
from backend.core.config import settings

logger = logging.getLogger("cleanup-service")

def cleanup_expired_files():
    """Deletes temporary customer portrait uploads and generated outputs exceeding retention limit."""
    now = time.time()
    retention_secs = settings.TEMPORARY_RETENTION_SECONDS
    deleted_count = 0

    try:
        # Check files in outputs directory
        for f in settings.OUTPUTS_DIR.glob("*.*"):
            if not f.is_file():
                continue
            # Temporary files and try-on results
            if f.name.startswith("temp_") or f.name.startswith("result_") or f.name.startswith("cust_"):
                try:
                    file_age = now - f.stat().st_mtime
                    if file_age > retention_secs:
                        f.unlink()
                        deleted_count += 1
                except Exception as e:
                    logger.warning(f"Error removing expired file {f.name}: {e}")

        if deleted_count > 0:
            logger.info(f"Cleaned up {deleted_count} expired temporary files to protect customer privacy.")
    except Exception as e:
        logger.error(f"Error during scheduled file cleanup: {e}")

def purge_customer_session(job_id: str):
    """Explicitly purges files associated with a specific try-on job or session upon user reset."""
    try:
        for f in settings.OUTPUTS_DIR.glob(f"*{job_id}*"):
            if f.is_file():
                try:
                    f.unlink()
                    logger.info(f"Purged session file: {f.name}")
                except Exception:
                    pass
    except Exception as e:
        logger.warning(f"Error purging session {job_id}: {e}")
