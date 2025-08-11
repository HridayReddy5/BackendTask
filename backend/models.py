from pydantic import BaseModel, Field
from typing import List, Literal, Optional, Dict, Any  # <-- needed for answers

# ---- Domain types ----
# Restrict question types to a small, known set to keep frontend rendering stable.
QuestionType = Literal[
    "multiple_choice_single",
    "multiple_choice_multi",
    "rating",
    "open_text",
]

class Choice(BaseModel):
    # Labels for choice-type questions.
    id: str
    label: str

class Question(BaseModel):
    # Unified question model used by both LLM and mock output.
    id: str
    type: QuestionType
    text: str
    required: bool = True
    choices: Optional[List[Choice]] = None
    scale_min: Optional[int] = None
    scale_max: Optional[int] = None
    placeholder: Optional[str] = None

class Survey(BaseModel):
    # Top-level survey entity returned to the frontend.
    id: str
    title: str
    description: str
    questions: List[Question]

# ---- Generate survey I/O ----
class GenerateSurveyRequest(BaseModel):
    # Incoming request from the frontend to generate a survey.
    description: str = Field(..., min_length=5, max_length=500)
    num_questions: int = Field(8, ge=3, le=20)
    language: str = Field("en")

class GenerateSurveyResponse(BaseModel):
    # Wrapper so we can evolve the payload later without breaking clients.
    survey: Survey

# ---- Save responses I/O ----
class SaveResponsesRequest(BaseModel):
    # Map of questionId -> value (string | number | array | object)
    answers: Dict[str, Any]

class SaveResponsesResponse(BaseModel):
    success: bool
    response_id: int
