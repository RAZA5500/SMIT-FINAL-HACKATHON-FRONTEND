import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AttendanceBoard,
  AttendanceCorrection,
  AttendanceRecord,
  AttendanceStatus,
  CorrectionPayload,
  MyAttendanceResponse,
  Paginated,
  PunchPayload,
  RequestStatus,
  TodayAttendance,
} from '../models/api.models';
import { toParams } from '../utils/http';

const API = environment.apiUrl;

/** M4 — server-stamped check-in/out, calendars, daily board and corrections. */
@Injectable({ providedIn: 'root' })
export class AttendanceService {
  private readonly http = inject(HttpClient);

  checkIn(payload: PunchPayload = { source: 'manual' }): Observable<AttendanceRecord> {
    return this.http.post<AttendanceRecord>(`${API}/attendance/check-in`, payload);
  }

  checkOut(payload: PunchPayload = { source: 'manual' }): Observable<AttendanceRecord> {
    return this.http.post<AttendanceRecord>(`${API}/attendance/check-out`, payload);
  }

  today(): Observable<TodayAttendance> {
    return this.http.get<TodayAttendance>(`${API}/attendance/today`);
  }

  mine(from?: string, to?: string): Observable<MyAttendanceResponse> {
    return this.http.get<MyAttendanceResponse>(`${API}/attendance/me`, { params: toParams({ from, to, limit: 366 }) });
  }

  list(query: {
    from?: string;
    to?: string;
    employeeId?: string;
    departmentId?: string;
    status?: AttendanceStatus;
    page?: number;
    limit?: number;
  }): Observable<Paginated<AttendanceRecord>> {
    return this.http.get<Paginated<AttendanceRecord>>(`${API}/attendance`, { params: toParams(query) });
  }

  board(query: { date?: string; departmentId?: string } = {}): Observable<AttendanceBoard> {
    return this.http.get<AttendanceBoard>(`${API}/attendance/board`, { params: toParams(query) });
  }

  closeDays(upTo?: string): Observable<unknown> {
    return this.http.post(`${API}/attendance/close-days`, upTo ? { upTo } : {});
  }

  requestCorrection(payload: CorrectionPayload): Observable<AttendanceCorrection> {
    return this.http.post<AttendanceCorrection>(`${API}/attendance/corrections`, payload);
  }

  corrections(query: { status?: RequestStatus | ''; employeeId?: string; page?: number; limit?: number } = {}): Observable<Paginated<AttendanceCorrection>> {
    return this.http.get<Paginated<AttendanceCorrection>>(`${API}/attendance/corrections`, { params: toParams(query) });
  }

  approveCorrection(id: string, comment?: string): Observable<{ correction: AttendanceCorrection; attendance: AttendanceRecord }> {
    return this.http.patch<{ correction: AttendanceCorrection; attendance: AttendanceRecord }>(
      `${API}/attendance/corrections/${id}/approve`,
      comment ? { comment } : {},
    );
  }

  rejectCorrection(id: string, comment: string): Observable<AttendanceCorrection> {
    return this.http.patch<AttendanceCorrection>(`${API}/attendance/corrections/${id}/reject`, { comment });
  }
}
