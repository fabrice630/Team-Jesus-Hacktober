from fastapi import APIRouter

from backend.models import DebugRequest, DebugResponse
from backend.services import debugger_service

router = APIRouter()


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@router.post("/api/v1/debug", response_model=DebugResponse)
async def debug(request: DebugRequest) -> DebugResponse:
    return await debugger_service.analyze(request)
