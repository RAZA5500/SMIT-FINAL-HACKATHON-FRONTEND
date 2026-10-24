import { Injectable, OnDestroy, effect, inject, signal, untracked } from '@angular/core';
import { Subscription, catchError, of } from 'rxjs';
import { AuthService } from './auth.service';
import { CommsService } from './comms.service';

const POLL_MS = 30_000;

/** Unread notification badge, polled quietly while a user is signed in. */
@Injectable({ providedIn: 'root' })
export class NotificationStore implements OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly comms = inject(CommsService);
  private timer: ReturnType<typeof setInterval> | null = null;
  private request: Subscription | null = null;

  readonly unread = signal(0);
  /** Bumped when the count grows, so the bell can wiggle. */
  readonly pulse = signal(0);

  constructor() {
    effect(() => {
      const active = this.auth.isLoggedIn() && !this.auth.mustChangePassword();
      untracked(() => (active ? this.start() : this.stop()));
    });
  }

  refresh(): void {
    this.request?.unsubscribe();
    this.request = this.comms
      .unreadCount()
      .pipe(catchError(() => of(null)))
      .subscribe((res) => {
        if (!res) return;
        if (res.unread > this.unread()) this.pulse.update((n) => n + 1);
        this.unread.set(res.unread);
      });
  }

  decrement(): void {
    this.unread.update((n) => Math.max(0, n - 1));
  }

  clear(): void {
    this.unread.set(0);
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
    this.unread.set(0);
  }

  ngOnDestroy(): void {
    this.stop();
  }
}
