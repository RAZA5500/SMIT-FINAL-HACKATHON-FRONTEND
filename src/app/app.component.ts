import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, NgZone, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ApprovalsStore } from './core/services/approvals.store';
import { NotificationStore } from './core/services/notification.store';
import { PolicyStore } from './core/services/policy.store';
import { ThemeService } from './core/services/theme.service';
import { ConfirmHostComponent } from './shared/ui/confirm-host.component';
import { ToastContainerComponent } from './shared/ui/toast-container.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastContainerComponent, ConfirmHostComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <router-outlet />
    <app-toast-container />
    <app-confirm-host />
  `,
})
export class AppComponent {
  constructor() {
    // Eagerly start the session-scoped stores (theme, policies, notification & approval polling).
    inject(ThemeService);
    inject(PolicyStore);
    inject(NotificationStore);
    inject(ApprovalsStore);
    this.trackCardSpotlight();
  }

  /** Feeds the pointer position to the hovered `.card` (--mx/--my) for its radial spotlight; never enters the zone. */
  private trackCardSpotlight(): void {
    const doc = inject(DOCUMENT);
    if (!doc.defaultView?.matchMedia('(hover: hover)').matches) return;
    let current: HTMLElement | null = null;
    const onMove = (event: PointerEvent): void => {
      const card = (event.target as Element | null)?.closest?.<HTMLElement>('.card') ?? null;
      if (current && current !== card) {
        current.style.removeProperty('--mx');
        current.style.removeProperty('--my');
      }
      current = card;
      if (!card) return;
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${event.clientX - rect.left}px`);
      card.style.setProperty('--my', `${event.clientY - rect.top}px`);
    };
    inject(NgZone).runOutsideAngular(() => doc.addEventListener('pointermove', onMove, { passive: true }));
    inject(DestroyRef).onDestroy(() => doc.removeEventListener('pointermove', onMove));
  }
}
