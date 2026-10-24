import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { LucideAngularModule, LucideIconData } from 'lucide-angular';
import { PolicyStore } from '../../core/services/policy.store';
import { formatMoney, formatNumber } from '../../core/utils/format';
import { CountUpDirective } from './count-up.directive';
import { TONE_CHIP, TONE_GLOW, Tone } from './tone';

export type KpiFormat = 'number' | 'percent' | 'money' | 'hours' | 'days';

/** Stat tile: label · animated value · optional hint. */
@Component({
  selector: 'app-kpi-card',
  imports: [LucideAngularModule, CountUpDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card card-hover group relative h-full overflow-hidden p-5">
      <div class="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full blur-2xl transition-opacity duration-500 group-hover:opacity-100 opacity-70" [class]="glow()"></div>
      <div class="relative flex items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="truncate text-[13px] font-medium text-slate-500 dark:text-slate-400">{{ label() }}</p>
          @if (loading()) {
            <div class="skeleton mt-3 h-8 w-24"></div>
          } @else {
            <p class="mt-2 text-[1.85rem] font-extrabold leading-none tracking-tight text-slate-900 dark:text-white">
              <span [appCountUp]="value()" [countFormat]="formatter()"></span>
            </p>
          }
        </div>
        <span class="grid h-11 w-11 shrink-0 place-items-center rounded-2xl ring-1 ring-inset transition-transform duration-300 group-hover:scale-110" [class]="chip()">
          <lucide-icon [img]="icon()" [size]="20" [strokeWidth]="2.2" />
        </span>
      </div>
      @if (hint() && !loading()) {
        <p class="relative mt-3 truncate text-xs text-slate-500 dark:text-slate-400" [title]="hint()">{{ hint() }}</p>
      }
      <ng-content />
    </div>
  `,
})
export class KpiCardComponent {
  private readonly policies = inject(PolicyStore);

  readonly label = input.required<string>();
  readonly value = input<number | null | undefined>(null);
  readonly icon = input.required<LucideIconData>();
  readonly tone = input<Tone>('emerald');
  readonly format = input<KpiFormat>('number');
  readonly hint = input<string>('');
  readonly loading = input(false);

  protected readonly chip = computed(() => TONE_CHIP[this.tone()]);
  protected readonly glow = computed(() => TONE_GLOW[this.tone()]);
  protected readonly formatter = computed<(n: number) => string>(() => {
    const currency = this.policies.currency();
    switch (this.format()) {
      case 'percent':
        return (n) => `${formatNumber(n, 1)}%`;
      case 'money':
        return (n) => formatMoney(n, currency, Math.abs(n) >= 100_000);
      case 'hours':
        return (n) => `${formatNumber(n, 1)}h`;
      case 'days':
        return (n) => `${formatNumber(n, 1)}d`;
      default:
        return (n) => formatNumber(Math.round(n));
    }
  });
}
