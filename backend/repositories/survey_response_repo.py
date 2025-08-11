from sqlalchemy import select
from backend.db import SessionLocal
from backend.models_db import SurveyResponse

# Repository for persisting end-user survey responses.

async def save_response(survey_id: str, answers: dict) -> int:
    """
    Persist a single response:
    - 'answers' is stored as JSONB as-is
    - primary key is returned to the caller for reference
    """
    async with SessionLocal() as session:
        rec = SurveyResponse(survey_id=survey_id, answers=answers)
        session.add(rec)
        await session.flush()     # assigns primary key (rec.id) without full commit
        rid = rec.id
        await session.commit()
        return rid
