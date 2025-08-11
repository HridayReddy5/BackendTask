import hashlib
import re
from typing import Optional
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from backend.db import SessionLocal
from backend.models_db import SurveyCache


from backend.db import SessionLocal
from backend.models_db import SurveyCache

# Helpers for cache normalization and keying.

def normalize_description(text: str) -> str:
    """
    Normalize the user brief:
    - strip leading/trailing whitespace
    - collapse internal whitespace
    - case-fold to make comparisons case-insensitive

    This makes caching robust against minor textual differences.
    """
    t = text.strip()
    t = re.sub(r"\s+", " ", t)
    return t.casefold()

def make_key(description: str, num_questions: int, language: str) -> str:
    """
    Build a stable cache key from (normalized description, num_questions, language).
    SHA-256 avoids key length issues and collisions are practically negligible.
    """
    payload = f"{normalize_description(description)}|{num_questions}|{language.casefold()}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()

async def fetch_cached(description: str, num_questions: int, language: str) -> Optional[dict]:
    """
    Look up a previously generated survey by cache key.
    Returns the stored JSON if present, otherwise None.
    """
    key = make_key(description, num_questions, language)
    async with SessionLocal() as session:
        row = await session.scalar(select(SurveyCache).where(SurveyCache.key == key))
        return row.survey_json if row else None

async def save_cache(description: str, num_questions: int, language: str, survey_json: dict) -> None:
    """
    Insert a new cache record; if a duplicate key races in, we silently ignore it.
    (The unique constraint on key is expected to raise IntegrityError in that case.)
    """
    key = make_key(description, num_questions, language)
    rec = SurveyCache(
        key=key,
        description_norm=normalize_description(description),
        num_questions=num_questions,
        language=language,
        survey_json=survey_json,
    )
    async with SessionLocal() as session:
        session.add(rec)
        try:
            await session.commit()
        except IntegrityError:
            # Another request committed the same key first; treat as a cache "hit" for future requests.
            await session.rollback()  # another request saved it first; fine
