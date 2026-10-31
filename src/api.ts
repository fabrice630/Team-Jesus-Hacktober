type ApiErrorEnvelope = {
  ok?: boolean;
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
};

function getErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') {
    return fallback;
  }

  const envelope = payload as ApiErrorEnvelope;
  if (envelope.error && typeof envelope.error.message === 'string' && envelope.error.message.trim()) {
    return envelope.error.message;
  }

  if (typeof (payload as { message?: string }).message === 'string' && (payload as { message?: string }).message!.trim()) {
    return (payload as { message?: string }).message!;
  }

  return fallback;
}

function normalizeResponsePayload(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== 'object') {
    return {};
  }

  const data = payload as Record<string, unknown>;
  if ('data' in data && data.data && typeof data.data === 'object') {
    return data.data as Record<string, unknown>;
  }

  return data;
}

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

  const response = normalizeResponsePayload(payload) as Record<string, unknown>;
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

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(getErrorMessage(payload, `The analysis failed with status ${response.status}.`));
    }

    return validateDebugResponse(payload);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('The request took too long. Check your connection and try again.');
    }
    throw error instanceof Error ? error : new Error('Unable to reach the debugging service.');
  } finally {
    window.clearTimeout(timeout);
  }
}
