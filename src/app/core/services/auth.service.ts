import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, finalize, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, ChangePasswordResponse, MeResponse, Role, UserProfile } from '../models/api.models';
import { SILENT_ERRORS } from '../utils/http';
import { safeStorage } from '../utils/storage';

const TOKEN_KEY = 'hcm-token';
const USER_KEY = 'hcm-user';
const API = environment.apiUrl;

/** Session store: JWT + current user as signals, persisted across reloads. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  readonly token = signal<string | null>(safeStorage.get(TOKEN_KEY));
  readonly user = signal<UserProfile | null>(safeStorage.getJson<UserProfile>(USER_KEY));
  readonly employee = signal<MeResponse['employee']>(null);

  readonly isLoggedIn = computed(() => !!this.token() && !!this.user());
  readonly role = computed<Role | null>(() => this.user()?.role ?? null);
  readonly isAdmin = computed(() => this.role() === 'Admin');
  readonly isHr = computed(() => this.role() === 'HR');
  readonly isEmployee = computed(() => this.role() === 'Employee');
  readonly isManager = computed(() => this.isAdmin() || this.isHr());
  readonly employeeId = computed(() => this.user()?.employeeId ?? null);
  /** Can use self-service (check-in, leave, payslips): Employees and HR logins linked to a profile. */
  readonly hasEmployeeProfile = computed(() => !!this.employeeId());
  readonly mustChangePassword = computed(() => this.user()?.mustChangePassword === true);
  readonly firstName = computed(() => this.user()?.fullName.split(' ')[0] ?? '');

  hasRole(...roles: Role[]): boolean {
    const role = this.role();
    return !!role && roles.includes(role);
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${API}/auth/login`, { email, password }).pipe(tap((res) => this.applySession(res)));
  }

  /** Refreshes the user from GET /auth/me (also restores the linked employee summary). */
  me(): Observable<MeResponse> {
    return this.http.get<MeResponse>(`${API}/auth/me`).pipe(
      tap((me) => {
        const { employee, ...profile } = me;
        this.setUser(profile);
        this.employee.set(employee);
      }),
    );
  }

  changePassword(currentPassword: string, newPassword: string): Observable<ChangePasswordResponse> {
    return this.http
      .post<ChangePasswordResponse>(`${API}/auth/change-password`, { currentPassword, newPassword })
      .pipe(tap((res) => this.applySession(res)));
  }

  /** Server-side logout revokes every issued token, then the local session is cleared. */
  logout(redirect = true): void {
    const hadToken = !!this.token();
    const done = () => {
      this.clear();
      if (redirect) void this.router.navigate(['/login']);
    };
    if (!hadToken) return done();
    this.http
      .post(`${API}/auth/logout`, {}, { context: new HttpContext().set(SILENT_ERRORS, true) })
      .pipe(
        catchError(() => of(null)),
        finalize(done),
      )
      .subscribe();
  }

  applySession(res: AuthResponse): void {
    this.token.set(res.accessToken);
    safeStorage.set(TOKEN_KEY, res.accessToken);
    this.setUser(res.user);
  }

  /** Clears the session locally (no request). */
  clear(): void {
    this.token.set(null);
    this.user.set(null);
    this.employee.set(null);
    safeStorage.remove(TOKEN_KEY);
    safeStorage.remove(USER_KEY);
  }

  private setUser(user: UserProfile): void {
    this.user.set(user);
    safeStorage.setJson(USER_KEY, user);
  }
}
