import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
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
  }
}
