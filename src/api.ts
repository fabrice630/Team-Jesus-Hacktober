import type { DebugRequest, DebugResponse } from './types';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
const REQUEST_TIMEOUT_MS = 15_000;

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

export function validateDebugResponse(payload: unknown): DebugResponse {
  if (!payload || typeof payload !== 'object') {
    throw new Error('The API returned an invalid response.');
  }

  const response = payload as Record<string, unknown>;
  return {
    error_type: asString(response.error_type, 'Unclassified error'),
    explanation: asString(response.explanation, 'No explanation was provided.'),
    probable_cause: asString(response.probable_cause, 'The cause could not be determined.'),
    suggested_correction: asString(response.suggested_correction, 'Review the affected code and run the verification steps.'),
    corrected_code: asString(response.corrected_code, ''),
    verification_steps: asStringArray(response.verification_steps),
    warnings: asStringArray(response.warnings),
  };
}

export async function analyzeDebugRequest(request: DebugRequest): Promise<DebugResponse> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/debug`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal: controller.signal,
    });

    if (response.status === 429) {
      throw new Error('The service is busy right now. Please wait a moment and try again.');
    }

    if (!response.ok) {
      throw new Error(`The analysis failed with status ${response.status}.`);
    }

    return validateDebugResponse(await response.json());
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('The request took too long. Check your connection and try again.');
    }
    throw error instanceof Error ? error : new Error('Unable to reach the debugging service.');
  } finally {
    window.clearTimeout(timeout);
  }
}
