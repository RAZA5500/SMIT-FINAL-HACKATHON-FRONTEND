import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { LucideAngularModule, LucideIconData } from 'lucide-angular';
import { TONE_SOLID, Tone } from './tone';

@Component({
  selector: 'app-page-header',
  imports: [LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div class="flex min-w-0 items-center gap-4">
        @if (icon(); as img) {
          <span class="hidden h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-lg sm:grid" [class]="solid()">
            <lucide-icon [img]="img" [size]="22" [strokeWidth]="2.2" />
          </span>
        }
        <div class="min-w-0">
          @if (eyebrow()) {
            <p class="eyebrow mb-1">{{ eyebrow() }}</p>
          }
          <h1 class="page-title truncate">{{ title() }}</h1>
          @if (subtitle()) {
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ subtitle() }}</p>
          }
        </div>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <ng-content />
      </div>
    </header>
  `,
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
  readonly subtitle = input('');
  readonly eyebrow = input('');
  readonly icon = input<LucideIconData | null>(null);
  readonly tone = input<Tone>('emerald');
  protected readonly solid = computed(() => TONE_SOLID[this.tone()]);
}
