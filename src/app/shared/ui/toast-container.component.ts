import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LucideAngularModule, LucideIconData } from 'lucide-angular';
import { ToastService, ToastTone } from '../../core/services/toast.service';
import { toastAnim } from '../animations';
import { Icons } from './icons';

const TONES: Record<ToastTone, { icon: LucideIconData; chip: string; bar: string }> = {
  success: { icon: Icons.CircleCheck, chip: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400', bar: 'bg-emerald-500' },
  error: { icon: Icons.CircleX, chip: 'bg-rose-500/15 text-rose-600 dark:text-rose-400', bar: 'bg-rose-500' },
  warning: { icon: Icons.TriangleAlert, chip: 'bg-amber-500/15 text-amber-600 dark:text-amber-400', bar: 'bg-amber-500' },
  info: { icon: Icons.Info, chip: 'bg-blue-500/15 text-blue-600 dark:text-blue-400', bar: 'bg-blue-500' },
  ai: { icon: Icons.Sparkles, chip: 'bg-violet-500/15 text-violet-600 dark:text-violet-400', bar: 'bg-violet-500' },
};

@Component({
  selector: 'app-toast-container',
  imports: [LucideAngularModule],
  animations: [toastAnim],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pointer-events-none fixed inset-x-0 top-3 z-[90] flex flex-col items-center gap-2.5 px-4 sm:inset-x-auto sm:right-4 sm:top-4 sm:items-end" aria-live="polite">
      @for (t of toast.toasts(); track t.id) {
        <div
          @toastAnim
          class="pointer-events-auto relative flex w-full max-w-sm items-start gap-3 overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 p-3.5 pr-10 shadow-xl shadow-slate-900/10 backdrop-blur-md dark:border-slate-700/70 dark:bg-slate-900/95"
          role="status"
        >
          <span class="grid h-9 w-9 shrink-0 place-items-center rounded-xl" [class]="tones[t.tone].chip">
            <lucide-icon [img]="tones[t.tone].icon" [size]="18" [strokeWidth]="2.3" />
          </span>
          <div class="min-w-0 pt-0.5">
            <p class="text-sm font-semibold text-slate-900 dark:text-white">{{ t.title }}</p>
            @if (t.message) {
              <p class="mt-0.5 break-words text-[13px] leading-snug text-slate-600 dark:text-slate-300">{{ t.message }}</p>
            }
          </div>
          <button type="button" class="absolute right-2 top-2 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200" (click)="toast.dismiss(t.id)" aria-label="Dismiss">
            <lucide-icon [img]="icons.X" [size]="14" />
          </button>
          @if (t.duration > 0) {
            <span class="absolute bottom-0 left-0 h-0.5 origin-left opacity-70" [class]="tones[t.tone].bar" [style.animation]="'toast-progress ' + t.duration + 'ms linear forwards'" style="width: 100%"></span>
          }
        </div>
      }
    </div>
  `,
  styles: `
    @keyframes toast-progress {
      from { transform: scaleX(1); }
      to { transform: scaleX(0); }
    }
  `,
})
export class ToastContainerComponent {
  protected readonly toast = inject(ToastService);
  protected readonly tones = TONES;
  protected readonly icons = Icons;
}
