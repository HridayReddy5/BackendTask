from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from backend.models import GenerateSurveyRequest, GenerateSurveyResponse
from backend.services.survey_service import generate_survey_service
from backend.db import engine
from backend.models_db import Base



from backend.models import (
    GenerateSurveyRequest, GenerateSurveyResponse,
    SaveResponsesRequest, SaveResponsesResponse,
)
from backend.repositories.survey_response_repo import save_response




# FastAPI application instance
app = FastAPI(title="Survey Generator API", version="1.0.0")

# Very open CORS for development; consider restricting in production.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten later
    allow_credentials=True,
    allow_methods=["POST", "GET", "OPTIONS"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def on_startup() -> None:
    # Create tables if they don't exist (simple, migration-free bootstrapping)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

# -----------------------------
# Generate survey (first handler)
# -----------------------------
@app.post("/api/surveys/generate", response_model=GenerateSurveyResponse)
async def generate_survey(req: GenerateSurveyRequest):
    try:
        survey = await generate_survey_service(req)
        return {"survey": survey}
    except HTTPException:
        # Re-raise FastAPI HTTPExceptions (status codes preserved)
        raise
    except Exception as e:
        # Catch-all to avoid leaking stack traces to clients
        raise HTTPException(status_code=500, detail=str(e))



# -----------------------------
# Generate survey (duplicate path)
# NOTE: This duplicates the same route & method as above.
# In FastAPI, multiple handlers with the same path+method can be confusing.
# Kept as-is per instruction to not change logic.
# -----------------------------
@app.post("/api/surveys/generate", response_model=GenerateSurveyResponse)
async def generate_survey(req: GenerateSurveyRequest):
    survey = await generate_survey_service(req)
    return {"survey": survey}

# 👇 Alias so old frontends calling /v1 keep working
@app.post("/v1/surveys/generate", response_model=GenerateSurveyResponse, include_in_schema=False)
async def generate_survey_v1(req: GenerateSurveyRequest):
    survey = await generate_survey_service(req)
    return {"survey": survey}



# -----------------------------
# Record a response
# -----------------------------
@app.post("/api/surveys/{survey_id}/responses", response_model=SaveResponsesResponse)
async def record_response(survey_id: str, req: SaveResponsesRequest):
    rid = await save_response(survey_id, req.answers)
    return {"success": True, "response_id": rid}

# Optional alias if your frontend hits /v1
@app.post("/v1/surveys/{survey_id}/responses", response_model=SaveResponsesResponse, include_in_schema=False)
async def record_response_v1(survey_id: str, req: SaveResponsesRequest):
    rid = await save_response(survey_id, req.answers)
    return {"success": True, "response_id": rid}
