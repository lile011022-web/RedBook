from datetime import datetime

from pydantic import BaseModel, Field


class AccountCreate(BaseModel):
    display_name: str = Field(min_length=1, max_length=255)


class AccountResponse(BaseModel):
    id: str
    account_id: str
    display_name: str
    status: str
    health_score: int
    created_at: datetime


class PersonaUpsert(BaseModel):
    positioning: str = ""
    content_direction: str = ""
    tone: str = ""
    disabled_words: list[str] = Field(default_factory=list)
    publish_frequency: str = ""


class PersonaResponse(PersonaUpsert):
    id: str
    account_id: str
    created_at: datetime


class DraftCreate(BaseModel):
    account_id: str
    title: str = Field(min_length=1, max_length=255)
    body: str = Field(min_length=1)
    tags: list[str] = Field(default_factory=list)
    cover_text: str = ""
    source: str = "manual"


class DraftReviewUpdate(BaseModel):
    review_status: str


class DraftResponse(BaseModel):
    id: str
    account_id: str
    title: str
    body: str
    tags: list[str]
    cover_text: str
    source: str
    review_status: str
    compliance_status: str
    created_at: datetime


class PublishTaskCreate(BaseModel):
    account_id: str
    draft_id: str
    scheduled_at: datetime


class PublishTaskResponse(BaseModel):
    id: str
    account_id: str
    draft_id: str
    scheduled_at: datetime
    status: str
    created_at: datetime


class RiskLogResponse(BaseModel):
    id: str
    account_id: str | None
    risk_type: str
    severity: str
    message: str
    related_entity_type: str | None
    related_entity_id: str | None
    created_at: datetime


class MediaAssetCreate(BaseModel):
    account_id: str
    filename: str = Field(min_length=1, max_length=255)
    content_type: str = "application/octet-stream"
    preview_url: str | None = None
    sha256: str | None = Field(default=None, min_length=64, max_length=64)


class MediaAssetResponse(BaseModel):
    id: str
    account_id: str
    filename: str
    content_type: str
    storage_key: str
    preview_url: str | None
    sha256: str | None
    reused_from_asset_id: str | None
    created_at: datetime


class PublishLogCreate(BaseModel):
    account_id: str
    draft_id: str
    published_at: datetime
    note_url: str = ""


class PublishLogResponse(BaseModel):
    id: str
    account_id: str
    draft_id: str
    published_at: datetime
    note_url: str
    created_at: datetime


class AnalyticsRecordCreate(BaseModel):
    account_id: str
    publish_log_id: str
    views: int = Field(default=0, ge=0)
    likes: int = Field(default=0, ge=0)
    favorites: int = Field(default=0, ge=0)
    comments: int = Field(default=0, ge=0)
    recorded_at: datetime


class AnalyticsRecordResponse(BaseModel):
    id: str
    account_id: str
    publish_log_id: str
    views: int
    likes: int
    favorites: int
    comments: int
    recorded_at: datetime
    created_at: datetime


class SettingUpsert(BaseModel):
    value: str = ""
    is_secret: bool = False


class SettingResponse(BaseModel):
    id: str
    key: str
    value: str
    is_secret: bool
    created_at: datetime


class AiDraftGenerateRequest(BaseModel):
    account_id: str
    topic: str = Field(min_length=1, max_length=255)
