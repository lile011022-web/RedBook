from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import Account, AnalyticsRecord, PublishLog, User
from app.schemas.business import AnalyticsRecordCreate, AnalyticsRecordResponse

router = APIRouter(prefix="/analytics-records", tags=["analytics"])


@router.post("", response_model=AnalyticsRecordResponse, status_code=status.HTTP_201_CREATED)
def create_analytics_record(
    request: AnalyticsRecordCreate,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> AnalyticsRecord:
    account = db.query(Account).filter(Account.account_id == request.account_id).first()
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found.")

    publish_log = db.get(PublishLog, request.publish_log_id)
    if not publish_log or publish_log.account_id != request.account_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Publish log not found.")

    analytics_record = AnalyticsRecord(
        account_id=request.account_id,
        publish_log_id=request.publish_log_id,
        views=request.views,
        likes=request.likes,
        favorites=request.favorites,
        comments=request.comments,
        recorded_at=request.recorded_at,
    )
    db.add(analytics_record)
    db.commit()
    db.refresh(analytics_record)
    return analytics_record


@router.get("", response_model=list[AnalyticsRecordResponse])
def list_analytics_records(
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> list[AnalyticsRecord]:
    return db.query(AnalyticsRecord).order_by(AnalyticsRecord.recorded_at.desc()).all()
