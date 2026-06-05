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
