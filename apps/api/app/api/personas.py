from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import Account, Persona, User
from app.schemas.business import PersonaResponse, PersonaUpsert

router = APIRouter(tags=["personas"])


@router.put("/accounts/{account_id}/persona", response_model=PersonaResponse)
def upsert_persona(
    account_id: str,
    request: PersonaUpsert,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> Persona:
    account = db.query(Account).filter(Account.account_id == account_id).first()
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found.")

    persona = db.query(Persona).filter(Persona.account_id == account_id).first()
    if not persona:
        persona = Persona(account_id=account_id)
        db.add(persona)

    persona.positioning = request.positioning
    persona.content_direction = request.content_direction
    persona.tone = request.tone
    persona.disabled_words = request.disabled_words
    persona.publish_frequency = request.publish_frequency

    db.commit()
    db.refresh(persona)
    return persona
