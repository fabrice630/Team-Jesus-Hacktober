# DevAid AI

DevAid AI is an accessible debugging workspace for developers. It turns a code sample and an error message into an explanation, a proposed correction, and verification steps.

## Run locally

```bash
npm install
npm run dev
```

The frontend reads the backend origin from `VITE_API_BASE_URL`. If it is omitted, requests use the current origin, so a local proxy or same-origin backend can handle `/api/v1/debug`.

```bash
VITE_API_BASE_URL=http://localhost:3000 npm run dev
```

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
```

No AI or backend secret belongs in the frontend. The browser only calls the backend endpoint.
