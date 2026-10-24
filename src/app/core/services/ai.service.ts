import { HttpClient, HttpContext, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, TimeoutError, catchError, of, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AiChatResponse,
  AiChatTurn,
  AiDashboardSummaryResponse,
  DashboardFilters,
  SmartLeaveResponse,
} from '../models/api.models';
import { SILENT_ERRORS, apiErrorMessage } from '../utils/http';

const API = environment.apiUrl;

/** The server aborts model calls after 15 s; the client allows a little transport slack. */
export const AI_CLIENT_TIMEOUT_MS = 17_000;

export const AI_FALLBACKS = {
  timeout:
    'Sorry — the assistant took longer than 15 seconds to answer. Please try again in a moment or use the dashboards. ' +
    '(Maazrat, jawab mein zyada waqt lag gaya — thori dair baad dobara koshish karein.)',
  rateLimited:
    'You have reached the limit of 20 AI requests per hour. Please try again a little later. ' +
    '(Aap ne is ghante ki 20 AI requests poori kar li hain — thori dair baad koshish karein.)',
  offline: 'The assistant could not reach the server. Please check your connection and try again.',
};

/** M8 — HR assistant chat, dashboard summary and smart leave (all routed through the API; no keys in the browser). */
@Injectable({ providedIn: 'root' })
export class AiService {
  private readonly http = inject(HttpClient);
  private readonly silent = () => ({ context: new HttpContext().set(SILENT_ERRORS, true) });

  chat(message: string, history: AiChatTurn[]): Observable<AiChatResponse> {
    return this.http.post<AiChatResponse>(`${API}/ai/chat`, { message, history: history.slice(-10) }, this.silent()).pipe(
      timeout(AI_CLIENT_TIMEOUT_MS),
      catchError((error: unknown) =>
        of<AiChatResponse>({
          aiGenerated: true,
          feature: 'chat',
          status: error instanceof TimeoutError ? 'timeout' : 'error',
          fallback: true,
          reply: this.fallbackText(error),
          toolsCalled: [],
          model: null,
        }),
      ),
    );
  }

  dashboardSummary(filters: DashboardFilters): Observable<AiDashboardSummaryResponse> {
    return this.http.post<AiDashboardSummaryResponse>(`${API}/ai/dashboard-summary`, filters, this.silent()).pipe(
      timeout(AI_CLIENT_TIMEOUT_MS),
      catchError((error: unknown) =>
        of<AiDashboardSummaryResponse>({
          aiGenerated: true,
          feature: 'dashboard-summary',
          status: error instanceof TimeoutError ? 'timeout' : 'error',
          fallback: true,
          bullets: [],
          message: this.fallbackText(error),
        }),
      ),
    );
  }

  smartLeave(text: string): Observable<SmartLeaveResponse> {
    return this.http.post<SmartLeaveResponse>(`${API}/ai/smart-leave`, { text }, this.silent()).pipe(
      timeout(AI_CLIENT_TIMEOUT_MS),
      catchError((error: unknown) =>
        of<SmartLeaveResponse>({
          aiGenerated: true,
          feature: 'smart-leave',
          status: error instanceof TimeoutError ? 'timeout' : 'error',
          fallbackToManualForm: true,
          draft: null,
          message: this.fallbackText(error),
        }),
      ),
    );
  }

  private fallbackText(error: unknown): string {
    if (error instanceof TimeoutError) return AI_FALLBACKS.timeout;
    if (error instanceof HttpErrorResponse) {
      if (error.status === 429) return AI_FALLBACKS.rateLimited;
      if (error.status === 0) return AI_FALLBACKS.offline;
      return apiErrorMessage(error, 'The assistant is unavailable right now.');
    }
    return 'The assistant is unavailable right now.';
  }
}
