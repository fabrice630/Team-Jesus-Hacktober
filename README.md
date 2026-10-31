# Team-Jesus-Hacktober

DevAid AI is a hackathon project combining:
- a Python FastAPI backend for debugging analysis
- a React + Vite frontend for interaction
- a quality layer for debugging knowledge and validation

## Project structure

- `backend/` — FastAPI application and debugging service
- `knowledge/` — curated debugging cases and knowledge entries
- `schemas/` — JSON schema for the debugging library
- `src/` — frontend app
- `tests/` — backend and quality tests

## Backend

```bash
python3.12 -m venv .venv
source .venv/bin/activate
pip install -e ".[test]"
cp .env.example .env
uvicorn backend.main:app --reload
pytest
```

## Frontend

```bash
npm install
npm run dev
```

## Environment

The frontend reads `VITE_API_BASE_URL`. The backend uses `.env` variables from `.env.example` and allows AI integration via an OpenAI-compatible provider.

## Quality & Community

The knowledge library stores verified and unverified debugging cases. It helps distinguish AI suggestions from corrections that have been tested or reviewed.

## API contract

`POST /api/v1/debug`

Request:

```json
{
  "language": "python",
  "code": "items = []\nprint(items[0])",
  "error_message": "IndexError: list index out of range",
  "description": "Explain and fix this error",
  "response_language": "en"
}
```

Response:

```json
{
  "error_type": "IndexError",
  "explanation": "The requested index does not exist in the sequence.",
  "probable_cause": "The code accesses a position outside the valid bounds.",
  "suggested_correction": "Use a valid index or check the length before accessing it.",
  "corrected_code": "items = []\nprint(items[0])",
  "verification_steps": ["Run the corrected code."],
  "warnings": ["AI suggestions must be verified before use."]
}
```
