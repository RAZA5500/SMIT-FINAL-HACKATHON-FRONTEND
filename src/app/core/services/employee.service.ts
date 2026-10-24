import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CreateEmployeeResponse,
  Employee,
  Employee360,
  EmployeePayload,
  EmployeeQuery,
  ImportResult,
  Paginated,
} from '../models/api.models';
import { toParams } from '../utils/http';

const API = environment.apiUrl;

/** M3 — employee directory, registration, 360 profiles and CSV import/export. */
@Injectable({ providedIn: 'root' })
export class EmployeeService {
  private readonly http = inject(HttpClient);

  list(query: EmployeeQuery = {}): Observable<Paginated<Employee>> {
    return this.http.get<Paginated<Employee>>(`${API}/employees`, { params: toParams(query) });
  }

  profile(id: string): Observable<Employee360> {
    return this.http.get<Employee360>(`${API}/employees/${id}`);
  }

  myProfile(): Observable<Employee360> {
    return this.http.get<Employee360>(`${API}/employees/me`);
  }

  /** Employees may change only their own phone and address. */
  updateMyContact(payload: { phone?: string; address?: string }): Observable<Employee> {
    return this.http.patch<Employee>(`${API}/employees/me`, payload);
  }

  create(payload: EmployeePayload): Observable<CreateEmployeeResponse> {
    return this.http.post<CreateEmployeeResponse>(`${API}/employees`, payload);
  }

  update(id: string, payload: Partial<EmployeePayload>): Observable<Employee> {
    return this.http.patch<Employee>(`${API}/employees/${id}`, payload);
  }

  /** CSV import — `dryRun=true` validates only; `false` inserts only when every row is valid. */
  importCsv(file: File, dryRun: boolean): Observable<ImportResult> {
    const form = new FormData();
    form.append('file', file, file.name);
    return this.http.post<ImportResult>(`${API}/employees/import`, form, { params: toParams({ dryRun }) });
  }

  exportCsv(query: Omit<EmployeeQuery, 'page' | 'limit'> = {}): Observable<HttpResponse<Blob>> {
    return this.http.get(`${API}/employees/export`, { params: toParams(query), observe: 'response', responseType: 'blob' });
  }

  importTemplate(): Observable<HttpResponse<Blob>> {
    return this.http.get(`${API}/employees/import/template`, { observe: 'response', responseType: 'blob' });
  }
}
