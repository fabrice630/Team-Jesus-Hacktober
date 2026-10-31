from __future__ import annotations

import json
import os
import re
from typing import Any

import httpx
from pydantic import ValidationError

from backend.models import DebugRequest, DebugResponse


class ProviderError(Exception):
    """Raised when the configured AI provider cannot produce a valid response."""


class DebuggerService:
    async def analyze(self, request: DebugRequest) -> DebugResponse:
        if os.getenv("AI_API_URL"):
            return await self._analyze_with_provider(request)
        return self._local_analysis(request)

    async def _analyze_with_provider(self, request: DebugRequest) -> DebugResponse:
        url = os.environ["AI_API_URL"]
        timeout = float(os.getenv("AI_TIMEOUT_SECONDS", "15"))
        payload = {
            "model": os.getenv("AI_MODEL", "default"),
            "temperature": 0.1,
            "response_format": {"type": "json_object"},
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You are a secure debugging assistant. Never execute user code. "
                        "Return only JSON matching the requested debugging response schema."
                    ),
                },
                {"role": "user", "content": self._prompt(request)},
            ],
        }
        headers = {}
        api_key = os.getenv("AI_API_KEY")
        if api_key:
            headers["Authorization"] = "Bearer " + api_key
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.post(url, json=payload, headers=headers)
                response.raise_for_status()
                body = response.json()
        except (httpx.HTTPError, ValueError) as exc:
            raise ProviderError("The configured AI provider is unavailable.") from exc

        try:
            content = body["choices"][0]["message"]["content"]
            if isinstance(content, str):
                content = json.loads(content)
            return DebugResponse.model_validate(content)
        except (KeyError, IndexError, TypeError, json.JSONDecodeError, ValidationError) as exc:
            raise ProviderError("The AI provider returned an invalid response.") from exc

    @staticmethod
    def _prompt(request: DebugRequest) -> str:
        return (
            "Analyze this debugging request without executing the code. Respond with JSON keys "
            "error_type, explanation, probable_cause, suggested_correction, corrected_code, "
            "verification_steps, warnings. Preserve the requested response language.\n\n"
            f"Language: {request.language}\nCode:\n{request.code}\n"
            f"Error: {request.error_message}\nRequest: {request.description}\n"
            f"Response language: {request.response_language}"
        )

    @staticmethod
    def _local_analysis(request: DebugRequest) -> DebugResponse:
        message = request.error_message
        error_type = re.match(r"\s*([\w.]+Error|SyntaxError|ReferenceError)", message)
        error_name = error_type.group(1) if error_type else "RuntimeError"
        french = request.response_language == "fr"
        details: dict[str, tuple[str, str, str, str]] = {
            "IndexError": (
                "L'index demandé n'existe pas dans la séquence." if french else "The requested index does not exist in the sequence.",
                "Le code accède à une position hors des limites." if french else "The code accesses a position outside the valid bounds.",
                "Utilisez un index valide ou vérifiez la longueur avant l'accès." if french else "Use a valid index or check the length before accessing it.",
                "Vérifiez que l'élément corrigé est bien celui attendu." if french else "Verify that the corrected element is the one you expect.",
            ),
            "TypeError": (
                "Une opération est appliquée à une valeur d'un type incompatible." if french else "An operation is being applied to an incompatible value type.",
                "Une valeur ne correspond pas au type attendu par l'opération." if french else "A value does not match the type expected by the operation.",
                "Vérifiez les types avant l'opération et convertissez la valeur si nécessaire." if french else "Check the types before the operation and convert the value if needed.",
                "Ajoutez un test couvrant les types réellement reçus." if french else "Add a test covering the types that are actually received.",
            ),
            "ReferenceError": (
                "Une variable ou fonction est utilisée avant d'être définie." if french else "A variable or function is used before it is defined.",
                "Le nom référencé n'est pas disponible dans cette portée." if french else "The referenced name is not available in this scope.",
                "Définissez la valeur avant son utilisation et vérifiez son nom." if french else "Define the value before using it and check its name.",
                "Relancez le programme et vérifiez que la référence est résolue." if french else "Run the program again and verify that the reference resolves.",
            ),
        }
        explanation, cause, fix, verification = details.get(
            error_name,
            (
                f"Le message indique une erreur {error_name} qui doit être analysée dans son contexte." if french else f"The message indicates a {error_name} that must be analyzed in context.",
                "La cause exacte dépend du chemin d'exécution et des valeurs utilisées." if french else "The exact cause depends on the execution path and values used.",
                "Inspectez la ligne signalée et ajoutez une vérification ciblée." if french else "Inspect the reported line and add a targeted check.",
                "Exécutez un test minimal qui reproduit puis vérifie la correction." if french else "Run a minimal test that reproduces and then verifies the fix.",
            ),
        )
        return DebugResponse(
            error_type=error_name,
            explanation=explanation,
            probable_cause=cause,
            suggested_correction=fix,
            corrected_code=DebuggerService._corrected_code(request, error_name),
            verification_steps=[verification],
            warnings=[
                "La suggestion n'exécute pas le code et doit être vérifiée avant utilisation."
                if french
                else "The suggestion does not execute the code and must be verified before use."
            ],
        )

    @staticmethod
    def _corrected_code(request: DebugRequest, error_name: str) -> str:
        if error_name == "IndexError":
            match = re.search(r"(?P<name>[A-Za-z_]\w*)\s*=\s*\[(?P<items>[^\]]*)\]", request.code)
            index = re.search(r"(?P<name>[A-Za-z_]\w*)\s*\[\s*(?P<index>\d+)\s*\]", request.code)
            if match and index and match.group("name") == index.group("name"):
                items = [item for item in match.group("items").split(",") if item.strip()]
                if items:
                    replacement = f"{index.group('name')}[{len(items) - 1}]"
                    return request.code[: index.start()] + replacement + request.code[index.end() :]
        return request.code


debugger_service = DebuggerService()
