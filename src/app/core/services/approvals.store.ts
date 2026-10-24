import { Injectable, OnDestroy, computed, effect, inject, signal, untracked } from '@angular/core';
import { Subscription, catchError, of } from 'rxjs';
import { AuthService } from './auth.service';
import { DashboardService } from './dashboard.service';

const POLL_MS = 60_000;

/** Pending leave + correction counts for the sidebar badges (Admin & HR). */
@Injectable({ providedIn: 'root' })
export class ApprovalsStore implements OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly dashboard = inject(DashboardService);
  private timer: ReturnType<typeof setInterval> | null = null;
  private request: Subscription | null = null;

  readonly pendingLeave = signal(0);
  readonly pendingCorrections = signal(0);
  readonly total = computed(() => this.pendingLeave() + this.pendingCorrections());

  constructor() {
    effect(() => {
      const active = this.auth.isLoggedIn() && this.auth.isManager() && !this.auth.mustChangePassword();
      untracked(() => (active ? this.start() : this.stop()));
    });
  }

  refresh(): void {
    this.request?.unsubscribe();
    this.request = this.dashboard
      .today(undefined, true)
      .pipe(catchError(() => of(null)))
      .subscribe((today) => {
        if (!today) return;
        this.pendingLeave.set(today.pendingApprovals.leave);
        this.pendingCorrections.set(today.pendingApprovals.corrections);
      });
  }

  private start(): void {
    this.stop();
    this.refresh();
    this.timer = setInterval(() => {
      if (document.visibilityState === 'visible') this.refresh();
    }, POLL_MS);
  }

  private stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.request?.unsubscribe();
    this.pendingLeave.set(0);
    this.pendingCorrections.set(0);
  }

  ngOnDestroy(): void {
    this.stop();
  }
}
