from typing import Literal

from pydantic import BaseModel, Field, field_validator


class DebugRequest(BaseModel):
    language: Literal["python", "javascript"]
    code: str = Field(min_length=1, max_length=50_000)
    error_message: str = Field(min_length=1, max_length=10_000)
    description: str = Field(default="", max_length=2_000)
    response_language: Literal["en", "fr"] = "en"

    @field_validator("language", mode="before")
    @classmethod
    def normalize_language(cls, value: str) -> str:
        aliases = {"Python": "python", "JavaScript": "javascript"}
        return aliases.get(value, value.lower() if isinstance(value, str) else value)

    @field_validator("code", "error_message")
    @classmethod
    def reject_blank_values(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("must not be blank")
        return value

    @field_validator("description")
    @classmethod
    def normalize_description(cls, value: str) -> str:
        return value.strip()


class DebugResponse(BaseModel):
    error_type: str
    explanation: str
    probable_cause: str
    suggested_correction: str
    corrected_code: str
    verification_steps: list[str] = Field(min_length=1, max_length=10)
    warnings: list[str] = Field(min_length=1, max_length=10)
