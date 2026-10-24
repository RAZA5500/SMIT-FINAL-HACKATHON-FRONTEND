import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuditLog, AuditQuery, Paginated } from '../models/api.models';
import { SILENT_ERRORS, toParams } from '../utils/http';

const API = environment.apiUrl;

/** M9 — immutable audit trail (Admin only; there is deliberately no write API). */
@Injectable({ providedIn: 'root' })
export class AuditService {
  private readonly http = inject(HttpClient);

  list(query: AuditQuery = {}, silent = false): Observable<Paginated<AuditLog>> {
    return this.http.get<Paginated<AuditLog>>(`${API}/audit-logs`, {
      params: toParams(query),
      context: new HttpContext().set(SILENT_ERRORS, silent),
    });
  }

  get(id: string): Observable<AuditLog> {
    return this.http.get<AuditLog>(`${API}/audit-logs/${id}`);
  }
}
