from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import Account, DashboardRecord, Draft, Persona, User
from app.schemas.business import (
    AiDashboardAnalysisRequest,
    AiDashboardAnalysisResponse,
    AiDraftGenerateRequest,
    AiDraftOptionsRequest,
    DraftResponse,
)
from app.services.openai_writer import (
    build_dashboard_analysis_prompt,
    build_draft_options_prompt,
    build_draft_prompt,
    generate_dashboard_analysis,
    generate_draft_content,
    generate_draft_options,
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


@router.post(
    "/generate-draft-options",
    response_model=list[DraftResponse],
    status_code=status.HTTP_201_CREATED,
)
async def generate_ai_draft_options(
    request: AiDraftOptionsRequest,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> list[Draft]:
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

    prompt = build_draft_options_prompt(
        positioning=persona.positioning,
        content_direction=persona.content_direction,
        tone=persona.tone,
        disabled_words=persona.disabled_words,
        topic=request.topic,
        count=request.count,
        extra_requirements=request.extra_requirements,
    )
    contents = await generate_draft_options(api_key=api_key, prompt=prompt)
    if not contents:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="OpenAI returned no draft options.",
        )

    drafts = [
        Draft(
            account_id=request.account_id,
            title=content.title,
            body=content.body,
            tags=content.tags,
            cover_text=content.cover_text,
            source="ai",
            review_status="needs_review",
            compliance_status="unchecked",
        )
        for content in contents
    ]
    db.add_all(drafts)
    db.commit()
    for draft in drafts:
        db.refresh(draft)
    return drafts


@router.post("/analyze-dashboard", response_model=AiDashboardAnalysisResponse)
async def analyze_dashboard(
    request: AiDashboardAnalysisRequest,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> AiDashboardAnalysisResponse:
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

    records_query = db.query(DashboardRecord).filter(DashboardRecord.account_id == request.account_id)
    if request.dashboard_record_id:
        records_query = records_query.filter(DashboardRecord.id == request.dashboard_record_id)
    records = records_query.order_by(DashboardRecord.period_end.desc()).limit(5).all()
    if not records:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dashboard record not found.")

    recent_drafts = (
        db.query(Draft)
        .filter(Draft.account_id == request.account_id)
        .order_by(Draft.created_at.desc())
        .limit(10)
        .all()
    )
    prompt = build_dashboard_analysis_prompt(
        persona=persona,
        records=records,
        recent_drafts=recent_drafts,
    )
    analysis = await generate_dashboard_analysis(api_key=api_key, prompt=prompt)
    return AiDashboardAnalysisResponse(
        summary=analysis.summary,
        diagnosis=analysis.diagnosis,
        recommendations=analysis.recommendations,
        next_actions=analysis.next_actions,
        content_angles=analysis.content_angles,
    )
