from typing import Literal

from pydantic import BaseModel, Field, field_validator


class DebugRequest(BaseModel):
    language: Literal["python", "javascript"]
    code: str = Field(min_length=1, max_length=50_000)
    error_message: str = Field(min_length=1, max_length=10_000)
    description: str = Field(min_length=1, max_length=2_000)
    response_language: Literal["en", "fr"] = "en"

    @field_validator("code", "error_message", "description")
    @classmethod
    def reject_blank_values(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("must not be blank")
        return value


class DebugResponse(BaseModel):
    error_type: str
    explanation: str
    probable_cause: str
    suggested_fix: str
    corrected_code: str
    verification_steps: list[str] = Field(min_length=1, max_length=10)
    limitations: list[str] = Field(min_length=1, max_length=10)
