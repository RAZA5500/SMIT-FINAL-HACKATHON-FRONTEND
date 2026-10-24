import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Paginated, PayrollRun, PayrollRunDetail, PayrollStatus, Payslip } from '../models/api.models';
import { toParams } from '../utils/http';

const API = environment.apiUrl;

/** M6 — draft → finalize payroll runs, payslips and PDF downloads. */
@Injectable({ providedIn: 'root' })
export class PayrollService {
  private readonly http = inject(HttpClient);

  createRun(month: string, notes?: string): Observable<PayrollRunDetail> {
    return this.http.post<PayrollRunDetail>(`${API}/payroll/runs`, notes ? { month, notes } : { month });
  }

  runs(query: { year?: string; status?: PayrollStatus; page?: number; limit?: number } = {}): Observable<Paginated<PayrollRun>> {
    return this.http.get<Paginated<PayrollRun>>(`${API}/payroll/runs`, { params: toParams(query) });
  }

  run(id: string): Observable<PayrollRunDetail> {
    return this.http.get<PayrollRunDetail>(`${API}/payroll/runs/${id}`);
  }

  updateNotes(id: string, notes: string): Observable<PayrollRun> {
    return this.http.patch<PayrollRun>(`${API}/payroll/runs/${id}`, { notes });
  }

  recalculate(id: string): Observable<PayrollRunDetail> {
    return this.http.post<PayrollRunDetail>(`${API}/payroll/runs/${id}/recalculate`, {});
  }

  deleteRun(id: string): Observable<{ deleted: true }> {
    return this.http.delete<{ deleted: true }>(`${API}/payroll/runs/${id}`);
  }

  finalize(id: string): Observable<PayrollRun> {
    return this.http.post<PayrollRun>(`${API}/payroll/runs/${id}/finalize`, {});
  }

  payslips(query: { month?: string; payrollRunId?: string; employeeId?: string; departmentId?: string; page?: number; limit?: number } = {}): Observable<Paginated<Payslip>> {
    return this.http.get<Paginated<Payslip>>(`${API}/payroll/payslips`, { params: toParams(query) });
  }

  myPayslips(query: { month?: string; page?: number; limit?: number } = {}): Observable<Paginated<Payslip>> {
    return this.http.get<Paginated<Payslip>>(`${API}/payroll/payslips/me`, { params: toParams(query) });
  }

  payslip(id: string): Observable<Payslip> {
    return this.http.get<Payslip>(`${API}/payroll/payslips/${id}`);
  }

  payslipPdf(id: string): Observable<HttpResponse<Blob>> {
    return this.http.get(`${API}/payroll/payslips/${id}/pdf`, { observe: 'response', responseType: 'blob' });
  }
}
