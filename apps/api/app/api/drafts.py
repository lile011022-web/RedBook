from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import Account, Draft, User
from app.schemas.business import DraftCreate, DraftResponse, DraftReviewUpdate

router = APIRouter(prefix="/drafts", tags=["drafts"])

ALLOWED_REVIEW_STATUSES = {"needs_review", "approved", "rejected"}


@router.get("", response_model=list[DraftResponse])
def list_drafts(
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> list[Draft]:
    return db.query(Draft).order_by(Draft.created_at.desc()).all()


@router.post("", response_model=DraftResponse, status_code=status.HTTP_201_CREATED)
def create_draft(
    request: DraftCreate,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> Draft:
    account = db.query(Account).filter(Account.account_id == request.account_id).first()
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found.")

    review_status = "needs_review" if request.source == "ai" else "approved"
    draft = Draft(
        account_id=request.account_id,
        title=request.title,
        body=request.body,
        tags=request.tags,
        cover_text=request.cover_text,
        source=request.source,
        review_status=review_status,
        compliance_status="unchecked",
    )
    db.add(draft)
    db.commit()
    db.refresh(draft)
    return draft


@router.patch("/{draft_id}/review", response_model=DraftResponse)
def update_draft_review(
    draft_id: str,
    request: DraftReviewUpdate,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> Draft:
    if request.review_status not in ALLOWED_REVIEW_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Unsupported review status.",
        )

    draft = db.get(Draft, draft_id)
    if not draft:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Draft not found.")

    draft.review_status = request.review_status
    draft.compliance_status = "reviewed" if request.review_status == "approved" else "unchecked"
    db.commit()
    db.refresh(draft)
    return draft
