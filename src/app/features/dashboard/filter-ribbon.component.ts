import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { AiDashboardSummaryResponse, DashboardFilters, Department } from '../../core/models/api.models';
import { AiService } from '../../core/services/ai.service';
import { PolicyStore } from '../../core/services/policy.store';
import { addDays, formatDate, startOfMonth, startOfYear } from '../../core/utils/dates';
import { expand, fadeInUp, listStagger } from '../../shared/animations';
import { AiBadgeComponent } from '../../shared/ui/badges';
import { Icons } from '../../shared/ui/icons';

type Preset = 'mtd' | '7d' | '30d' | '90d' | 'ytd' | 'custom';

const PRESETS: { id: Preset; label: string }[] = [
  { id: 'mtd', label: 'Month to date' },
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
  { id: '90d', label: 'Last 90 days' },
  { id: 'ytd', label: 'Year to date' },
  { id: 'custom', label: 'Custom' },
];

/** Global filter toolbar (date range + department) with the "Summarize with AI" action and its insight card. */
@Component({
  selector: 'app-filter-ribbon',
  imports: [FormsModule, LucideAngularModule, AiBadgeComponent],
  animations: [expand, fadeInUp, listStagger],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between" aria-label="Dashboard filters">
      <div class="no-scrollbar -mx-1 overflow-x-auto px-1">
        <div class="inline-flex rounded-md border border-slate-200 bg-white p-0.5 shadow-xs dark:border-slate-700 dark:bg-slate-900" role="group" aria-label="Date range">
          @for (p of presets; track p.id) {
            <button
              type="button"
              class="whitespace-nowrap rounded px-2.5 py-1 text-[13px] font-medium outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-blue-600/40"
              [class]="preset() === p.id ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'"
              [attr.aria-pressed]="preset() === p.id"
              (click)="choose(p.id)"
            >
              {{ p.label }}
            </button>
          }
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        @if (preset() === 'custom') {
          <div @fadeInUp class="flex items-center gap-2">
            <input type="date" class="input w-auto" [ngModel]="customStart()" (ngModelChange)="customStart.set($event); applyCustom()" [max]="customEnd() || today()" aria-label="Start date" />
            <span class="text-slate-400" aria-hidden="true">–</span>
            <input type="date" class="input w-auto" [ngModel]="customEnd()" (ngModelChange)="customEnd.set($event); applyCustom()" [min]="customStart()" [max]="today()" aria-label="End date" />
          </div>
        } @else {
          <span class="num hidden whitespace-nowrap text-xs text-slate-500 dark:text-slate-400 xl:inline">{{ rangeLabel() }}</span>
        }
        <select class="input w-auto min-w-44" [ngModel]="departmentId()" (ngModelChange)="departmentId.set($event); emit()" aria-label="Department filter">
          <option value="">All departments</option>
          @for (d of departments(); track d.id) {
            <option [value]="d.id">{{ d.name }}</option>
          }
        </select>
        <button type="button" class="btn btn-ai shrink-0" (click)="summarize()" [disabled]="summarizing()">
          <lucide-icon [img]="summarizing() ? icons.LoaderCircle : icons.Sparkles" [size]="15" [class.animate-spin]="summarizing()" />
          {{ summarizing() ? 'Summarizing…' : 'Summarize with AI' }}
        </button>
      </div>
    </section>

    @if (summarizing() || summary()) {
      <div @expand>
        <section class="card mb-6 p-4 sm:p-5">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <p class="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
              <lucide-icon [img]="icons.Sparkles" [size]="15" class="text-violet-600 dark:text-violet-300" /> AI insights
              <span class="num font-normal text-slate-500 dark:text-slate-400">· {{ rangeLabel() }}</span>
            </p>
            <div class="flex items-center gap-1.5">
              <app-ai-badge />
              @if (summary() && !summarizing()) {
                <button type="button" class="btn btn-ghost btn-icon p-1.5" (click)="summary.set(null)" aria-label="Dismiss AI summary">
                  <lucide-icon [img]="icons.X" [size]="15" />
                </button>
              }
            </div>
          </div>
          @if (summarizing()) {
            <div class="mt-3 space-y-2.5">
              @for (w of [92, 78, 85, 64]; track $index) {
                <div class="ai-shimmer h-4 rounded" [style.width.%]="w"></div>
              }
            </div>
          } @else {
            @if (summary(); as s) {
              @if (s.bullets.length) {
                <ul class="mt-3 space-y-2" [@listStagger]="s.bullets.length">
                  @for (b of s.bullets; track $index) {
                    <li class="flex gap-2.5 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                      <span class="mt-[0.55rem] h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500"></span>
                      <span>{{ b }}</span>
                    </li>
                  }
                </ul>
              } @else {
                <p class="mt-3 text-sm text-slate-600 dark:text-slate-300">{{ s.message || 'No insights could be generated for this selection.' }}</p>
              }
              <p class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                @if (s.fallback) {
                  <span class="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300"><lucide-icon [img]="icons.Info" [size]="12" /> AI model unavailable — insights generated from rules over the live KPIs.</span>
                } @else if (s.grounded) {
                  <span class="inline-flex items-center gap-1 text-blue-700 dark:text-blue-300"><lucide-icon [img]="icons.ShieldCheck" [size]="12" /> Every number verified against the live KPI data.</span>
                }
                @if (s.model) {
                  <span>{{ s.model }}</span>
                }
                @if (s.latencyMs) {
                  <span>{{ (s.latencyMs / 1000).toFixed(1) }}s</span>
                }
              </p>
            }
          }
        </section>
      </div>
    }
  `,
})
export class FilterRibbonComponent implements OnInit {
  private readonly policies = inject(PolicyStore);
  private readonly ai = inject(AiService);
  protected readonly icons = Icons;
  protected readonly presets = PRESETS;

  readonly departments = input<Department[]>([]);
  readonly filtersChange = output<DashboardFilters>();

  protected readonly preset = signal<Preset>('mtd');
  protected readonly departmentId = signal('');
  protected readonly customStart = signal('');
  protected readonly customEnd = signal('');
  protected readonly summarizing = signal(false);
  protected readonly summary = signal<AiDashboardSummaryResponse | null>(null);
  private readonly current = signal<DashboardFilters>({});

  protected readonly today = computed(() => {
    this.policies.policies();
    return this.policies.today();
  });

  protected readonly rangeLabel = computed(() => {
    const f = this.current();
    if (!f.startDate || !f.endDate) return '';
    return f.startDate === f.endDate ? formatDate(f.endDate) : `${formatDate(f.startDate, 'short')} – ${formatDate(f.endDate)}`;
  });

  ngOnInit(): void {
    this.emit();
  }

  protected choose(preset: Preset): void {
    this.preset.set(preset);
    if (preset === 'custom') {
      const f = this.current();
      this.customStart.set(f.startDate ?? startOfMonth(this.today()));
      this.customEnd.set(f.endDate ?? this.today());
    }
    this.emit();
  }

  protected applyCustom(): void {
    if (this.customStart() && this.customEnd() && this.customStart() <= this.customEnd()) this.emit();
  }

  protected emit(): void {
    const today = this.today();
    let startDate: string;
    let endDate = today;
    switch (this.preset()) {
      case '7d':
        startDate = addDays(today, -6);
        break;
      case '30d':
        startDate = addDays(today, -29);
        break;
      case '90d':
        startDate = addDays(today, -89);
        break;
      case 'ytd':
        startDate = startOfYear(today);
        break;
      case 'custom':
        startDate = this.customStart() || startOfMonth(today);
        endDate = this.customEnd() || today;
        break;
      default:
        startDate = startOfMonth(today);
    }
    const filters: DashboardFilters = { startDate, endDate, departmentId: this.departmentId() || undefined };
    this.current.set(filters);
    this.summary.set(null);
    this.filtersChange.emit(filters);
  }

  protected summarize(): void {
    this.summarizing.set(true);
    this.ai.dashboardSummary(this.current()).subscribe((res) => {
      this.summary.set(res);
      this.summarizing.set(false);
    });
  }
}
