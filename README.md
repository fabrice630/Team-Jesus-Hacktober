# DevAid AI

DevAid AI is an accessible debugging workspace for developers. It turns a code sample and an error message into an explanation, a proposed correction, and verification steps.

## Run locally

### Backend

```bash
python3.12 -m venv .venv
source .venv/bin/activate
pip install -e ".[test]"
cp .env.example .env
uvicorn backend.main:app --reload --env-file .env
```

The backend exposes `GET /health`, `POST /api/v1/debug`, and OpenAPI documentation at `/docs`. It uses a safe, non-executing local analysis fallback when `AI_API_URL` is unset.

### Frontend

In a second terminal:

```bash
npm install
VITE_API_BASE_URL=http://localhost:8000 npm run dev
```

The frontend runs on `http://localhost:5173` and sends requests to the FastAPI backend on `http://localhost:8000`.

## API contract

The app sends a `POST /api/v1/debug` request with:

```json
{
	"language": "JavaScript",
	"code": "console.log(value)",
	"error_message": "ReferenceError: value is not defined",
	"description": "Optional context",
	"response_language": "en"
}
```

The response should contain `error_type`, `explanation`, `probable_cause`, `suggested_correction`, `corrected_code`, `verification_steps`, and `warnings`. The UI validates the shape and displays a warning that AI suggestions must be reviewed and tested.

## Checks

```bash
npm run build
npm test
pytest
```

No AI or backend secret belongs in the frontend. The browser only calls the backend endpoint. Submitted code is analyzed as text only and is not stored or executed by this service.

## Quality & Community - Phase 1

The project includes a curated debugging case library used as a quality foundation for backend analysis and frontend guidance.

### Current structure
- `knowledge/` - curated debugging cases
- `schemas/` - validation schema for the case dataset
- `tests/` - automated checks for API and dataset integrity

Each case records its validation status so unverified AI suggestions are not presented as verified corrections.
