from __future__ import annotations

from typing import Any


def api_error(code: str, message: str, details: Any | None = None) -> dict[str, Any]:
    payload: dict[str, Any] = {"error": {"code": code, "message": message}}
    if details is not None:
        payload["error"]["details"] = details
    return payload


def api_success(data: dict[str, Any] | None = None) -> dict[str, Any]:
    payload: dict[str, Any] = {"success": True}
    if data is not None:
        payload["data"] = data
    return payload
