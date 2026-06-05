from datetime import date, datetime

from sqlalchemy import Date, DateTime, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.common import new_uuid, utc_now


class DashboardRecord(Base):
    __tablename__ = "dashboard_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    account_id: Mapped[str] = mapped_column(String(64), index=True)
    period_label: Mapped[str] = mapped_column(String(32), default="近7日")
    period_start: Mapped[date] = mapped_column(Date)
    period_end: Mapped[date] = mapped_column(Date)
    exposure_count: Mapped[int] = mapped_column(Integer, default=0)
    view_count: Mapped[int] = mapped_column(Integer, default=0)
    like_count: Mapped[int] = mapped_column(Integer, default=0)
    comment_count: Mapped[int] = mapped_column(Integer, default=0)
    net_follower_count: Mapped[int] = mapped_column(Integer, default=0)
    new_follow_count: Mapped[int] = mapped_column(Integer, default=0)
    cover_click_rate: Mapped[float] = mapped_column(Float, default=0.0)
    video_completion_rate: Mapped[float] = mapped_column(Float, default=0.0)
    favorite_count: Mapped[int] = mapped_column(Integer, default=0)
    share_count: Mapped[int] = mapped_column(Integer, default=0)
    unfollow_count: Mapped[int] = mapped_column(Integer, default=0)
    profile_visit_count: Mapped[int] = mapped_column(Integer, default=0)
    exposure_change: Mapped[str] = mapped_column(String(32), default="")
    view_change: Mapped[str] = mapped_column(String(32), default="")
    like_change: Mapped[str] = mapped_column(String(32), default="")
    comment_change: Mapped[str] = mapped_column(String(32), default="")
    follower_change: Mapped[str] = mapped_column(String(32), default="")
    cover_click_change: Mapped[str] = mapped_column(String(32), default="")
    video_completion_change: Mapped[str] = mapped_column(String(32), default="")
    profile_visit_change: Mapped[str] = mapped_column(String(32), default="")
    notes: Mapped[str] = mapped_column(String(1000), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
