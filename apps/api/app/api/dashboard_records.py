from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import Account, DashboardRecord, User
from app.schemas.business import DashboardRecordCreate, DashboardRecordResponse

router = APIRouter(prefix="/dashboard-records", tags=["dashboard-records"])


@router.post("", response_model=DashboardRecordResponse, status_code=status.HTTP_201_CREATED)
def create_dashboard_record(
    request: DashboardRecordCreate,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> DashboardRecord:
    account = db.query(Account).filter(Account.account_id == request.account_id).first()
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found.")

    record = DashboardRecord(**request.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("", response_model=list[DashboardRecordResponse])
def list_dashboard_records(
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> list[DashboardRecord]:
    return db.query(DashboardRecord).order_by(DashboardRecord.period_end.desc()).all()


@router.get("/accounts/{account_id}", response_model=list[DashboardRecordResponse])
def list_account_dashboard_records(
    account_id: str,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> list[DashboardRecord]:
    account = db.query(Account).filter(Account.account_id == account_id).first()
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found.")

    return (
        db.query(DashboardRecord)
        .filter(DashboardRecord.account_id == account_id)
        .order_by(DashboardRecord.period_end.desc())
        .all()
    )
