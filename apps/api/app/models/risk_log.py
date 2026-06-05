from datetime import datetime

from sqlalchemy import DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.common import new_uuid, utc_now


class RiskLog(Base):
    __tablename__ = "risk_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    account_id: Mapped[str | None] = mapped_column(String(64), index=True, nullable=True)
    risk_type: Mapped[str] = mapped_column(String(120))
    severity: Mapped[str] = mapped_column(String(32), default="warning")
    message: Mapped[str] = mapped_column(Text)
    related_entity_type: Mapped[str | None] = mapped_column(String(120), nullable=True)
    related_entity_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
