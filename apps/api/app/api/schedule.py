from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import Account, Draft, PublishTask, RiskLog, User
from app.schemas.business import PublishTaskCreate, PublishTaskResponse
from app.services.compliance import (
    check_ai_draft_can_be_scheduled,
    check_same_minute_account_conflict,
)

router = APIRouter(prefix="/publish-tasks", tags=["schedule"])


def _create_risk_log(
    db: Session,
    *,
    account_id: str,
    risk_type: str,
    message: str,
    related_entity_type: str,
    related_entity_id: str,
) -> None:
    db.add(
        RiskLog(
            account_id=account_id,
            risk_type=risk_type,
            severity="blocked",
            message=message,
            related_entity_type=related_entity_type,
            related_entity_id=related_entity_id,
        )
    )


@router.post("", response_model=PublishTaskResponse, status_code=status.HTTP_201_CREATED)
def create_publish_task(
    request: PublishTaskCreate,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> PublishTask:
    account = db.query(Account).filter(Account.account_id == request.account_id).first()
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found.")

    draft = db.get(Draft, request.draft_id)
    if not draft or draft.account_id != request.account_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Draft not found.")

    ai_review_check = check_ai_draft_can_be_scheduled(draft.source, draft.review_status)
    if not ai_review_check.allowed:
        _create_risk_log(
            db,
            account_id=request.account_id,
            risk_type="unreviewed_ai_draft",
            message=ai_review_check.message,
            related_entity_type="draft",
            related_entity_id=draft.id,
        )
        db.commit()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=ai_review_check.message)

    existing_tasks = db.query(PublishTask).filter(PublishTask.status == "scheduled").all()
    schedule_check = check_same_minute_account_conflict(
        new_account_id=request.account_id,
        new_scheduled_at=request.scheduled_at,
        existing_tasks=[
            {"account_id": task.account_id, "scheduled_at": task.scheduled_at}
            for task in existing_tasks
        ],
    )
    if not schedule_check.allowed:
        _create_risk_log(
            db,
            account_id=request.account_id,
            risk_type="same_minute_multi_account",
            message=schedule_check.message,
            related_entity_type="publish_task",
            related_entity_id=None,
        )
        db.commit()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=schedule_check.message)

    publish_task = PublishTask(
        account_id=request.account_id,
        draft_id=request.draft_id,
        scheduled_at=request.scheduled_at,
        status="scheduled",
    )
    db.add(publish_task)
    db.commit()
    db.refresh(publish_task)
    return publish_task


@router.get("", response_model=list[PublishTaskResponse])
def list_publish_tasks(
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> list[PublishTask]:
    return db.query(PublishTask).order_by(PublishTask.scheduled_at.asc()).all()
