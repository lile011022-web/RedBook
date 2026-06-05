from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import Account, Draft, PublishLog, User
from app.schemas.business import PublishLogCreate, PublishLogResponse

router = APIRouter(prefix="/publish-logs", tags=["publish_logs"])


@router.post("", response_model=PublishLogResponse, status_code=status.HTTP_201_CREATED)
def create_publish_log(
    request: PublishLogCreate,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> PublishLog:
    account = db.query(Account).filter(Account.account_id == request.account_id).first()
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found.")

    draft = db.get(Draft, request.draft_id)
    if not draft or draft.account_id != request.account_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Draft not found.")

    publish_log = PublishLog(
        account_id=request.account_id,
        draft_id=request.draft_id,
        published_at=request.published_at,
        note_url=request.note_url,
    )
    db.add(publish_log)
    db.commit()
    db.refresh(publish_log)
    return publish_log


@router.get("", response_model=list[PublishLogResponse])
def list_publish_logs(
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> list[PublishLog]:
    return db.query(PublishLog).order_by(PublishLog.published_at.desc()).all()
