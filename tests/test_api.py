from fastapi.testclient import TestClient

from backend.main import app

client = TestClient(app)


def test_health() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["ok"] is True
    assert response.json()["data"]["status"] == "ok"


def test_debug_returns_structured_dynamic_result() -> None:
    response = client.post(
        "/api/v1/debug",
        json={
            "language": "python",
            "code": "items = []\nprint(items[0])",
            "error_message": "IndexError: list index out of range",
            "description": "Explain and fix this error",
            "response_language": "en",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["error_type"] == "IndexError"
    assert body["explanation"]
    assert body["verification_steps"]
    assert body["warnings"]


def test_debug_supports_javascript_and_french() -> None:
    response = client.post(
        "/api/v1/debug",
        json={
            "language": "javascript",
            "code": "console.log(value);",
            "error_message": "ReferenceError: value is not defined",
            "description": "Explique cette erreur",
            "response_language": "fr",
        },
    )
    assert response.status_code == 200
    assert "définie" in response.json()["explanation"]


def test_invalid_language_has_consistent_error() -> None:
    response = client.post(
        "/api/v1/debug",
        json={
            "language": "ruby",
            "code": "puts 1",
            "error_message": "RuntimeError",
            "description": "Explain",
        },
    )
    assert response.status_code == 422
    assert response.json()["ok"] is False
    assert response.json()["error"]["code"] == "validation_error"


def test_blank_code_is_rejected() -> None:
    response = client.post(
        "/api/v1/debug",
        json={
            "language": "python",
            "code": " ",
            "error_message": "ValueError",
            "description": "Explain",
        },
    )
    assert response.status_code == 422
    assert response.json()["ok"] is False
    assert response.json()["error"]["code"] == "validation_error"
