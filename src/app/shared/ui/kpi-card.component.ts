import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { LucideAngularModule, LucideIconData } from 'lucide-angular';
import { PolicyStore } from '../../core/services/policy.store';
import { formatMoney, formatNumber } from '../../core/utils/format';
import { CountUpDirective } from './count-up.directive';
import { TONE_CHIP, TONE_DOT, TONE_GLOW, Tone } from './tone';

export type KpiFormat = 'number' | 'percent' | 'money' | 'hours' | 'days';

/** Stat tile: label · tinted icon tile · animated value · hint (status dot for semantic tones); glows in its tone on hover. */
@Component({
  selector: 'app-kpi-card',
  imports: [LucideAngularModule, CountUpDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card card-hover group relative h-full overflow-hidden p-5">
      <span aria-hidden="true" class="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100" [class]="glow()"></span>
      <div class="relative flex items-start justify-between gap-3">
        <p class="min-w-0 flex-1 truncate pt-1 text-[13px] font-medium text-slate-500 dark:text-slate-400">{{ label() }}</p>
        <span class="icon-tile h-9 w-9 group-hover:-rotate-6 group-hover:scale-110" [class]="chip()">
          <lucide-icon [img]="icon()" [size]="17" [strokeWidth]="2" />
        </span>
      </div>
      @if (loading()) {
        <div class="skeleton relative mt-2 h-8 w-24"></div>
      } @else {
        <p class="num relative mt-1 text-[1.875rem] font-semibold leading-none tracking-tight text-slate-900 dark:text-white">
          <span [appCountUp]="value()" [countFormat]="formatter()"></span>
        </p>
      }
      @if (hint() && !loading()) {
        <p class="relative mt-2.5 flex items-center gap-1.5 truncate text-xs text-slate-500 dark:text-slate-400" [title]="hint()">
          @if (dot(); as d) {
            <span class="h-1.5 w-1.5 shrink-0 rounded-full" [class]="d"></span>
          }
          <span class="truncate">{{ hint() }}</span>
        </p>
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

  /** Neutral metrics (navy/slate) carry no dot. */
  protected readonly dot = computed(() => (this.tone() === 'navy' || this.tone() === 'slate' ? null : TONE_DOT[this.tone()]));
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
