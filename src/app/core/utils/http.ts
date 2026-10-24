import { HttpContextToken, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { ApiErrorBody, EmployeeRef } from '../models/api.models';

/** Requests flagged with this token never raise global error toasts (background polling etc.). */
export const SILENT_ERRORS = new HttpContextToken<boolean>(() => false);

type ParamValue = string | number | boolean | null | undefined;

/** Builds HttpParams, skipping `undefined`, `null` and empty strings. */
export function toParams(query: object = {}): HttpParams {
  let params = new HttpParams();
  for (const [key, value] of Object.entries(query as Record<string, ParamValue>)) {
    if (value === undefined || value === null || value === '') continue;
    params = params.set(key, String(value));
  }
  return params;
}

export function apiErrorBody(error: unknown): ApiErrorBody | null {
  if (error instanceof HttpErrorResponse && error.error && typeof error.error === 'object' && !(error.error instanceof Blob)) {
    return error.error as ApiErrorBody;
  }
  return null;
}

/** Human-readable message for any API error (string or validation array). */
export function apiErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) return 'Cannot reach the HCM Lite server. Check that the backend is running.';
    const body = apiErrorBody(error);
    if (body) {
      if (Array.isArray(body.message)) return body.message.join(' · ');
      if (typeof body.message === 'string' && body.message) return body.message;
    }
    if (typeof error.error === 'string' && error.error && !error.error.startsWith('<')) return error.error;
    if (error.status === 429) return 'Too many requests — please wait a moment and try again.';
    return fallback;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function apiErrorCode(error: unknown): string | undefined {
  return apiErrorBody(error)?.code;
}

export function apiStatus(error: unknown): number | undefined {
  return error instanceof HttpErrorResponse ? error.status : undefined;
}

/** Blob error bodies (file downloads) are parsed back into a readable message. */
export async function blobErrorMessage(error: unknown, fallback = 'Download failed.'): Promise<string> {
  if (error instanceof HttpErrorResponse && error.error instanceof Blob) {
    try {
      const parsed = JSON.parse(await error.error.text()) as ApiErrorBody;
      return Array.isArray(parsed.message) ? parsed.message.join(' · ') : parsed.message || fallback;
    } catch {
      return fallback;
    }
  }
  return apiErrorMessage(error, fallback);
}

/** Resolves a populated or plain `employeeId` reference. */
export function refId(ref: string | EmployeeRef | null | undefined): string {
  if (!ref) return '';
  return typeof ref === 'string' ? ref : ref.id ?? ref._id;
}

export function refName(ref: string | EmployeeRef | null | undefined): string {
  return ref && typeof ref === 'object' ? ref.fullName : '';
}

export function refCode(ref: string | EmployeeRef | null | undefined): string {
  return ref && typeof ref === 'object' ? ref.code : '';
}
