import json
from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import Setting


DEFAULT_OPENAI_MODEL = "gpt-5.2"


@dataclass(frozen=True)
class DraftContent:
    title: str
    body: str
    tags: list[str]
    cover_text: str


@dataclass(frozen=True)
class DashboardAnalysis:
    summary: str
    diagnosis: list[str]
    recommendations: list[str]
    next_actions: list[str]
    content_angles: list[str]


def build_draft_prompt(
    positioning: str,
    content_direction: str,
    tone: str,
    disabled_words: list[str],
    topic: str,
) -> str:
    disabled = ", ".join(disabled_words) if disabled_words else "none"
    return (
        "Generate Xiaohongshu content for compliant manual publishing.\n"
        f"Persona positioning: {positioning}\n"
        f"Content direction: {content_direction}\n"
        f"Tone: {tone}\n"
        f"Topic: {topic}\n"
        f"Disabled words: {disabled}\n"
        "Do not make exaggerated claims. Do not imply guaranteed outcomes. "
        "Do not include platform automation instructions. "
        "Return only JSON with title, body, tags, and cover_text. "
        "All generated content requires manual review before scheduling."
    )


def build_draft_options_prompt(
    *,
    positioning: str,
    content_direction: str,
    tone: str,
    disabled_words: list[str],
    topic: str,
    count: int,
    extra_requirements: str = "",
) -> str:
    disabled = ", ".join(disabled_words) if disabled_words else "none"
    return (
        "Generate multiple Xiaohongshu content options for compliant manual publishing.\n"
        f"Persona positioning: {positioning}\n"
        f"Content direction: {content_direction}\n"
        f"Tone: {tone}\n"
        f"Topic: {topic}\n"
        f"Option count: {count}\n"
        f"Extra requirements: {extra_requirements or 'none'}\n"
        f"Disabled words: {disabled}\n"
        "Do not make exaggerated claims. Do not imply guaranteed outcomes. "
        "Do not include platform automation instructions, login instructions, scraping, or publishing automation. "
        "Return only JSON with a drafts array. Each draft must include title, body, tags, and cover_text. "
        "Use Chinese. All generated content requires manual review before scheduling."
    )


def build_dashboard_analysis_prompt(*, persona: object, records: list[object], recent_drafts: list[object]) -> str:
    record_payloads = [
        {
            "period_label": getattr(record, "period_label", ""),
            "period_start": str(getattr(record, "period_start", "")),
            "period_end": str(getattr(record, "period_end", "")),
            "exposure_count": getattr(record, "exposure_count", 0),
            "view_count": getattr(record, "view_count", 0),
            "like_count": getattr(record, "like_count", 0),
            "comment_count": getattr(record, "comment_count", 0),
            "net_follower_count": getattr(record, "net_follower_count", 0),
            "new_follow_count": getattr(record, "new_follow_count", 0),
            "cover_click_rate": getattr(record, "cover_click_rate", 0),
            "video_completion_rate": getattr(record, "video_completion_rate", 0),
            "favorite_count": getattr(record, "favorite_count", 0),
            "share_count": getattr(record, "share_count", 0),
            "unfollow_count": getattr(record, "unfollow_count", 0),
            "profile_visit_count": getattr(record, "profile_visit_count", 0),
            "trend_notes": {
                "exposure": getattr(record, "exposure_change", ""),
                "view": getattr(record, "view_change", ""),
                "like": getattr(record, "like_change", ""),
                "comment": getattr(record, "comment_change", ""),
                "follower": getattr(record, "follower_change", ""),
                "cover_click": getattr(record, "cover_click_change", ""),
                "video_completion": getattr(record, "video_completion_change", ""),
                "profile_visit": getattr(record, "profile_visit_change", ""),
            },
            "notes": getattr(record, "notes", ""),
        }
        for record in records
    ]
    draft_payloads = [
        {
            "title": getattr(draft, "title", ""),
            "body": getattr(draft, "body", "")[:500],
            "tags": getattr(draft, "tags", []),
            "review_status": getattr(draft, "review_status", ""),
        }
        for draft in recent_drafts
    ]
    payload = {
        "persona": {
            "positioning": getattr(persona, "positioning", ""),
            "content_direction": getattr(persona, "content_direction", ""),
            "tone": getattr(persona, "tone", ""),
            "publish_frequency": getattr(persona, "publish_frequency", ""),
        },
        "manual_dashboard_records": record_payloads,
        "recent_drafts": draft_payloads,
    }
    return (
        "You are a Chinese Xiaohongshu operations analyst. The following creator-center metrics "
        "were manually entered by the operator; do not ask to automate reading, scraping, login, or publishing. "
        "Give practical advice that respects human review and compliant manual publishing.\n"
        f"Data JSON: {json.dumps(payload, ensure_ascii=False)}\n"
        "Return only JSON with summary, diagnosis, recommendations, next_actions, and content_angles. "
        "Each field except summary must be an array of concise Chinese strings."
    )


