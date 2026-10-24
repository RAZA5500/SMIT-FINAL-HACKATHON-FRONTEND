import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { Observable, Subscription, catchError, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Holiday, Policies, WeekDay } from '../models/api.models';
import { addMinutesToHhmm, todayIn, weekdayOf } from '../utils/dates';
import { SILENT_ERRORS } from '../utils/http';
import { AuthService } from './auth.service';

/**
 * Company policies readable by every role (GET /settings/policies): timezone, currency,
 * office hours, weekend days, holidays, leave types and payroll rates. Loaded once per
 * session and refreshed whenever an Admin changes the organisation setup.
 */
@Injectable({ providedIn: 'root' })
export class PolicyStore {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private loading: Subscription | null = null;

  readonly policies = signal<Policies | null>(null);

  readonly companyName = computed(() => this.policies()?.companyName ?? 'HCM Lite');
  readonly currency = computed(() => this.policies()?.currency ?? 'PKR');
  readonly timezone = computed(() => this.policies()?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone);
  readonly attendance = computed(() => this.policies()?.attendance ?? null);
  readonly weekendDays = computed(() => new Set<WeekDay>(this.policies()?.attendance.weekendDays ?? []));
  readonly holidays = computed(() => this.policies()?.holidays ?? []);
  readonly holidayByDate = computed(() => new Map<string, Holiday>(this.holidays().map((h) => [h.date, h])));
  readonly leaveTypes = computed(() => this.policies()?.leaveTypes ?? []);
  readonly officeStart = computed(() => this.attendance()?.officeStartTime ?? '09:00');
  readonly graceEnd = computed(() => addMinutesToHhmm(this.officeStart(), this.attendance()?.graceMinutes ?? 0));

  constructor() {
    // Load for every signed-in user that has finished the temporary-password step.
    effect(() => {
      const ready = this.auth.isLoggedIn() && !this.auth.mustChangePassword();
      untracked(() => (ready ? this.refresh() : this.reset()));
    });
  }

  /** Today in the company timezone (re-evaluated on every call). */
  today(): string {
    return todayIn(this.timezone());
  }

  isWeekend(iso: string): boolean {
    return this.weekendDays().has(weekdayOf(iso));
  }

  holidayOn(iso: string): Holiday | undefined {
    return this.holidayByDate().get(iso);
  }

  isWorkingDay(iso: string): boolean {
    return !this.isWeekend(iso) && !this.holidayOn(iso);
  }

  load(): Observable<Policies | null> {
    return this.http
      .get<Policies>(`${environment.apiUrl}/settings/policies`, { context: new HttpContext().set(SILENT_ERRORS, true) })
      .pipe(
        tap((policies) => this.policies.set(policies)),
        catchError(() => of(null)),
      );
  }

  /** Re-fetch after Admin edits settings, holidays or leave types. */
  refresh(): void {
    this.loading?.unsubscribe();
    this.loading = this.load().subscribe();
  }

  reset(): void {
    this.loading?.unsubscribe();
    this.policies.set(null);
  }
}
