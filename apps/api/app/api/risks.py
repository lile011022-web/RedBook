from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import RiskLog, User
from app.schemas.business import RiskLogResponse

router = APIRouter(prefix="/risk-logs", tags=["risks"])


@router.get("", response_model=list[RiskLogResponse])
def list_risk_logs(
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> list[RiskLog]:
    return db.query(RiskLog).order_by(RiskLog.created_at.desc()).all()
