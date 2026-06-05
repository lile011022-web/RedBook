from pathlib import PurePosixPath
import hashlib

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import Account, MediaAsset, Persona, RiskLog, User
from app.schemas.business import (
    AiMediaGenerateImageRequest,
    AiMediaIdeaRequest,
    AiMediaIdeaResponse,
    MediaAssetCreate,
    MediaAssetResponse,
)
from app.services.openai_writer import (
    build_image_generation_prompt,
    build_media_ideas_prompt,
    generate_image_bytes,
    generate_media_ideas,
    resolve_openai_api_key,
)
from app.services.storage import (
    build_cross_account_reuse_warning,
    build_local_media_path,
    build_media_file_url,
    build_media_storage_key,
)

router = APIRouter(tags=["media"])


def create_reuse_warning_if_needed(
    *,
    account_id: str,
    sha256: str | None,
    db: Session,
) -> MediaAsset | None:
    if not sha256:
        return None

    existing_asset = (
        db.query(MediaAsset)
        .filter(MediaAsset.sha256 == sha256)
        .filter(MediaAsset.account_id != account_id)
        .first()
    )
    if existing_asset:
        warning = build_cross_account_reuse_warning(account_id, existing_asset.id)
        db.add(RiskLog(**warning))
    return existing_asset


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
    existing_asset = create_reuse_warning_if_needed(
        account_id=request.account_id,
        sha256=request.sha256,
        db=db,
    )

    media_asset = MediaAsset(
        account_id=request.account_id,
        filename=safe_filename,
        content_type=request.content_type,
        storage_key="pending",
        preview_url=request.preview_url,
        sha256=request.sha256,
        reused_from_asset_id=existing_asset.id if existing_asset else None,
        source=request.source,
        file_size=0,
    )
    db.add(media_asset)
    db.flush()

    media_asset.storage_key = build_media_storage_key(
        account_id=request.account_id,
        asset_id=media_asset.id,
        filename=safe_filename,
    )

    db.commit()
    db.refresh(media_asset)
    return media_asset


@router.post(
    "/accounts/{account_id}/media-assets/upload",
    response_model=MediaAssetResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_media_asset(
    account_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> MediaAsset:
    account = db.query(Account).filter(Account.account_id == account_id).first()
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found.")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="File is empty.")

    safe_filename = PurePosixPath(file.filename or "asset.bin").name
    digest = hashlib.sha256(content).hexdigest()
    existing_asset = create_reuse_warning_if_needed(account_id=account_id, sha256=digest, db=db)
    media_asset = MediaAsset(
        account_id=account_id,
        filename=safe_filename,
        content_type=file.content_type or "application/octet-stream",
        storage_key="pending",
        preview_url=None,
        sha256=digest,
        reused_from_asset_id=existing_asset.id if existing_asset else None,
        source="upload",
        file_size=len(content),
    )
    db.add(media_asset)
    db.flush()

    media_asset.storage_key = build_media_storage_key(
        account_id=account_id,
        asset_id=media_asset.id,
        filename=safe_filename,
    )
    media_path = build_local_media_path(account_id, media_asset.id, safe_filename)
    media_path.parent.mkdir(parents=True, exist_ok=True)
    media_path.write_bytes(content)
    media_asset.preview_url = build_media_file_url(media_asset.id)

    db.commit()
    db.refresh(media_asset)
    return media_asset


@router.get("/media-assets/{asset_id}/file")
def get_media_asset_file(
    asset_id: str,
    db: Session = Depends(get_db),
) -> FileResponse:
    asset = db.get(MediaAsset, asset_id)
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Media asset not found.")

    media_path = build_local_media_path(asset.account_id, asset.id, asset.filename)
    if not media_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Media file not found.")

    return FileResponse(
        media_path,
        filename=asset.filename,
        media_type=asset.content_type,
    )


@router.post("/accounts/{account_id}/media-ideas", response_model=AiMediaIdeaResponse)
async def create_media_ideas(
    account_id: str,
    request: AiMediaIdeaRequest,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> AiMediaIdeaResponse:
    account = db.query(Account).filter(Account.account_id == account_id).first()
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="账号不存在。")

    persona = db.query(Persona).filter(Persona.account_id == account_id).first()
    if not persona:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="请先到「人设」页面保存该账号的人设。")

    api_key = resolve_openai_api_key(db)
    if not api_key:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OpenAI API Key 未配置。请先在后端环境变量或设置中配置。")

    prompt = build_media_ideas_prompt(persona=persona, goal=request.goal)
    ideas = await generate_media_ideas(api_key=api_key, prompt=prompt)
    return AiMediaIdeaResponse(
        cover_concepts=ideas.cover_concepts,
        shooting_script=ideas.shooting_script,
        video_storyboard=ideas.video_storyboard,
        asset_checklist=ideas.asset_checklist,
    )


@router.post(
    "/accounts/{account_id}/media-assets/generate-image",
    response_model=MediaAssetResponse,
    status_code=status.HTTP_201_CREATED,
)
async def generate_media_image(
    account_id: str,
    request: AiMediaGenerateImageRequest,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> MediaAsset:
    account = db.query(Account).filter(Account.account_id == account_id).first()
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="账号不存在。")

    persona = db.query(Persona).filter(Persona.account_id == account_id).first()
    if not persona:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="请先到「人设」页面保存该账号的人设。")

    api_key = resolve_openai_api_key(db)
    if not api_key:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OpenAI API Key 未配置。请先在后端环境变量或设置中配置。")

    image_prompt = build_image_generation_prompt(persona=persona, prompt=request.prompt, style=request.style)
    image_content = await generate_image_bytes(api_key=api_key, prompt=image_prompt)
    digest = hashlib.sha256(image_content).hexdigest()
    existing_asset = create_reuse_warning_if_needed(account_id=account_id, sha256=digest, db=db)
    media_asset = MediaAsset(
        account_id=account_id,
        filename="ai-generated.png",
        content_type="image/png",
        storage_key="pending",
        preview_url=None,
        sha256=digest,
        reused_from_asset_id=existing_asset.id if existing_asset else None,
        source="ai_image",
        file_size=len(image_content),
    )
    db.add(media_asset)
    db.flush()
    media_asset.storage_key = build_media_storage_key(
        account_id=account_id,
        asset_id=media_asset.id,
        filename=media_asset.filename,
    )
    media_path = build_local_media_path(account_id, media_asset.id, media_asset.filename)
    media_path.parent.mkdir(parents=True, exist_ok=True)
    media_path.write_bytes(image_content)
    media_asset.preview_url = build_media_file_url(media_asset.id)

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
