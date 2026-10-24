import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CreateHrUserPayload, CreateHrUserResponse, Paginated, ResetPasswordResponse, Role, UserAccount } from '../models/api.models';
import { toParams } from '../utils/http';

const API = environment.apiUrl;

/** Admin login management (M1): HR logins, activation, password resets, role changes. */
@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly http = inject(HttpClient);

  list(query: { role?: Role | ''; isActive?: boolean; q?: string; page?: number; limit?: number } = {}): Observable<Paginated<UserAccount>> {
    return this.http.get<Paginated<UserAccount>>(`${API}/users`, { params: toParams(query) });
  }

  createHr(payload: CreateHrUserPayload): Observable<CreateHrUserResponse> {
    return this.http.post<CreateHrUserResponse>(`${API}/users/hr`, payload);
  }

  activate(id: string): Observable<UserAccount> {
    return this.http.patch<UserAccount>(`${API}/users/${id}/activate`, {});
  }

  deactivate(id: string): Observable<UserAccount> {
    return this.http.patch<UserAccount>(`${API}/users/${id}/deactivate`, {});
  }

  resetPassword(id: string, newPassword?: string): Observable<ResetPasswordResponse> {
    return this.http.post<ResetPasswordResponse>(`${API}/users/${id}/reset-password`, newPassword ? { newPassword } : {});
  }

  updateRole(id: string, role: 'HR' | 'Employee'): Observable<UserAccount> {
    return this.http.patch<UserAccount>(`${API}/users/${id}/role`, { role });
  }
}
