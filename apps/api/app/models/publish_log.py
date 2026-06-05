from datetime import datetime

from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.common import new_uuid, utc_now


class PublishLog(Base):
    __tablename__ = "publish_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    account_id: Mapped[str] = mapped_column(String(64), index=True)
    draft_id: Mapped[str] = mapped_column(String(36), index=True)
    published_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    note_url: Mapped[str] = mapped_column(String(1024), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
