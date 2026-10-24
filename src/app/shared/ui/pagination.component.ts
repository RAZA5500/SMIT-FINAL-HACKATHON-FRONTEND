import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { PageMeta } from '../../core/models/api.models';
import { Icons } from './icons';

/** Server-side pagination footer. */
@Component({
  selector: 'app-pagination',
  imports: [LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (meta(); as m) {
      @if (m.total > 0) {
        <nav class="flex flex-col items-center justify-between gap-3 text-sm sm:flex-row" aria-label="Pagination">
          <p class="text-slate-500 dark:text-slate-400">
            Showing <span class="font-semibold text-slate-800 dark:text-slate-200">{{ from() }}–{{ to() }}</span> of
            <span class="font-semibold text-slate-800 dark:text-slate-200">{{ m.total }}</span>
          </p>
          @if (m.totalPages > 1) {
            <div class="flex items-center gap-1">
              <button type="button" class="btn btn-ghost btn-icon" [disabled]="m.page <= 1" (click)="pageChange.emit(1)" aria-label="First page">
                <lucide-icon [img]="icons.ChevronsLeft" [size]="16" />
              </button>
              <button type="button" class="btn btn-ghost btn-icon" [disabled]="m.page <= 1" (click)="pageChange.emit(m.page - 1)" aria-label="Previous page">
                <lucide-icon [img]="icons.ChevronLeft" [size]="16" />
              </button>
              @for (p of pages(); track $index) {
                @if (p === 0) {
                  <span class="px-1.5 text-slate-400">…</span>
                } @else {
                  <button
                    type="button"
                    class="h-9 min-w-9 rounded-xl px-2 text-sm font-semibold transition"
                    [class]="p === m.page ? 'bg-slate-900 text-white shadow-md dark:bg-white dark:text-slate-900' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'"
                    (click)="pageChange.emit(p)"
                    [attr.aria-current]="p === m.page ? 'page' : null"
                  >
                    {{ p }}
                  </button>
                }
              }
              <button type="button" class="btn btn-ghost btn-icon" [disabled]="m.page >= m.totalPages" (click)="pageChange.emit(m.page + 1)" aria-label="Next page">
                <lucide-icon [img]="icons.ChevronRight" [size]="16" />
              </button>
              <button type="button" class="btn btn-ghost btn-icon" [disabled]="m.page >= m.totalPages" (click)="pageChange.emit(m.totalPages)" aria-label="Last page">
                <lucide-icon [img]="icons.ChevronsRight" [size]="16" />
              </button>
            </div>
          }
        </nav>
      }
    }
  `,
})
export class PaginationComponent {
  readonly meta = input<PageMeta | null>(null);
  readonly pageChange = output<number>();
  protected readonly icons = Icons;

  protected readonly from = computed(() => {
    const m = this.meta();
    return m && m.total ? (m.page - 1) * m.limit + 1 : 0;
  });
  protected readonly to = computed(() => {
    const m = this.meta();
    return m ? Math.min(m.total, m.page * m.limit) : 0;
  });
  /** Page numbers with 0 as an ellipsis marker. */
  protected readonly pages = computed(() => {
    const m = this.meta();
    if (!m) return [];
    const total = m.totalPages;
    const current = m.page;
    const set = new Set([1, total, current - 1, current, current + 1].filter((p) => p >= 1 && p <= total));
    const sorted = [...set].sort((a, b) => a - b);
    const out: number[] = [];
    sorted.forEach((p, i) => {
      if (i > 0 && p - sorted[i - 1] > 1) out.push(0);
      out.push(p);
    });
    return out;
  });
}
