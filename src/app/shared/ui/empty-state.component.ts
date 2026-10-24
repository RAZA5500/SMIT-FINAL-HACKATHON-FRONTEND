import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type EmptyArt = 'team' | 'org' | 'calendar' | 'payroll' | 'inbox' | 'megaphone' | 'chart' | 'search' | 'shield' | 'upload' | 'clock' | 'sparkles';
type EmptyTone = 'emerald' | 'amber' | 'violet' | 'blue' | 'rose' | 'slate' | 'teal';

const TONE_TEXT: Record<EmptyTone, string> = {
  emerald: 'text-emerald-500',
  teal: 'text-teal-500',
  amber: 'text-amber-500',
  violet: 'text-violet-500',
  blue: 'text-blue-500',
  rose: 'text-rose-500',
  slate: 'text-slate-400',
};

/**
 * Guided empty state: custom illustration + clear guidance + direct call-to-action.
 * Actions are projected: `<app-empty-state ...><button class="btn btn-primary">…</button></app-empty-state>`
 */
@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="flex flex-col items-center justify-center text-center"
      [class]="compact() ? 'px-4 py-8' : 'rounded-3xl border-2 border-dashed border-slate-200 bg-white/40 px-6 py-12 dark:border-slate-800 dark:bg-slate-900/30 sm:py-14'"
    >
      <svg viewBox="0 0 200 140" class="mb-5 animate-float" [class]="(compact() ? 'h-24 w-36 ' : 'h-32 w-48 ') + toneText()" aria-hidden="true">
        <!-- shared backdrop -->
        <ellipse cx="100" cy="74" rx="78" ry="52" fill="currentColor" opacity="0.08" />
        <ellipse cx="100" cy="128" rx="54" ry="5" class="fill-slate-900/10 dark:fill-black/40" />
        <circle cx="28" cy="34" r="4" fill="currentColor" opacity="0.35" />
        <circle cx="176" cy="44" r="3" fill="currentColor" opacity="0.5" />
        <circle cx="166" cy="110" r="5" fill="currentColor" opacity="0.18" />
        <path d="M40 104l3 3m0-3l-3 3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" opacity="0.5" />

        @switch (art()) {
          @case ('team') {
            <rect x="46" y="38" width="108" height="76" rx="14" class="fill-white dark:fill-slate-800" stroke="currentColor" stroke-opacity="0.25" />
            <circle cx="78" cy="68" r="11" fill="currentColor" opacity="0.35" />
            <path d="M60 100c2-11 9-16 18-16s16 5 18 16" fill="currentColor" opacity="0.35" />
            <circle cx="122" cy="66" r="13" fill="currentColor" opacity="0.85" />
            <path d="M101 102c2.5-13 11-19 21-19s18.5 6 21 19" fill="currentColor" opacity="0.85" />
            <circle cx="150" cy="40" r="11" class="fill-white dark:fill-slate-900" stroke="currentColor" stroke-width="2.5" />
            <path d="M150 35v10M145 40h10" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
          }
          @case ('org') {
            <path d="M100 44v18M64 62h72M64 62v14M136 62v14M100 62v14" stroke="currentColor" stroke-width="2" stroke-opacity="0.45" fill="none" />
            <rect x="78" y="22" width="44" height="24" rx="8" fill="currentColor" opacity="0.9" />
            <rect x="44" y="76" width="40" height="24" rx="8" class="fill-white dark:fill-slate-800" stroke="currentColor" stroke-opacity="0.35" />
            <rect x="80" y="76" width="40" height="24" rx="8" class="fill-white dark:fill-slate-800" stroke="currentColor" stroke-opacity="0.35" />
            <rect x="116" y="76" width="40" height="24" rx="8" class="fill-white dark:fill-slate-800" stroke="currentColor" stroke-dasharray="4 3" stroke-opacity="0.7" />
            <path d="M136 84v8M132 88h8" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            <rect x="88" y="31" width="24" height="5" rx="2.5" class="fill-white/80" />
          }
          @case ('calendar') {
            <rect x="52" y="30" width="96" height="86" rx="14" class="fill-white dark:fill-slate-800" stroke="currentColor" stroke-opacity="0.25" />
            <path d="M52 50a14 14 0 0 1 14-14h68a14 14 0 0 1 14 14v4H52z" fill="currentColor" opacity="0.85" />
            <rect x="74" y="22" width="6" height="16" rx="3" class="fill-slate-400 dark:fill-slate-500" />
            <rect x="120" y="22" width="6" height="16" rx="3" class="fill-slate-400 dark:fill-slate-500" />
            @for (cell of calendarCells; track $index) {
              <rect [attr.x]="cell.x" [attr.y]="cell.y" width="14" height="12" rx="3" fill="currentColor" [attr.opacity]="cell.o" />
            }
          }
          @case ('payroll') {
            <rect x="42" y="46" width="116" height="62" rx="12" fill="currentColor" opacity="0.85" />
            <rect x="50" y="54" width="100" height="46" rx="8" fill="none" class="stroke-white/50" stroke-dasharray="3 3" />
            <circle cx="100" cy="77" r="14" class="fill-white/90 dark:fill-slate-900/80" />
            <text x="100" y="82" text-anchor="middle" font-size="15" font-weight="800" fill="currentColor">₨</text>
            <rect x="118" y="20" width="44" height="56" rx="8" class="fill-white dark:fill-slate-800" stroke="currentColor" stroke-opacity="0.3" transform="rotate(8 140 48)" />
            <path d="M128 36h22M128 44h18M128 52h22" stroke="currentColor" stroke-opacity="0.45" stroke-width="2.5" stroke-linecap="round" transform="rotate(8 140 48)" />
          }
          @case ('inbox') {
            <path d="M48 70l16-34h72l16 34v34a12 12 0 0 1-12 12H60a12 12 0 0 1-12-12z" class="fill-white dark:fill-slate-800" stroke="currentColor" stroke-opacity="0.3" />
            <path d="M48 72h30l6 12h32l6-12h30" fill="none" stroke="currentColor" stroke-width="2" stroke-opacity="0.5" />
            <circle cx="100" cy="52" r="14" fill="currentColor" opacity="0.9" />
            <path d="M93 52l5 5 9-10" fill="none" class="stroke-white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
          }
          @case ('megaphone') {
            <path d="M58 66l52-24v60L58 88z" fill="currentColor" opacity="0.85" />
            <rect x="44" y="64" width="18" height="26" rx="6" class="fill-white dark:fill-slate-800" stroke="currentColor" stroke-opacity="0.4" />
            <path d="M66 90l6 20h12l-4-18" class="fill-slate-300 dark:fill-slate-600" />
            <path d="M124 56c8 6 8 26 0 32M134 46c14 10 14 42 0 52" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity="0.55" />
          }
          @case ('chart') {
            <rect x="44" y="28" width="112" height="86" rx="14" class="fill-white dark:fill-slate-800" stroke="currentColor" stroke-opacity="0.25" />
            <path d="M58 98h84" class="stroke-slate-300 dark:stroke-slate-600" stroke-width="2" />
            <rect x="66" y="74" width="12" height="24" rx="3" fill="currentColor" opacity="0.3" />
            <rect x="86" y="60" width="12" height="38" rx="3" fill="currentColor" opacity="0.55" />
            <rect x="106" y="48" width="12" height="50" rx="3" fill="currentColor" opacity="0.85" />
            <rect x="126" y="66" width="12" height="32" rx="3" fill="none" stroke="currentColor" stroke-dasharray="3 3" />
          }
          @case ('search') {
            <rect x="40" y="34" width="84" height="64" rx="12" class="fill-white dark:fill-slate-800" stroke="currentColor" stroke-opacity="0.25" />
            <path d="M54 52h48M54 64h36M54 76h44" class="stroke-slate-200 dark:stroke-slate-700" stroke-width="5" stroke-linecap="round" />
            <circle cx="124" cy="78" r="22" class="fill-white/70 dark:fill-slate-900/70" stroke="currentColor" stroke-width="5" />
            <path d="M140 94l16 16" stroke="currentColor" stroke-width="7" stroke-linecap="round" />
          }
          @case ('shield') {
            <path d="M100 24l40 14v30c0 26-18 42-40 50-22-8-40-24-40-50V38z" fill="currentColor" opacity="0.85" />
            <path d="M84 70l11 11 22-24" fill="none" class="stroke-white" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
          }
          @case ('upload') {
            <path d="M62 98a22 22 0 0 1 2-44 28 28 0 0 1 54-6 22 22 0 0 1 20 50z" class="fill-white dark:fill-slate-800" stroke="currentColor" stroke-opacity="0.35" />
            <path d="M100 92V64m0 0l-12 12m12-12l12 12" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
          }
          @case ('clock') {
            <circle cx="100" cy="72" r="40" class="fill-white dark:fill-slate-800" stroke="currentColor" stroke-opacity="0.3" stroke-width="2" />
            <circle cx="100" cy="72" r="32" fill="currentColor" opacity="0.12" />
            <path d="M100 50v22l15 10" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
            <circle cx="100" cy="72" r="4" fill="currentColor" />
          }
          @case ('sparkles') {
            <path d="M100 30l8 26 26 8-26 8-8 26-8-26-26-8 26-8z" fill="currentColor" opacity="0.9" />
            <path d="M142 32l3 9 9 3-9 3-3 9-3-9-9-3 9-3z" fill="currentColor" opacity="0.6" />
            <path d="M58 88l2.5 7 7 2.5-7 2.5-2.5 7-2.5-7-7-2.5 7-2.5z" fill="currentColor" opacity="0.5" />
          }
        }
      </svg>
      <h3 class="text-balance text-base font-bold text-slate-900 dark:text-white sm:text-lg">{{ title() }}</h3>
      @if (description()) {
        <p class="mt-1.5 max-w-md text-balance text-sm leading-relaxed text-slate-500 dark:text-slate-400">{{ description() }}</p>
      }
      <div class="mt-5 flex flex-wrap items-center justify-center gap-2.5 empty:hidden">
        <ng-content />
      </div>
    </div>
  `,
})
export class EmptyStateComponent {
  readonly art = input<EmptyArt>('inbox');
  readonly tone = input<EmptyTone>('emerald');
  readonly title = input.required<string>();
  readonly description = input('');
  readonly compact = input(false);

  protected readonly toneText = computed(() => TONE_TEXT[this.tone()]);
  protected readonly calendarCells = Array.from({ length: 12 }, (_, i) => ({
    x: 62 + (i % 4) * 20,
    y: 62 + Math.floor(i / 4) * 16,
    o: [5, 6, 9].includes(i) ? 0.85 : 0.15,
  }));
}
