import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import { InitSetupPayload, InitSetupResponse, SetupStatus } from '../models/api.models';
import { SILENT_ERRORS } from '../utils/http';
import { AuthService } from './auth.service';

const API = environment.apiUrl;

/** First-run state. `initialized === null` means the server could not be reached. */
@Injectable({ providedIn: 'root' })
export class SetupService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  readonly initialized = signal<boolean | null>(null);

  /** GET /setup/status — resolves to null when the backend is unreachable. */
  refresh(): Observable<boolean | null> {
    return this.http
      .get<SetupStatus>(`${API}/setup/status`, { context: new HttpContext().set(SILENT_ERRORS, true) })
      .pipe(
        timeout(10_000),
        map((status) => status.initialized),
        catchError(() => of(null)),
        tap((value) => this.initialized.set(value)),
      );
  }

  /** POST /setup/init — creates company settings + the master Admin and signs them in. */
  initialize(payload: InitSetupPayload): Observable<InitSetupResponse> {
    return this.http.post<InitSetupResponse>(`${API}/setup/init`, payload).pipe(
      tap((res) => {
        this.initialized.set(true);
        this.auth.applySession(res);
      }),
    );
  }
}
