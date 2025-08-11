AI Survey Generator – Backend + Frontend Integration
A small FastAPI backend that turns a short brief into a structured survey (MCQ, multi-select, ratings, open text), caches results in Postgres, and exposes an endpoint to save responses. The provided frontend page stays visually unchanged; the Generate Survey button uses the typed description and auto-fills the Survey Questions block.

Tech choices
FastAPI (Python 3.11)
Fast, type-safe request/response modeling, automatic OpenAPI docs, async-ready.

Pydantic v2
Validates input/output schemas (length limits, enums) for predictable payloads.

SQLAlchemy (async) + asyncpg + PostgreSQL
JSONB for flexible survey shape; async engine for responsiveness.

OpenAI API (via adapter)
A thin adapter isolates the LLM call. Pluggable (mock mode, or swap in another LLM).

CORS + clear API versioning
/v1/surveys/generate (+ /api alias) keeps the contract explicit and easy to swap.

Project structure (backend)
bash
Copy
Edit
backend/
  adapters/
    openai_adapter.py        # LLM calls (or mock)
  repositories/
    survey_cache_repo.py     # cache generated surveys
    survey_response_repo.py  # store user responses
  services/
    survey_service.py        # business logic (cache -> LLM -> validate -> cache)
  models.py                  # Pydantic schemas
  models_db.py               # SQLAlchemy models (SurveyCache, SurveyResponse)
  config.py                  # BaseSettings (env vars)
  db.py                      # async engine/session factory
  main.py                    # FastAPI app, routes, startup (create_all)
Key routes
POST /v1/surveys/generate (alias: /api/surveys/generate)
Request: { "description": string, "num_questions"?: number, "language"?: "en" }
Response: { "survey": { id, title, description, questions: [...] } }
Header: X-Survey-Source: llm | cache | mock

POST /v1/surveys/{survey_id}/responses (alias: /api/...)
Request: { "answers": { [questionId]: value } }
Response: { "success": true, "response_id": number }

Setup & run
1) Requirements
Python 3.11

PostgreSQL 14+ (local is fine)

Node 18+ (for the frontend dev server)

2) Backend – install & env
bash
Copy
Edit
cd BackendTask
python -m venv .venv
# Windows:
. .venv/Scripts/activate
# macOS/Linux:
# source .venv/bin/activate

pip install -r backend/requirements.txt
Create backend/.env:

ini
Copy
Edit
# LLM
OPENAI_API_KEY=sk-...        # set a working key OR use mock mode below
OPENAI_MODEL=gpt-4o-mini
OPENAI_TIMEOUT_MS=12000
MOCK_LLM=0                   # set to 1 to bypass OpenAI and use deterministic mock

# DB (asyncpg URL)
DATABASE_URL=postgresql+asyncpg://survey_user:yourpass@localhost:5432/surveydb

# CORS (optional)
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
Postgres (create DB & permissions):

sql
Copy
Edit
-- in psql as a superuser
CREATE DATABASE surveydb;
CREATE USER survey_user WITH PASSWORD 'yourpass';
ALTER DATABASE surveydb OWNER TO survey_user;
GRANT ALL PRIVILEGES ON DATABASE surveydb TO survey_user;
ALTER SCHEMA public OWNER TO survey_user;        -- fixes “permission denied for schema public”
3) Run backend
bash
Copy
Edit
uvicorn backend.main:app --reload --port 8000
OpenAPI docs: http://127.0.0.1:8000/docs

4) Frontend – dev run
Set API base for your app (either one usually works in your template):

Vite: VITE_API_BASE=http://localhost:8000

CRA: REACT_APP_API_BASE=http://localhost:8000

Then:

bash
Copy
Edit
# from your frontend root
npm install
npm run dev   # or npm start, depending on your setup
5) Quick sanity checks
Generate (curl):

bash
Copy
Edit
curl -s -X POST http://127.0.0.1:8000/v1/surveys/generate \
  -H "Content-Type: application/json" \
  -d '{"description":"Onboarding feedback","num_questions":6,"language":"en"}'
In browser DevTools → Network, check response header X-Survey-Source:

llm → from OpenAI

cache → returned from Postgres

mock → OpenAI quota missing / MOCK_LLM=1

Save responses (optional):

bash
Copy
Edit
curl -s -X POST "http://127.0.0.1:8000/v1/surveys/srv_demo/responses" \
  -H "Content-Type: application/json" \
  -d '{"answers":{"q1":"c2","q2":5,"q3":"Great!"}}'
Common issues

permission denied for schema public → run ALTER SCHEMA public OWNER TO survey_user;

404 on generate → your frontend might call /api/...; both /v1 and /api are available

429 / insufficient_quota → set MOCK_LLM=1 to keep working while you fix billing

What I focused on
Clean API design – versioned routes, explicit schemas, proper status codes, helpful errors

LLM adapter + graceful fallback – deterministic mock when quota/timeouts happen; X-Survey-Source reveals source

Idempotent caching – same (description, num_questions, language) → same survey from JSONB cache

Async Postgres + JSONB – flexible shape; responsive under concurrent requests

Validation & defaults – Pydantic enforces bounds; rating defaults to 1–5

Frontend fit without redesign – “Generate Survey” uses the typed description and updates the existing right-hand panel

Observability – header shows llm|cache|mock for demo clarity

Future improvements (if I had more time)
GET /surveys/{id} and GET /surveys/{id}/responses?limit=...

Answer validation against the generated schema before insert

AuthN/Z (JWT) and per-user ownership of drafts/responses

Background persistence of responses created from the builder page

Structured logging + Prometheus metrics