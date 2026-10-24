import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AbsenceAnomalies,
  AttritionRisk,
  DashboardFilters,
  DashboardSummary,
  PersonalDashboard,
  TodayKpis,
} from '../models/api.models';
import { SILENT_ERRORS, toParams } from '../utils/http';

const API = environment.apiUrl;

/** M7 — role dashboards. Every KPI is computed server-side from the live database. */
@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);

  summary(filters: DashboardFilters = {}): Observable<DashboardSummary> {
    return this.http.get<DashboardSummary>(`${API}/dashboard/summary`, { params: toParams(filters) });
  }

  personal(): Observable<PersonalDashboard> {
    return this.http.get<PersonalDashboard>(`${API}/dashboard/me`);
  }

  today(departmentId?: string, silent = false): Observable<TodayKpis> {
    return this.http.get<TodayKpis>(`${API}/dashboard/today`, {
      params: toParams({ departmentId }),
      context: new HttpContext().set(SILENT_ERRORS, silent),
    });
  }

  attritionRisk(query: DashboardFilters & { limit?: number }): Observable<AttritionRisk> {
    return this.http.get<AttritionRisk>(`${API}/dashboard/attrition-risk`, { params: toParams(query) });
  }

  absenceAnomalies(query: DashboardFilters & { limit?: number }): Observable<AbsenceAnomalies> {
    return this.http.get<AbsenceAnomalies>(`${API}/dashboard/absence-anomalies`, { params: toParams(query) });
  }
}
