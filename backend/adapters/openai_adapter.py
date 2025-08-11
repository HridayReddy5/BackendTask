from typing import Any, Dict
from openai import AsyncOpenAI
from backend.config import settings

# IMPORTANT: Uses OpenAI Structured Outputs (response_format.json_schema).
# This enforces the model to return valid JSON conforming to the schema,
# which greatly reduces parsing errors and post-processing.
# Docs: https://platform.openai.com/docs/guides/structured-outputs
def build_survey_json_schema() -> Dict[str, Any]:
    """
    Hand-written JSON schema for survey output.
    - 'strict': True + 'additionalProperties': False ensures the model can't invent fields.
    - Enumerated 'type' keeps question kinds within supported set.
    """
    # Keep this hand-written instead of auto-generated to ensure "additionalProperties": false everywhere.
    # (Several SDK issues point out strictness matters for JSON schema)
    # https://github.com/openai/openai-python/issues/2024
    return {
        "name": "survey_output",
        "strict": True,
        "schema": {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "title": { "type": "string" },
                "description": { "type": "string" },
                "questions": {
                    "type": "array",
                    "minItems": 3,
                    "maxItems": 50,
                    "items": {
                        "type": "object",
                        "additionalProperties": False,
                        "properties": {
                            "id": { "type": "string" },
                            "type": {
                                "type": "string",
                                "enum": ["multiple_choice_single", "multiple_choice_multi", "rating", "open_text"]
                            },
                            "text": { "type": "string" },
                            "required": { "type": "boolean", "default": True },
                            "choices": {
                                "type": ["array", "null"],
                                "items": {
                                    "type": "object",
                                    "additionalProperties": False,
                                    "properties": {
                                        "id": { "type": "string" },
                                        "label": { "type": "string" }
                                    },
                                    "required": ["id", "label"]
                                }
                            },
                            "scale_min": { "type": ["integer", "null"] },
                            "scale_max": { "type": ["integer", "null"] },
                            "placeholder": { "type": ["string", "null"] }
                        },
                        "required": ["id", "type", "text"]
                    }
                }
            },
            "required": ["title", "description", "questions"]
        }
    }

# System prompt biases the model toward clear, neutral, mixed-type surveys,
# and reminds it to ONLY return JSON matching the schema.
SYSTEM_PROMPT = (
    "You are a survey design assistant. Given a short brief, produce a balanced survey "
    "that mixes question types (single/multi choice, rating scales, open text). "
    "Keep language clear and neutral. Return ONLY JSON that matches the provided schema."
)

class OpenAIAdapter:
    """
    Thin adapter around the OpenAI Chat Completions API.
    - Accepts a brief, expected count, and language.
    - Requests structured JSON back that conforms to our schema.
    """
    def __init__(self, api_key: str | None = None, model: str | None = None, timeout_ms: int | None = None):
        self.client = AsyncOpenAI(api_key=api_key)
        self.model = model or settings.OPENAI_MODEL
        self.timeout_ms = timeout_ms or settings.OPENAI_TIMEOUT_MS

    async def generate_survey(self, description: str, num_questions: int = 8, language: str = "en") -> dict:
        """
        Build a JSON-only request using Structured Outputs so the response matches 'build_survey_json_schema'.
        Falls back to parsing 'content' if SDK doesn't expose 'parsed'.
        """
        schema = build_survey_json_schema()

        # Minimal guidance for the model on size, tone, and types.
        user_instruction = (
            f"Brief: {description}\n"
            f"Target number of questions: {num_questions}\n"
            f"Language: {language}\n"
            "Constraints:\n"
            "- Use rating scale (1-5) when using rating type.\n"
            "- Provide 4-6 choices for multiple choice questions.\n"
            "- Ensure IDs are unique and stable strings (e.g., q1, q2, c1, c2...).\n"
            "- Mix types across the questionnaire and avoid redundancy.\n"
        )

        # Chat Completions with response_format.json_schema guarantees valid JSON output.
        resp = await self.client.chat.completions.create(
            model=self.model,
            timeout=self.timeout_ms / 1000.0,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_instruction},
            ],
            response_format={  # Structured Outputs
                "type": "json_schema",
                "json_schema": schema,
            },
            temperature=0.7,
        )

        # Some SDK builds expose 'parsed' directly on the message.
        msg = resp.choices[0].message
        parsed = getattr(msg, "parsed", None)
        if parsed is not None:
            return parsed  # type: ignore[return-value]

        # Fallback: parse JSON string content if 'parsed' is not available.
        content = msg.content or "{}"
        import json
        return json.loads(content)
