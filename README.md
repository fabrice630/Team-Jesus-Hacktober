# Team-Jesus-Hacktober

## DevAid AI backend

The backend is a FastAPI service exposing:

- `GET /health`
- `POST /api/v1/debug`
- OpenAPI documentation at `/docs`

### Local development

```bash
python3.12 -m venv .venv
source .venv/bin/activate
pip install -e ".[test]"
cp .env.example .env
uvicorn backend.main:app --reload
pytest
```

The required runtime is Python 3.12 or newer; `.python-version` pins the
development version for pyenv-compatible environments.

The API uses a safe, non-executing local analysis fallback when `AI_API_URL` is
unset. To connect an OpenAI-compatible provider, configure `AI_API_URL`,
`AI_MODEL`, and optionally `AI_API_KEY` in `.env`.

Submitted code is analyzed as text only and is not stored or executed by this
service. AI-generated corrections must be reviewed and tested before use.
