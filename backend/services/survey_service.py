import re
from pydantic import ValidationError
from backend.models import GenerateSurveyRequest, Survey
from backend.adapters.openai_adapter import OpenAIAdapter
from backend.config import settings
from backend.repositories.survey_cache_repo import fetch_cached, save_cache


# -- Local mock generator (used for MOCK_LLM=1 or as fallback) -----------------
# Deterministic output that keeps UX working when the LLM is unavailable
# (e.g., missing/invalid API key, quota issues, timeouts).
def _generate_mock_survey(description: str, num_questions: int = 8, language: str = "en") -> dict:
    base_title = f"Survey: {description}"
    qs = [
        {
            "id": "q1",
            "type": "multiple_choice_single",
            "text": "How satisfied are you overall?",
            "required": True,
            "choices": [
                {"id": "c1", "label": "Very satisfied"},
                {"id": "c2", "label": "Satisfied"},
                {"id": "c3", "label": "Neutral"},
                {"id": "c4", "label": "Dissatisfied"},
                {"id": "c5", "label": "Very dissatisfied"},
            ],
        },
        {"id": "q2", "type": "rating", "text": "Rate your overall experience", "scale_min": 1, "scale_max": 5},
        {"id": "q3", "type": "open_text", "text": "What did we do well?", "placeholder": "Your answer..."},
        {"id": "q4", "type": "open_text", "text": "What could we improve?", "placeholder": "Your answer..."},
        {
            "id": "q5",
            "type": "multiple_choice_multi",
            "text": "Which aspects mattered most?",
            "choices": [
                {"id": "c1", "label": "Price"},
                {"id": "c2", "label": "Quality"},
                {"id": "c3", "label": "Delivery"},
                {"id": "c4", "label": "Customer support"},
            ],
        },
    ]
    # Respect requested length (min 3)
    qs = qs[: max(3, min(num_questions, len(qs)))]
    return {
        "title": base_title,
        "description": f'Auto-generated (mock) from brief: "{description}"',
        "questions": qs,
    }


# -- OpenAI adapter -------------------------------------------------------------
# Adapter is created once; settings.* provide API key/model/timeout.
adapter = OpenAIAdapter(
    api_key=settings.OPENAI_API_KEY,
    model=getattr(settings, "OPENAI_MODEL", "gpt-4o-mini"),
    timeout_ms=getattr(settings, "OPENAI_TIMEOUT_MS", 12000),
)


def _make_safe_id(text: str) -> str:
    # Lowercase, replace spaces with underscores, strip unsafe chars; limit length.
    return re.sub(r"[^a-z0-9_]", "", text.lower().replace(" ", "_"))[:24] or "survey"


def _fill_missing_ids(survey_dict: dict) -> dict:
    # Ensure 'id' exists for questions/choices to keep frontend stable.
    for i, q in enumerate(survey_dict.get("questions", []), start=1):
        q.setdefault("id", f"q{i}")
        if q.get("choices"):
            for j, c in enumerate(q["choices"], start=1):
                c.setdefault("id", f"c{j}")
    return survey_dict


async def generate_survey_service(req: GenerateSurveyRequest) -> Survey:
    # 1) Try cache first (idempotent by description+num_questions+language)
    cached = await fetch_cached(req.description, req.num_questions, req.language)
    if cached:
        survey = Survey.model_validate({
            "id": f"srv_{_make_safe_id(req.description)}",
            "title": cached.get("title"),
            "description": cached.get("description"),
            "questions": cached.get("questions"),
        })
        # Normalize rating defaults (pydantic allows None; enforce 1–5)
        for q in survey.questions:
            if q.type == "rating":
                if q.scale_min is None:
                    q.scale_min = 1
                if q.scale_max is None:
                    q.scale_max = 5
        return survey

    # 2) Generate (MOCK first if enabled)
    # NOTE: Settings.MOCK_LLM may or may not exist depending on config;
    # getattr(..., False) keeps behavior consistent if it is missing.
    if getattr(settings, "MOCK_LLM", False):
        raw = _generate_mock_survey(req.description, req.num_questions, req.language)
    else:
        try:
            raw = await adapter.generate_survey(
                req.description,
                num_questions=req.num_questions,
                language=req.language,
            )
        except Exception as e:
            # Graceful fallback for common upstream errors (quota, rate limit, timeout)
            msg = str(e).lower()
            if "insufficient_quota" in msg or "429" in msg or "rate" in msg or "timeout" in msg:
                raw = _generate_mock_survey(req.description, req.num_questions, req.language)
            else:
                # Unknown error → bubble up to route handler
                raise

    raw = _fill_missing_ids(raw)

    # 3) Validate to our Pydantic model (ensures the JSON matches our contract)
    try:
        survey = Survey.model_validate({
            "id": f"srv_{_make_safe_id(req.description)}",
            "title": raw.get("title"),
            "description": raw.get("description"),
            "questions": raw.get("questions"),
        })
    except ValidationError as e:
        # Optionally: add a repair step before raising.
        raise e

    # Normalize rating defaults post-parse
    for q in survey.questions:
        if q.type == "rating":
            if q.scale_min is None:
                q.scale_min = 1
            if q.scale_max is None:
                q.scale_max = 5

    # 4) Save to cache for identical inputs (works for both LLM and mock)
    await save_cache(
        req.description,
        req.num_questions,
        req.language,
        {
            "title": survey.title,
            "description": survey.description,
            "questions": [q.model_dump() for q in survey.questions],
        },
    )

    return survey
