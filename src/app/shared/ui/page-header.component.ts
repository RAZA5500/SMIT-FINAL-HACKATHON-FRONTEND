import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Page title, optional context line and right-aligned actions. */
@Component({
  selector: 'app-page-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div class="min-w-0">
        @if (eyebrow()) {
          <p class="eyebrow mb-1">{{ eyebrow() }}</p>
        }
        <h1 class="page-title truncate">{{ title() }}</h1>
        @if (subtitle()) {
          <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ subtitle() }}</p>
        }
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
}
