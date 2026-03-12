from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from datetime import datetime
from app.database import Base

class AdminNotification(Base):
    __tablename__ = "admin_notifications"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String)  # 'Security', 'Sync', 'System'
    message = Column(Text)
    severity = Column(String)  # 'Low', 'Medium', 'High'
    created_at = Column(DateTime, default=datetime.utcnow)
    is_read = Column(Boolean, default=False)
