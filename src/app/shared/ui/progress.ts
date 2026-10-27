import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

const RING_COLORS: Record<string, string> = {
  emerald: '#2563EB',
  amber: '#D97706',
  violet: '#7C3AED',
  blue: '#2563EB',
  rose: '#E11D48',
  teal: '#4F46E5',
};

/** Circular progress ring with an optional threshold marker (e.g. the half-day line). */
@Component({
  selector: 'app-progress-ring',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative inline-grid place-items-center" [style.width.px]="size()" [style.height.px]="size()">
      <svg [attr.viewBox]="'0 0 ' + size() + ' ' + size()" class="-rotate-90" [attr.width]="size()" [attr.height]="size()" aria-hidden="true">
        <circle [attr.cx]="center()" [attr.cy]="center()" [attr.r]="radius()" fill="none" [attr.stroke-width]="stroke()" class="stroke-slate-100 dark:stroke-slate-800" />
        <circle
          [attr.cx]="center()"
          [attr.cy]="center()"
          [attr.r]="radius()"
          fill="none"
          [attr.stroke]="color()"
          [attr.stroke-width]="stroke()"
          stroke-linecap="round"
          [attr.stroke-dasharray]="circumference()"
          [attr.stroke-dashoffset]="offset()"
          style="transition: stroke-dashoffset 0.9s cubic-bezier(0.22, 1, 0.36, 1)"
        />
        @if (marker() !== null) {
          <line
            [attr.x1]="markerPoint().x1"
            [attr.y1]="markerPoint().y1"
            [attr.x2]="markerPoint().x2"
            [attr.y2]="markerPoint().y2"
            stroke-width="2.5"
            stroke-linecap="round"
            class="stroke-slate-500 dark:stroke-slate-300"
          />
        }
      </svg>
      <div class="absolute inset-0 grid place-items-center text-center">
        <ng-content />
      </div>
    </div>
  `,
})
export class ProgressRingComponent {
  /** 0 → 1 */
  readonly value = input(0);
  readonly size = input(160);
  readonly stroke = input(12);
  readonly tone = input<'emerald' | 'amber' | 'violet' | 'blue' | 'rose' | 'teal'>('emerald');
  /** 0 → 1, optional tick on the track. */
  readonly marker = input<number | null>(null);

  protected readonly color = computed(() => RING_COLORS[this.tone()]);
  protected readonly center = computed(() => this.size() / 2);
  protected readonly radius = computed(() => (this.size() - this.stroke()) / 2 - 2);
  protected readonly circumference = computed(() => 2 * Math.PI * this.radius());
  protected readonly offset = computed(() => this.circumference() * (1 - Math.min(1, Math.max(0, this.value() || 0))));
  protected readonly markerPoint = computed(() => {
    const angle = 2 * Math.PI * (this.marker() ?? 0);
    const c = this.center();
    const inner = this.radius() - this.stroke() / 2 - 3;
    const outer = this.radius() + this.stroke() / 2 + 3;
    return {
      x1: c + inner * Math.cos(angle),
      y1: c + inner * Math.sin(angle),
      x2: c + outer * Math.cos(angle),
      y2: c + outer * Math.sin(angle),
    };
  });
}

/** Linear meter: the fill carries the state, the track is a lighter step of the same hue. */
@Component({
  selector: 'app-meter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" role="progressbar" [attr.aria-valuenow]="pct()" aria-valuemin="0" aria-valuemax="100">
      <div class="h-full rounded-full transition-[width] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]" [class]="fill()" [style.width.%]="pct()"></div>
    </div>
  `,
})
export class MeterComponent {
  /** 0 → 1 */
  readonly value = input(0);
  readonly tone = input<'emerald' | 'amber' | 'violet' | 'blue' | 'rose' | 'teal'>('emerald');

  protected readonly pct = computed(() => Math.round(Math.min(1, Math.max(0, this.value() || 0)) * 100));
  protected readonly fill = computed(
    () =>
      ({
        emerald: 'bg-blue-600 dark:bg-blue-500',
        amber: 'bg-amber-500',
        violet: 'bg-violet-500',
        blue: 'bg-blue-500',
        rose: 'bg-rose-500',
        teal: 'bg-indigo-600',
      })[this.tone()],
  );
}

/** Semicircle 0–100 gauge for the attrition risk score. */
@Component({
  selector: 'app-gauge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative" [style.width.px]="size()" [style.height.px]="size() * 0.62">
      <svg [attr.viewBox]="'0 0 200 124'" class="h-full w-full" aria-hidden="true">
        <defs>
          <linearGradient [attr.id]="gradientId" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#3B82F6" />
            <stop offset="50%" stop-color="#F59E0B" />
            <stop offset="100%" stop-color="#F43F5E" />
          </linearGradient>
        </defs>
        <path d="M20 110 A80 80 0 0 1 180 110" fill="none" stroke-width="16" stroke-linecap="round" class="stroke-slate-200 dark:stroke-slate-800" />
        <path
          d="M20 110 A80 80 0 0 1 180 110"
          fill="none"
          [attr.stroke]="'url(#' + gradientId + ')'"
          stroke-width="16"
          stroke-linecap="round"
          [attr.stroke-dasharray]="arcLength"
          [attr.stroke-dashoffset]="arcOffset()"
          style="transition: stroke-dashoffset 1s cubic-bezier(0.22, 1, 0.36, 1)"
        />
        <g
          [style.transform]="'rotate(' + needleAngle() + 'deg)'"
          style="transform-origin: 100px 110px; transform-box: view-box; transition: transform 1s cubic-bezier(0.22, 1, 0.36, 1)"
        >
          <line x1="100" y1="110" x2="100" y2="44" stroke-width="4" stroke-linecap="round" class="stroke-slate-800 dark:stroke-slate-100" />
        </g>
        <circle cx="100" cy="110" r="8" class="fill-slate-800 dark:fill-slate-100" />
      </svg>
      <div class="absolute inset-x-0 bottom-0 text-center">
        <ng-content />
      </div>
    </div>
  `,
})
export class GaugeComponent {
  private static nextId = 0;
  protected readonly gradientId = `gauge-grad-${GaugeComponent.nextId++}`;
  protected readonly arcLength = Math.PI * 80;

  /** 0 → 100 */
  readonly score = input(0);
  readonly size = input(180);

  private readonly clamped = computed(() => Math.min(100, Math.max(0, this.score() || 0)));
  protected readonly arcOffset = computed(() => this.arcLength * (1 - this.clamped() / 100));
  protected readonly needleAngle = computed(() => -90 + (this.clamped() / 100) * 180);
}
