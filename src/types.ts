export type ResponseLanguage = 'en' | 'fr';

export interface DebugRequest {
  language: string;
  code: string;
  error_message: string;
  description?: string;
  response_language: ResponseLanguage;
}

export interface DebugResponse {
  error_type: string;
  explanation: string;
  probable_cause: string;
  suggested_correction: string;
  corrected_code: string;
  verification_steps: string[];
  warnings: string[];
}
