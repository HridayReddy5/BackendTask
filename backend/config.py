import os
from pydantic import BaseModel

# Load .env (so you don't have to export vars manually)
MOCK_LLM: bool = os.getenv("MOCK_LLM", "0") in ("1", "true", "True")

# Attempt to load variables from .env if python-dotenv is available.
# (Optional dependency: the app also works with OS env vars only.)
try:
    from dotenv import load_dotenv  # type: ignore
    load_dotenv()
except Exception:
    pass  # if python-dotenv isn't installed, we'll just use the OS env

class Settings(BaseModel):
    # Environment & server toggles
    ENV: str = os.getenv("ENV", "development")
    PORT: int = int(os.getenv("PORT", "8000"))
    CORS_ORIGIN: str = os.getenv("CORS_ORIGIN", "*")
    DATABASE_URL: str | None = os.getenv("DATABASE_URL")

    # OpenAI config
    OPENAI_API_KEY: str | None = os.getenv("OPENAI_API_KEY")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    OPENAI_TIMEOUT_MS: int = int(os.getenv("OPENAI_TIMEOUT_MS", "12000"))

# NOTE: MOCK_LLM is defined at module-level above, not as a Settings field.
# Code that needs it typically does: getattr(settings, "MOCK_LLM", False)
settings = Settings()
