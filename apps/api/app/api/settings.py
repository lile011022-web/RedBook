from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import Setting, User
from app.schemas.business import SettingResponse, SettingUpsert

router = APIRouter(prefix="/settings", tags=["settings"])

SECRET_PLACEHOLDER = "********"


def _to_response(setting: Setting) -> SettingResponse:
    value = SECRET_PLACEHOLDER if setting.is_secret and setting.value else setting.value
    return SettingResponse(
        id=setting.id,
        key=setting.key,
        value=value,
        is_secret=setting.is_secret,
        created_at=setting.created_at,
    )


@router.get("", response_model=list[SettingResponse])
def list_settings(
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> list[SettingResponse]:
    settings = db.query(Setting).order_by(Setting.key.asc()).all()
    return [_to_response(setting) for setting in settings]


@router.put("/{key}", response_model=SettingResponse)
def upsert_setting(
    key: str,
    request: SettingUpsert,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> SettingResponse:
    setting = db.query(Setting).filter(Setting.key == key).first()
    if not setting:
        setting = Setting(key=key)
        db.add(setting)

    setting.value = request.value
    setting.is_secret = request.is_secret
    db.commit()
    db.refresh(setting)
    return _to_response(setting)
