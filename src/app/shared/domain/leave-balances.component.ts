import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { LeaveBalance } from '../../core/models/api.models';
import { listStagger } from '../animations';
import { Icons } from '../ui/icons';
import { MeterComponent } from '../ui/progress';

/** Leave balance cards: available / quota with a used + pending meter. */
@Component({
  selector: 'app-leave-balances',
  imports: [LucideAngularModule, MeterComponent],
  animations: [listStagger],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grid gap-3" [class]="compact() ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-4'" [@listStagger]="balances().length">
      @for (b of balances(); track b.leaveTypeId) {
        <article class="card card-hover relative overflow-hidden p-4">
          <div class="flex items-center justify-between gap-2">
            <p class="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{{ b.leaveType }}</p>
            <span
              class="badge"
              [class]="b.isPaid ? 'bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/25' : 'bg-slate-100 text-slate-600 ring-slate-400/30 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-600/40'"
              >{{ b.isPaid ? 'Paid' : 'Unpaid' }}</span
            >
          </div>
          @if (b.unlimited) {
            <p class="mt-2.5 flex items-baseline gap-1.5">
              <span class="text-2xl font-semibold text-slate-900 dark:text-white">∞</span>
              <span class="text-xs text-slate-500 dark:text-slate-400">no annual cap</span>
            </p>
            <p class="mt-2.5 text-xs text-slate-500 dark:text-slate-400">{{ b.used }} used · {{ b.pending }} pending this year</p>
          } @else {
            <p class="mt-2.5 flex items-baseline gap-1.5">
              <span class="text-2xl font-semibold text-slate-900 dark:text-white">{{ b.available }}</span>
              <span class="text-xs text-slate-500 dark:text-slate-400">of {{ b.quota }} days available</span>
            </p>
            <div class="mt-2.5">
              <app-meter [value]="b.quota ? (b.used + b.pending) / b.quota : 0" tone="amber" />
            </div>
            <p class="mt-2 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>{{ b.used }} used</span>
              @if (b.pending) {
                <span class="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400"><lucide-icon [img]="icons.Hourglass" [size]="11" /> {{ b.pending }} pending</span>
              }
            </p>
          }
        </article>
      }
    </div>
  `,
})
export class LeaveBalancesComponent {
  readonly balances = input<LeaveBalance[]>([]);
  readonly compact = input(false);
  protected readonly icons = Icons;
}
