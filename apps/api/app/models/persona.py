from datetime import datetime

from sqlalchemy import DateTime, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.common import new_uuid, utc_now


class Persona(Base):
    __tablename__ = "personas"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    account_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    positioning: Mapped[str] = mapped_column(Text, default="")
    content_direction: Mapped[str] = mapped_column(Text, default="")
    tone: Mapped[str] = mapped_column(String(255), default="")
    disabled_words: Mapped[list[str]] = mapped_column(JSON, default=list)
    publish_frequency: Mapped[str] = mapped_column(String(120), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
