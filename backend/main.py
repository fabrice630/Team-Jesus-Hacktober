from __future__ import annotations

import os
import time
from collections import defaultdict, deque
from typing import Awaitable, Callable

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from backend.routes import router
from backend.services import ProviderError


def _csv_env(name: str, default: str) -> list[str]:
    return [item.strip() for item in os.getenv(name, default).split(",") if item.strip()]


class RequestLimitMiddleware:
    def __init__(self, app: ASGIApp, max_bytes: int) -> None:
        self.app = app
        self.max_bytes = max_bytes

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        headers = dict(scope.get("headers", []))
        content_length = headers.get(b"content-length")
        if content_length:
            try:
                if int(content_length) > self.max_bytes:
                    response = JSONResponse(
                        status_code=413,
                        content={"error": {"code": "payload_too_large", "message": "Request body is too large."}},
                    )
                    await response(scope, receive, send)
                    return
            except ValueError:
                pass

        received = 0

        async def limited_receive() -> Message:
            nonlocal received
            message = await receive()
            if message["type"] == "http.request":
                received += len(message.get("body", b""))
                if received > self.max_bytes:
                    raise RequestTooLargeError
            return message

        try:
            await self.app(scope, limited_receive, send)
        except RequestTooLargeError:
            response = JSONResponse(
                status_code=413,
                content={"error": {"code": "payload_too_large", "message": "Request body is too large."}},
            )
            await response(scope, receive, send)


class RequestTooLargeError(Exception):
    """Raised when a streamed request exceeds the configured body limit."""


class RateLimitMiddleware:
    def __init__(self, app: ASGIApp, max_requests: int, window_seconds: int) -> None:
        self.app = app
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: defaultdict[str, deque[float]] = defaultdict(deque)

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http" or scope["path"] != "/api/v1/debug":
            await self.app(scope, receive, send)
            return

        client = scope.get("client")
        key = client[0] if client else "unknown"
        now = time.monotonic()
        bucket = self.requests[key]
        while bucket and now - bucket[0] >= self.window_seconds:
            bucket.popleft()
        if len(bucket) >= self.max_requests:
            response = JSONResponse(
                status_code=429,
                headers={"Retry-After": str(self.window_seconds)},
                content={"error": {"code": "rate_limited", "message": "Too many debug requests. Try again later."}},
            )
            await response(scope, receive, send)
            return
        bucket.append(now)
        await self.app(scope, receive, send)


app = FastAPI(title="DevAid AI API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=_csv_env("CORS_ORIGINS", "http://localhost:5173"),
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)
app.add_middleware(
    RequestLimitMiddleware,
    max_bytes=int(os.getenv("MAX_REQUEST_BYTES", "100000")),
)
app.add_middleware(
    RateLimitMiddleware,
    max_requests=int(os.getenv("RATE_LIMIT_REQUESTS", "30")),
    window_seconds=int(os.getenv("RATE_LIMIT_WINDOW_SECONDS", "60")),
)
app.include_router(router)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "code": "validation_error",
                "message": "Request validation failed.",
                "details": jsonable_encoder(exc.errors()),
            }
        },
    )


@app.exception_handler(ProviderError)
async def provider_exception_handler(_: Request, exc: ProviderError) -> JSONResponse:
    return JSONResponse(
        status_code=503,
        content={"error": {"code": "ai_service_unavailable", "message": str(exc)}},
    )


@app.exception_handler(Exception)
async def unexpected_exception_handler(_: Request, __: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=500,
        content={"error": {"code": "internal_error", "message": "An unexpected server error occurred."}},
    )
