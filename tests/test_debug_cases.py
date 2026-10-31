import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "knowledge" / "debug_cases.json"


def load_cases():
    payload = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    return payload["cases"]


def test_library_contains_valid_cases():
    cases = load_cases()
    assert len(cases) >= 3

    required_keys = {
        "id",
        "title",
        "language",
        "error_category",
        "status",
        "problem_description",
        "example_code",
        "error_message",
        "explanation",
        "suggested_correction",
        "verification_steps",
        "source",
    }

    for case in cases:
        assert required_keys.issubset(case.keys())
        assert case["status"] in {"verified_human", "verified_test", "unverified_ai"}
        assert case["language"] in {"python", "javascript", "typescript", "java", "csharp", "other"}
        assert isinstance(case["verification_steps"], list) and len(case["verification_steps"]) >= 1


def test_unverified_entries_are_not_marked_verified():
    cases = load_cases()
    unverified = [case for case in cases if case["status"] == "unverified_ai"]

    for case in unverified:
        assert case["status"] == "unverified_ai"
        assert "verified" not in case["suggested_correction"].lower()
