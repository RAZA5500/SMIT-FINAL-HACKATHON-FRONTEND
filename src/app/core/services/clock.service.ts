import { Injectable, OnDestroy, signal } from '@angular/core';

/** A live, ticking clock signal shared by every widget that shows the time. */
@Injectable({ providedIn: 'root' })
export class ClockService implements OnDestroy {
  readonly now = signal(new Date());
  private readonly timer = setInterval(() => this.now.set(new Date()), 1000);

  ngOnDestroy(): void {
    clearInterval(this.timer);
  }
}
