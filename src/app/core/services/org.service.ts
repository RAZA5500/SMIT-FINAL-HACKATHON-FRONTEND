import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CompanySettings,
  Department,
  Designation,
  Holiday,
  LeaveType,
  Policies,
  UpdateSettingsPayload,
} from '../models/api.models';
import { toParams } from '../utils/http';

const API = environment.apiUrl;

export interface DepartmentPayload {
  name: string;
  code?: string;
  description?: string;
  isActive?: boolean;
}

export interface DesignationPayload {
  name: string;
  description?: string;
  isActive?: boolean;
}

export interface LeaveTypePayload {
  name: string;
  annualQuota: number | null;
  isPaid?: boolean;
  description?: string;
  isActive?: boolean;
}

export interface HolidayPayload {
  name: string;
  date: string;
  description?: string;
}

/** M2 — company settings, departments, designations, leave types and public holidays. */
@Injectable({ providedIn: 'root' })
export class OrgService {
  private readonly http = inject(HttpClient);

  getSettings(): Observable<CompanySettings> {
    return this.http.get<CompanySettings>(`${API}/settings`);
  }

  updateSettings(payload: UpdateSettingsPayload): Observable<CompanySettings> {
    return this.http.patch<CompanySettings>(`${API}/settings`, payload);
  }

  getPolicies(): Observable<Policies> {
    return this.http.get<Policies>(`${API}/settings/policies`);
  }

  // Departments
  departments(includeInactive = false): Observable<Department[]> {
    return this.http.get<Department[]>(`${API}/departments`, { params: toParams({ includeInactive: includeInactive || undefined }) });
  }

  createDepartment(payload: DepartmentPayload): Observable<Department> {
    return this.http.post<Department>(`${API}/departments`, payload);
  }

  updateDepartment(id: string, payload: Partial<DepartmentPayload>): Observable<Department> {
    return this.http.patch<Department>(`${API}/departments/${id}`, payload);
  }

  deleteDepartment(id: string): Observable<{ deleted: true }> {
    return this.http.delete<{ deleted: true }>(`${API}/departments/${id}`);
  }

  // Designations
  designations(includeInactive = false): Observable<Designation[]> {
    return this.http.get<Designation[]>(`${API}/designations`, { params: toParams({ includeInactive: includeInactive || undefined }) });
  }

  createDesignation(payload: DesignationPayload): Observable<Designation> {
    return this.http.post<Designation>(`${API}/designations`, payload);
  }

  updateDesignation(id: string, payload: Partial<DesignationPayload>): Observable<Designation> {
    return this.http.patch<Designation>(`${API}/designations/${id}`, payload);
  }

  deleteDesignation(id: string): Observable<{ deleted: true }> {
    return this.http.delete<{ deleted: true }>(`${API}/designations/${id}`);
  }

  // Leave types & quotas
  leaveTypes(includeInactive = false): Observable<LeaveType[]> {
    return this.http.get<LeaveType[]>(`${API}/leave-types`, { params: toParams({ includeInactive: includeInactive || undefined }) });
  }

  createLeaveType(payload: LeaveTypePayload): Observable<LeaveType> {
    return this.http.post<LeaveType>(`${API}/leave-types`, payload);
  }

  updateLeaveType(id: string, payload: Partial<LeaveTypePayload>): Observable<LeaveType> {
    return this.http.patch<LeaveType>(`${API}/leave-types/${id}`, payload);
  }

  deleteLeaveType(id: string): Observable<{ deleted: true }> {
    return this.http.delete<{ deleted: true }>(`${API}/leave-types/${id}`);
  }

  // Public holidays
  holidays(query: { year?: number; from?: string; to?: string } = {}): Observable<Holiday[]> {
    return this.http.get<Holiday[]>(`${API}/holidays`, { params: toParams(query) });
  }

  createHoliday(payload: HolidayPayload): Observable<Holiday> {
    return this.http.post<Holiday>(`${API}/holidays`, payload);
  }

  updateHoliday(id: string, payload: Partial<HolidayPayload>): Observable<Holiday> {
    return this.http.patch<Holiday>(`${API}/holidays/${id}`, payload);
  }

  deleteHoliday(id: string): Observable<{ deleted: true }> {
    return this.http.delete<{ deleted: true }>(`${API}/holidays/${id}`);
  }
}
