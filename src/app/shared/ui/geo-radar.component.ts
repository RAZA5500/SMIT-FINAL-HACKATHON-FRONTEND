import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { formatMeters } from '../../core/utils/geo';

export type RadarState = 'scanning' | 'inside' | 'outside' | 'unknown' | 'error';

/**
 * Geofence radar: the office sits at the centre, the dashed ring is the Admin's radius and
 * the dot is you (placed by distance when it is known).
 */
@Component({
  selector: 'app-geo-radar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative aspect-square w-full max-w-[220px]">
      <svg viewBox="0 0 200 200" class="h-full w-full" aria-hidden="true">
        <defs>
          <radialGradient [attr.id]="bgId" cx="50%" cy="50%" r="50%">
            <stop offset="0%" [attr.stop-color]="tint()" stop-opacity="0.18" />
            <stop offset="100%" [attr.stop-color]="tint()" stop-opacity="0.02" />
          </radialGradient>
          <linearGradient [attr.id]="sweepId" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" [attr.stop-color]="tint()" stop-opacity="0" />
            <stop offset="100%" [attr.stop-color]="tint()" stop-opacity="0.55" />
          </linearGradient>
        </defs>
        <circle cx="100" cy="100" r="96" [attr.fill]="'url(#' + bgId + ')'" [attr.stroke]="tint()" stroke-opacity="0.35" />
        <circle cx="100" cy="100" r="64" fill="none" [attr.stroke]="tint()" stroke-opacity="0.18" />
        <circle cx="100" cy="100" r="32" fill="none" [attr.stroke]="tint()" stroke-opacity="0.18" />
        <path d="M100 4v192M4 100h192" [attr.stroke]="tint()" stroke-opacity="0.12" />
        <!-- geofence radius -->
        <circle cx="100" cy="100" [attr.r]="fenceR" fill="none" [attr.stroke]="tint()" stroke-width="2" stroke-dasharray="5 4" stroke-opacity="0.85" />
        @if (state() === 'scanning' || state() === 'unknown') {
          <g class="origin-center animate-radar-sweep" style="transform-box: view-box; transform-origin: 100px 100px">
            <path d="M100 100 L196 100 A96 96 0 0 0 167.9 32.1 Z" [attr.fill]="'url(#' + sweepId + ')'" />
          </g>
        }
        <!-- office -->
        <circle cx="100" cy="100" r="7" class="fill-slate-900 dark:fill-white" />
        <circle cx="100" cy="100" r="3" [attr.fill]="tint()" />
        @if (dot(); as d) {
          <circle [attr.cx]="d.x" [attr.cy]="d.y" r="12" [attr.fill]="tint()" opacity="0.25">
            <animate attributeName="r" values="7;15;7" dur="1.8s" repeatCount="indefinite" />
          </circle>
          <circle [attr.cx]="d.x" [attr.cy]="d.y" r="6" [attr.fill]="tint()" class="stroke-white dark:stroke-slate-900" stroke-width="2.5" />
        }
      </svg>
      <span class="absolute left-1/2 top-[calc(50%+14px)] -translate-x-1/2 rounded-full bg-slate-900/80 px-2 py-0.5 text-[10px] font-semibold text-white dark:bg-white/90 dark:text-slate-900">Office</span>
      <span class="absolute right-1 top-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-slate-600 shadow-sm dark:bg-slate-800/90 dark:text-slate-300">r = {{ radiusLabel() }}</span>
    </div>
  `,
})
export class GeoRadarComponent {
  private static nextId = 0;
  private readonly uid = GeoRadarComponent.nextId++;
  protected readonly bgId = `radar-bg-${this.uid}`;
  protected readonly sweepId = `radar-sweep-${this.uid}`;

  readonly radiusMeters = input(150);
  readonly distanceMeters = input<number | null>(null);
  readonly state = input<RadarState>('scanning');

  /** The geofence ring always sits at 62% of the radar; distances scale against it. */
  protected readonly fenceR = 60;
  protected readonly radiusLabel = computed(() => formatMeters(this.radiusMeters()));
  protected readonly tint = computed(
    () => ({ scanning: '#F59E0B', unknown: '#F59E0B', inside: '#10B981', outside: '#F43F5E', error: '#94A3B8' })[this.state()],
  );
  protected readonly dot = computed(() => {
    const distance = this.distanceMeters();
    if (distance === null || this.state() === 'error') return null;
    const ratio = Math.min(1.5, distance / Math.max(1, this.radiusMeters()));
    const r = ratio * this.fenceR;
    const angle = -Math.PI / 4;
    return { x: 100 + r * Math.cos(angle), y: 100 + r * Math.sin(angle) };
  });
}