def parse_draft_content(raw_text: str) -> DraftContent:
    payload = json.loads(raw_text)
    tags = payload.get("tags", [])
    if not isinstance(tags, list):
        tags = []

    return DraftContent(
        title=str(payload.get("title", "")).strip(),
        body=str(payload.get("body", "")).strip(),
        tags=[str(tag).strip() for tag in tags if str(tag).strip()],
        cover_text=str(payload.get("cover_text", "")).strip(),
    )


def parse_draft_options(raw_text: str) -> list[DraftContent]:
    payload = json.loads(raw_text)
    drafts = payload.get("drafts", [])
    if not isinstance(drafts, list):
        drafts = []

    return [
        DraftContent(
            title=str(item.get("title", "")).strip(),
            body=str(item.get("body", "")).strip(),
            tags=[
                str(tag).strip()
                for tag in (item.get("tags", []) if isinstance(item.get("tags", []), list) else [])
                if str(tag).strip()
            ],
            cover_text=str(item.get("cover_text", "")).strip(),
        )
        for item in drafts
        if isinstance(item, dict)
    ]


def _string_list(value: object) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(item).strip() for item in value if str(item).strip()]


def parse_dashboard_analysis(raw_text: str) -> DashboardAnalysis:
    payload = json.loads(raw_text)
    return DashboardAnalysis(
        summary=str(payload.get("summary", "")).strip(),
        diagnosis=_string_list(payload.get("diagnosis", [])),
        recommendations=_string_list(payload.get("recommendations", [])),
        next_actions=_string_list(payload.get("next_actions", [])),
        content_angles=_string_list(payload.get("content_angles", [])),
    )


def resolve_openai_api_key(db: Session) -> str | None:
    settings = get_settings()
    if settings.openai_api_key:
        return settings.openai_api_key

    stored_key = db.query(Setting).filter(Setting.key == "openai_api_key").first()
    if stored_key and stored_key.value:
        return stored_key.value

    return None


async def generate_draft_content(
    *,
    api_key: str,
    prompt: str,
    model: str = DEFAULT_OPENAI_MODEL,
) -> DraftContent:
    from openai import AsyncOpenAI

    client = AsyncOpenAI(api_key=api_key)
    response = await client.responses.create(model=model, input=prompt)
    return parse_draft_content(response.output_text)


async def generate_draft_options(
    *,
    api_key: str,
    prompt: str,
    model: str = DEFAULT_OPENAI_MODEL,
) -> list[DraftContent]:
    from openai import AsyncOpenAI

    client = AsyncOpenAI(api_key=api_key)
    response = await client.responses.create(model=model, input=prompt)
    return parse_draft_options(response.output_text)


async def generate_dashboard_analysis(
    *,
    api_key: str,
    prompt: str,
    model: str = DEFAULT_OPENAI_MODEL,
) -> DashboardAnalysis:
    from openai import AsyncOpenAI

    client = AsyncOpenAI(api_key=api_key)
    response = await client.responses.create(model=model, input=prompt)
    return parse_dashboard_analysis(response.output_text)
