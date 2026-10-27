from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime
from backend.db.database import Base

class TryonJob(Base):
    __tablename__ = "tryon_jobs"

    id = Column(String(64), primary_key=True, index=True)
    status = Column(String(20), nullable=False, default="queued", index=True) # queued, processing, completed, failed
    progress = Column(Integer, nullable=False, default=0) # 0 to 100
    person_image_path = Column(String(255), nullable=False)
    garment_id = Column(Integer, nullable=True)
    garment_image_path = Column(String(255), nullable=False)
    garment_name = Column(String(255), nullable=True)
    clothing_type = Column(String(50), nullable=False, default="one-piece")
    prompt = Column(Text, nullable=True)
    provider = Column(String(50), nullable=False, default="idm-vton")
    result_url = Column(String(255), nullable=True)
    error_message = Column(Text, nullable=True)
    error_code = Column(String(50), nullable=True) # e.g. QUOTA_EXHAUSTED, PROVIDER_BUSY
    retry_after_seconds = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    def to_dict(self):
        return {
            "job_id": self.id,
            "status": self.status,
            "progress": self.progress,
            "garment_id": self.garment_id,
            "garment_name": self.garment_name,
            "clothing_type": self.clothing_type,
            "provider": self.provider,
            "result_url": self.result_url,
            "error_message": self.error_message,
            "error_code": self.error_code,
            "retry_after_seconds": self.retry_after_seconds,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None
        }
