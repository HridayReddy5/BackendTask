from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import String, Integer, DateTime, func, UniqueConstraint, Index  # <-- Index imported
from sqlalchemy.dialects.postgresql import JSONB

# SQLAlchemy base class for ORM mappings
class Base(DeclarativeBase):
    pass


# -------------------------
# Cached generated surveys
# -------------------------
class SurveyCache(Base):
    __tablename__ = "survey_cache"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    key: Mapped[str] = mapped_column(String(128), nullable=False)  # sha256 of (desc|num|lang)
    description_norm: Mapped[str] = mapped_column(String(600), nullable=False)
    num_questions: Mapped[int] = mapped_column(Integer, nullable=False)
    language: Mapped[str] = mapped_column(String(16), nullable=False)
    survey_json: Mapped[dict] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("key", name="uq_survey_cache_key"),
    )


# -------------------------
# Collected survey responses
# -------------------------
class SurveyResponse(Base):
    __tablename__ = "survey_response"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    survey_id: Mapped[str] = mapped_column(String(128), nullable=False)
    answers: Mapped[dict] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        Index("ix_survey_response_survey_id", "survey_id"),  # <-- needs Index import
    )
