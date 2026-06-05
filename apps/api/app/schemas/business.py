from datetime import date, datetime

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
    source: str = "external"


class MediaAssetResponse(BaseModel):
    id: str
    account_id: str
    filename: str
    content_type: str
    storage_key: str
    preview_url: str | None
    sha256: str | None
    reused_from_asset_id: str | None
    source: str
    file_size: int
    width: int | None
    height: int | None
    created_at: datetime


class AiMediaGenerateImageRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=1000)
    style: str = Field(default="", max_length=500)


class AiMediaIdeaRequest(BaseModel):
    goal: str = Field(min_length=1, max_length=1000)


class AiMediaIdeaResponse(BaseModel):
    cover_concepts: list[str]
    shooting_script: list[str]
    video_storyboard: list[str]
    asset_checklist: list[str]


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


class AiDraftOptionsRequest(AiDraftGenerateRequest):
    count: int = Field(default=3, ge=1, le=5)
    extra_requirements: str = Field(default="", max_length=1000)


class DashboardRecordCreate(BaseModel):
    account_id: str
    period_label: str = Field(default="近7日", max_length=32)
    period_start: date
    period_end: date
    exposure_count: int = Field(default=0, ge=0)
    view_count: int = Field(default=0, ge=0)
    like_count: int = Field(default=0, ge=0)
    comment_count: int = Field(default=0, ge=0)
    net_follower_count: int = 0
    new_follow_count: int = Field(default=0, ge=0)
    cover_click_rate: float = Field(default=0.0, ge=0)
    video_completion_rate: float = Field(default=0.0, ge=0)
    favorite_count: int = Field(default=0, ge=0)
    share_count: int = Field(default=0, ge=0)
    unfollow_count: int = Field(default=0, ge=0)
    profile_visit_count: int = Field(default=0, ge=0)
    exposure_change: str = Field(default="", max_length=32)
    view_change: str = Field(default="", max_length=32)
    like_change: str = Field(default="", max_length=32)
    comment_change: str = Field(default="", max_length=32)
    follower_change: str = Field(default="", max_length=32)
    cover_click_change: str = Field(default="", max_length=32)
    video_completion_change: str = Field(default="", max_length=32)
    profile_visit_change: str = Field(default="", max_length=32)
    notes: str = Field(default="", max_length=1000)


class DashboardRecordResponse(DashboardRecordCreate):
    id: str
    created_at: datetime


class AiDashboardAnalysisRequest(BaseModel):
    account_id: str
    dashboard_record_id: str | None = None


class AiDashboardAnalysisResponse(BaseModel):
    summary: str
    diagnosis: list[str]
    recommendations: list[str]
    next_actions: list[str]
    content_angles: list[str]
