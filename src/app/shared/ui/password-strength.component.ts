import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { passwordStrength } from '../../core/utils/validators';
import { Icons } from './icons';

/** Interactive strength meter + live policy checklist. */
@Component({
  selector: 'app-password-strength',
  imports: [LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mt-3 rounded-lg border border-slate-200 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-slate-900/60">
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">Password strength</span>
        <span class="text-xs font-semibold" [class]="labelClass()">{{ result().label }}</span>
      </div>
      <div class="mt-2 grid grid-cols-4 gap-1.5">
        @for (i of [1, 2, 3, 4]; track i) {
          <span class="h-1.5 rounded-full transition-all duration-500" [class]="i <= result().score ? barClass() : 'bg-slate-200 dark:bg-slate-700'"></span>
        }
      </div>
      <ul class="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5">
        @for (check of result().checks; track check.id) {
          <li class="flex items-center gap-1.5 text-xs transition-colors" [class]="check.ok ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'">
            <lucide-icon [img]="check.ok ? icons.CircleCheck : icons.CircleDashed" [size]="13" [strokeWidth]="2.4" />
            {{ check.label }}
            @if (check.required) {
              <span class="text-[10px] text-slate-400">*</span>
            }
          </li>
        }
      </ul>
    </div>
  `,
})
export class PasswordStrengthComponent {
  readonly password = input<string | null | undefined>('');
  protected readonly icons = Icons;
  protected readonly result = computed(() => passwordStrength(this.password() ?? ''));
  protected readonly barClass = computed(
    () => ['bg-rose-500', 'bg-rose-500', 'bg-amber-500', 'bg-blue-500', 'bg-blue-600'][this.result().score],
  );
  protected readonly labelClass = computed(
    () =>
      ['text-slate-400', 'text-rose-600 dark:text-rose-400', 'text-amber-700 dark:text-amber-400', 'text-blue-700 dark:text-blue-400', 'text-blue-700 dark:text-blue-400'][this.result().score],
  );
}
