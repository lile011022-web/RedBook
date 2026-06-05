from pathlib import PurePosixPath

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import Account, MediaAsset, RiskLog, User
from app.schemas.business import MediaAssetCreate, MediaAssetResponse
from app.services.storage import build_cross_account_reuse_warning, build_media_storage_key

router = APIRouter(tags=["media"])


@router.post("/media-assets", response_model=MediaAssetResponse, status_code=status.HTTP_201_CREATED)
def create_media_asset(
    request: MediaAssetCreate,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> MediaAsset:
    account = db.query(Account).filter(Account.account_id == request.account_id).first()
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found.")

    safe_filename = PurePosixPath(request.filename).name
    existing_asset = None
    if request.sha256:
        existing_asset = (
            db.query(MediaAsset)
            .filter(MediaAsset.sha256 == request.sha256)
            .filter(MediaAsset.account_id != request.account_id)
            .first()
        )

    media_asset = MediaAsset(
        account_id=request.account_id,
        filename=safe_filename,
        content_type=request.content_type,
        storage_key="pending",
        preview_url=request.preview_url,
        sha256=request.sha256,
        reused_from_asset_id=existing_asset.id if existing_asset else None,
    )
    db.add(media_asset)
    db.flush()

    media_asset.storage_key = build_media_storage_key(
        account_id=request.account_id,
        asset_id=media_asset.id,
        filename=safe_filename,
    )

    if existing_asset:
        warning = build_cross_account_reuse_warning(request.account_id, existing_asset.id)
        db.add(RiskLog(**warning))

    db.commit()
    db.refresh(media_asset)
    return media_asset


@router.get("/accounts/{account_id}/media-assets", response_model=list[MediaAssetResponse])
def list_media_assets(
    account_id: str,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> list[MediaAsset]:
    account = db.query(Account).filter(Account.account_id == account_id).first()
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found.")

    return (
        db.query(MediaAsset)
        .filter(MediaAsset.account_id == account_id)
        .order_by(MediaAsset.created_at.desc())
        .all()
    )
