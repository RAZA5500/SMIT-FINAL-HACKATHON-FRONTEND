import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { SetupService } from '../../core/services/setup.service';
import { Icons } from '../../shared/ui/icons';
import { AuthLayoutComponent } from './auth-layout.component';

/** Shown when GET /api/setup/status cannot reach the backend. */
@Component({
  selector: 'app-unavailable',
  imports: [LucideAngularModule, AuthLayoutComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-auth-layout>
      <div class="card p-7 text-center">
        <span class="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-rose-500/10 text-rose-500">
          <lucide-icon [img]="icons.ShieldAlert" [size]="30" />
        </span>
        <h1 class="mt-5 text-2xl font-extrabold text-slate-900 dark:text-white">Can't reach the server</h1>
        <p class="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          HCM Lite couldn't contact its API. Make sure the backend is running (<code class="kbd">npm run start:dev</code> in <code class="kbd">backend/</code>) and try again.
        </p>
        <button type="button" class="btn btn-primary mt-6 w-full" (click)="retry()" [disabled]="checking()">
          <lucide-icon [img]="checking() ? icons.LoaderCircle : icons.RefreshCw" [size]="17" [class.animate-spin]="checking()" />
          {{ checking() ? 'Checking…' : 'Try again' }}
        </button>
      </div>
    </app-auth-layout>
  `,
})
export class UnavailableComponent {
  private readonly setup = inject(SetupService);
  private readonly router = inject(Router);
  protected readonly icons = Icons;
  protected readonly checking = signal(false);

  protected retry(): void {
    this.checking.set(true);
    this.setup.refresh().subscribe((initialized) => {
      this.checking.set(false);
      if (initialized === null) return;
      void this.router.navigate([initialized ? '/login' : '/setup']);
    });
  }
}
