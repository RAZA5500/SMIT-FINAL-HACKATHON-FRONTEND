import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { Observable, Subscription, finalize, tap } from 'rxjs';
import { AttendanceRecord, CorrectionPayload, PunchPayload, TodayAttendance } from '../models/api.models';
import { celebrate } from '../utils/celebrate';
import { apiErrorMessage, apiStatus } from '../utils/http';
import { AttendanceService } from './attendance.service';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';

export type PunchKind = 'in' | 'out';

/**
 * Self-service attendance state shared by the dashboard quick widget, the attendance
 * hero, the camera check-in modal and the correction request modal.
 */
@Injectable({ providedIn: 'root' })
export class CheckInStore {
  private readonly api = inject(AttendanceService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private request: Subscription | null = null;

  readonly today = signal<TodayAttendance | null>(null);
  readonly loading = signal(false);
  readonly busy = signal<PunchKind | null>(null);
  /** Opens the camera + GPS modal for a check-in or check-out. */
  readonly cameraMode = signal<PunchKind | null>(null);
  /** Opens the correction request modal (pre-filled when set from a failure). */
  readonly correctionDraft = signal<Partial<CorrectionPayload> | null>(null);
  /** Bumped after every successful punch or correction so calendars refresh. */
  readonly version = signal(0);

  readonly record = computed(() => this.today()?.record ?? null);
  readonly canCheckIn = computed(() => this.today()?.canCheckIn ?? false);
  readonly canCheckOut = computed(() => this.today()?.canCheckOut ?? false);
  readonly finishedForDay = computed(() => !!this.record()?.checkOutAt);

  constructor() {
    effect(() => {
      this.auth.user();
      untracked(() => {
        this.request?.unsubscribe();
        this.today.set(null);
      });
    });
  }

  load(): void {
    if (!this.auth.hasEmployeeProfile()) return;
    this.request?.unsubscribe();
    this.loading.set(true);
    this.request = this.api
      .today()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({ next: (today) => this.today.set(today), error: () => undefined });
  }

  /** Raw punch for callers that render their own error states (the camera modal). */
  punch(kind: PunchKind, payload: PunchPayload): Observable<AttendanceRecord> {
    this.busy.set(kind);
    const call = kind === 'in' ? this.api.checkIn(payload) : this.api.checkOut(payload);
    return call.pipe(
      tap((record) => this.onPunched(kind, record)),
      finalize(() => this.busy.set(null)),
    );
  }

  /** One-click web check-in / check-out with toast feedback (409 switches the widget to check-out). */
  quickPunch(kind: PunchKind): void {
    this.punch(kind, { source: 'manual' }).subscribe({
      error: (error) => {
        if (apiStatus(error) === 409) {
          this.toast.warning(kind === 'in' ? 'Already checked in today' : 'Already checked out', apiErrorMessage(error));
          this.load();
          return;
        }
        this.toast.error(kind === 'in' ? 'Check-in failed' : 'Check-out failed', apiErrorMessage(error));
      },
    });
  }

  openCamera(kind: PunchKind): void {
    this.cameraMode.set(kind);
  }

  closeCamera(): void {
    this.cameraMode.set(null);
  }

  openCorrection(draft: Partial<CorrectionPayload> = {}): void {
    this.correctionDraft.set(draft);
  }

  closeCorrection(): void {
    this.correctionDraft.set(null);
  }

  markChanged(): void {
    this.version.update((v) => v + 1);
  }

  private onPunched(kind: PunchKind, record: AttendanceRecord): void {
    this.today.update((today) =>
      today ? { ...today, record, canCheckIn: false, canCheckOut: kind === 'in' && !record.checkOutAt } : today,
    );
    this.markChanged();
    if (kind === 'in') {
      const late = record.status === 'late';
      this.toast.success(
        late ? 'Checked in — marked late' : 'Checked in — have a great day!',
        late ? `${record.lateMinutes} min after office start time.` : 'You are on time.',
      );
      if (!late) void celebrate();
    } else {
      const half = record.status === 'half_day';
      this.toast.success('Checked out', half ? 'Less than the half-day threshold was worked today.' : 'See you tomorrow!');
    }
    this.load();
  }
}
