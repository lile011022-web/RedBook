from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import Account, Draft, Persona, User
from app.schemas.business import AiDraftGenerateRequest, DraftResponse
from app.services.openai_writer import (
    build_draft_prompt,
    generate_draft_content,
    resolve_openai_api_key,
)

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post(
    "/generate-draft",
    response_model=DraftResponse,
    status_code=status.HTTP_201_CREATED,
)
async def generate_ai_draft(
    request: AiDraftGenerateRequest,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> Draft:
    account = db.query(Account).filter(Account.account_id == request.account_id).first()
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found.")

    persona = db.query(Persona).filter(Persona.account_id == request.account_id).first()
    if not persona:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Persona not found.")

    api_key = resolve_openai_api_key(db)
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OpenAI API key is not configured.",
        )

    prompt = build_draft_prompt(
        positioning=persona.positioning,
        content_direction=persona.content_direction,
        tone=persona.tone,
        disabled_words=persona.disabled_words,
        topic=request.topic,
    )
    content = await generate_draft_content(api_key=api_key, prompt=prompt)

    draft = Draft(
        account_id=request.account_id,
        title=content.title,
        body=content.body,
        tags=content.tags,
        cover_text=content.cover_text,
        source="ai",
        review_status="needs_review",
        compliance_status="unchecked",
    )
    db.add(draft)
    db.commit()
    db.refresh(draft)
    return draft
