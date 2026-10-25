import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { LucideAngularModule, LucideIconData } from 'lucide-angular';
import { EmptyArt, EmptyStateComponent } from '../ui/empty-state.component';
import { Icons } from '../ui/icons';
import { TONE_CHIP, Tone } from '../ui/tone';

export interface ChartTable {
  columns: string[];
  rows: (string | number)[][];
}

/**
 * Chart container: title, a chart ⇄ table toggle (the accessible twin of every chart),
 * guided empty state, and "refetch keeps the frame" (previous render dims while reloading).
 */
@Component({
  selector: 'app-chart-card',
  imports: [LucideAngularModule, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="card flex h-full flex-col p-5">
      <header class="flex items-start justify-between gap-3">
        <div class="flex min-w-0 items-start gap-3">
          @if (icon(); as img) {
            <span class="grid h-9 w-9 shrink-0 place-items-center rounded-xl ring-1 ring-inset" [class]="chip()">
              <lucide-icon [img]="img" [size]="17" [strokeWidth]="2.2" />
            </span>
          }
          <div class="min-w-0">
            <h3 class="section-title truncate">{{ title() }}</h3>
            @if (subtitle()) {
              <p class="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{{ subtitle() }}</p>
            }
          </div>
        </div>
        <div class="flex shrink-0 items-center gap-1">
          <ng-content select="[card-actions]" />
          @if (table() && !empty() && !loading()) {
            <button
              type="button"
              class="btn btn-ghost btn-sm"
              (click)="showTable.set(!showTable())"
              [attr.aria-pressed]="showTable()"
              [title]="showTable() ? 'Show chart' : 'Show data table'"
            >
              <lucide-icon [img]="showTable() ? icons.Activity : icons.Table2" [size]="14" />
              <span class="hidden sm:inline">{{ showTable() ? 'Chart' : 'Table' }}</span>
            </button>
          }
        </div>
      </header>

      <div class="relative mt-4 flex-1 transition-opacity duration-300" [class.opacity-50]="refreshing()" [class.pointer-events-none]="refreshing()">
        @if (loading()) {
          <div class="flex items-end gap-3 px-2" [style.height.px]="height()">
            @for (h of skeletonBars; track $index) {
              <div class="skeleton flex-1" [style.height.%]="h"></div>
            }
          </div>
        } @else if (empty()) {
          <app-empty-state [compact]="true" [art]="emptyArt()" tone="slate" [title]="emptyTitle()" [description]="emptyText()" />
        } @else if (showTable() && table()) {
          @let t = table()!;
          <div class="table-wrap scroll-thin max-h-80 rounded-xl border border-slate-100 dark:border-slate-800">
            <table class="data-table">
              <thead>
                <tr>
                  @for (c of t.columns; track $index) {
                    <th [class.text-right]="$index > 0">{{ c }}</th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (row of t.rows; track $index) {
                  <tr>
                    @for (cell of row; track $index) {
                      <td class="num" [class.text-right]="$index > 0" [class.font-medium]="$index === 0">{{ cell }}</td>
                    }
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
        <div [class.hidden]="loading() || empty() || showTable()" [style.height.px]="height()" class="relative">
          <ng-content />
        </div>
      </div>
      <ng-content select="[card-footer]" />
    </section>
  `,
})
export class ChartCardComponent {
  readonly title = input.required<string>();
  readonly subtitle = input('');
  readonly icon = input<LucideIconData | null>(null);
  readonly tone = input<Tone>('teal');
  readonly table = input<ChartTable | null>(null);
  readonly loading = input(false);
  readonly refreshing = input(false);
  readonly empty = input(false);
  readonly emptyTitle = input('No data for this period yet');
  readonly emptyText = input('Numbers appear here as soon as the underlying records exist.');
  readonly emptyArt = input<EmptyArt>('chart');
  readonly height = input(260);

  protected readonly icons = Icons;
  protected readonly showTable = signal(false);
  protected readonly chip = computed(() => TONE_CHIP[this.tone()]);
  protected readonly skeletonBars = [45, 70, 55, 85, 40, 65, 75];
}
