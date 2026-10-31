# Debugging knowledge library

This folder contains the initial dataset used by Team Member 3 for the Quality & Community objective.

## Purpose
The library stores representative debugging scenarios for common programming errors. Each entry contains enough information to explain the problem, suggest a correction, and explain how to validate that the fix is correct.

## Status model
Each case includes a `status` field:
- `verified_human` — reviewed by a human
- `verified_test` — checked via automated tests
- `unverified_ai` — AI-generated and not independently validated

Never present an `unverified_ai` suggestion as a verified correction.

## File format
The library is stored in `knowledge/debug_cases.json` and follows the schema defined in `schemas/debug_case.schema.json`.

## How to add a new case
1. Copy the structure of an existing entry.
2. Add a unique `id`.
3. Set the language and error category.
4. Include a clear example code snippet.
5. Document the explanation and the verified correction.
6. Add verification steps and a clear source reference.
7. Keep `status` aligned with validation level.
