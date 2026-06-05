from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import Account, User
from app.schemas.business import AccountCreate, AccountResponse

router = APIRouter(prefix="/accounts", tags=["accounts"])


@router.post("", response_model=AccountResponse, status_code=status.HTTP_201_CREATED)
def create_account(
    request: AccountCreate,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> Account:
    account = Account(display_name=request.display_name)
    db.add(account)
    db.commit()
    db.refresh(account)
    return account


@router.get("", response_model=list[AccountResponse])
def list_accounts(
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> list[Account]:
    return db.query(Account).order_by(Account.created_at.desc()).all()
