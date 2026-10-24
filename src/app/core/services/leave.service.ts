import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LeaveBalanceResponse, LeavePayload, LeaveRequest, LeaveStatus, Paginated, WorkingDaysResponse } from '../models/api.models';
import { toParams } from '../utils/http';

const API = environment.apiUrl;

/** M5 — leave requests, approvals, balances and the working-day calculator. */
@Injectable({ providedIn: 'root' })
export class LeaveService {
  private readonly http = inject(HttpClient);

  apply(payload: LeavePayload): Observable<LeaveRequest> {
    return this.http.post<LeaveRequest>(`${API}/leave/requests`, payload);
  }

  list(query: {
    status?: LeaveStatus | '';
    employeeId?: string;
    leaveTypeId?: string;
    departmentId?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  } = {}): Observable<Paginated<LeaveRequest>> {
    return this.http.get<Paginated<LeaveRequest>>(`${API}/leave/requests`, { params: toParams(query) });
  }

  approve(id: string, comment?: string): Observable<LeaveRequest> {
    return this.http.patch<LeaveRequest>(`${API}/leave/requests/${id}/approve`, comment ? { comment } : {});
  }

  reject(id: string, comment: string): Observable<LeaveRequest> {
    return this.http.patch<LeaveRequest>(`${API}/leave/requests/${id}/reject`, { comment });
  }

  cancel(id: string): Observable<LeaveRequest> {
    return this.http.patch<LeaveRequest>(`${API}/leave/requests/${id}/cancel`, {});
  }

  balance(query: { year?: number; employeeId?: string } = {}): Observable<LeaveBalanceResponse> {
    return this.http.get<LeaveBalanceResponse>(`${API}/leave/balance`, { params: toParams(query) });
  }

  workingDays(startDate: string, endDate: string): Observable<WorkingDaysResponse> {
    return this.http.get<WorkingDaysResponse>(`${API}/leave/working-days`, { params: toParams({ startDate, endDate }) });
  }
}
