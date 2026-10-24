import { A11yModule } from '@angular/cdk/a11y';
import { ChangeDetectionStrategy, Component, HostListener, computed, inject } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { ConfirmService } from '../../core/services/confirm.service';
import { fade, modalPop } from '../animations';
import { Icons } from './icons';

/** Renders ConfirmService requests (mounted once in the root component). */
@Component({
  selector: 'app-confirm-host',
  imports: [LucideAngularModule, A11yModule],
  animations: [fade, modalPop],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (confirm.pending(); as req) {
      <div class="fixed inset-0 z-[80] grid place-items-center p-4">
        <div @fade class="absolute inset-0 bg-slate-950/55 backdrop-blur-sm" (click)="confirm.settle(false)"></div>
        <div
          @modalPop
          cdkTrapFocus
          [cdkTrapFocusAutoCapture]="true"
          role="alertdialog"
          aria-modal="true"
          [attr.aria-label]="req.title"
          class="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
        >
          <div class="flex gap-4">
            <span class="grid h-12 w-12 shrink-0 place-items-center rounded-2xl" [class]="iconChip()">
              <lucide-icon [img]="icon()" [size]="22" [strokeWidth]="2.2" />
            </span>
            <div class="min-w-0">
              <h2 class="text-lg font-bold text-slate-900 dark:text-white">{{ req.title }}</h2>
              <p class="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{{ req.message }}</p>
            </div>
          </div>
          <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" class="btn btn-secondary" (click)="confirm.settle(false)">{{ req.cancelText || 'Cancel' }}</button>
            <button type="button" class="btn" [class]="confirmClass()" (click)="confirm.settle(true)" cdkFocusInitial>
              {{ req.confirmText || 'Confirm' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ConfirmHostComponent {
  protected readonly confirm = inject(ConfirmService);

  protected readonly icon = computed(() => {
    switch (this.confirm.pending()?.icon) {
      case 'lock':
        return Icons.LockKeyhole;
      case 'trash':
        return Icons.Trash2;
      case 'logout':
        return Icons.LogOut;
      case 'info':
        return Icons.Info;
      default:
        return Icons.TriangleAlert;
    }
  });

  protected readonly iconChip = computed(() => {
    switch (this.confirm.pending()?.tone) {
      case 'danger':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400';
      case 'navy':
        return 'bg-slate-900/10 text-slate-800 dark:bg-white/10 dark:text-slate-100';
      case 'warning':
        return 'bg-amber-500/15 text-amber-600 dark:text-amber-400';
      default:
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
    }
  });

  protected readonly confirmClass = computed(() => {
    switch (this.confirm.pending()?.tone) {
      case 'danger':
        return 'btn-danger';
      case 'navy':
        return 'btn-navy';
      case 'warning':
        return 'btn-amber';
      default:
        return 'btn-primary';
    }
  });

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.confirm.pending()) this.confirm.settle(false);
  }
}
