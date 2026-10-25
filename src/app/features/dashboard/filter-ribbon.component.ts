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

/** Global filter ribbon (date range + department) with the glowing "✨ Summarize with AI" action. */
@Component({
  selector: 'app-filter-ribbon',
  imports: [FormsModule, LucideAngularModule, AiBadgeComponent],
  animations: [expand, fadeInUp, listStagger],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="card mb-6 p-3 sm:p-4">
      <div class="flex flex-col gap-3 xl:flex-row xl:items-center">
        <div class="flex min-w-0 items-center gap-2">
          <span class="hidden h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-900/[0.05] text-slate-600 dark:bg-white/10 dark:text-slate-300 sm:grid">
            <lucide-icon [img]="icons.CalendarDays" [size]="17" />
          </span>
          <div class="scroll-thin -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
            @for (p of presets; track p.id) {
              <button type="button" class="pill" [class.pill-active]="preset() === p.id" (click)="choose(p.id)">
                @if (preset() === p.id) {
                  <lucide-icon [img]="icons.Check" [size]="13" [strokeWidth]="3" />
                }
                {{ p.label }}
              </button>
            }
          </div>
        </div>

        <div class="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center xl:justify-end">
          @if (preset() === 'custom') {
            <div @fadeInUp class="flex items-center gap-2">
              <input type="date" class="input py-2" [ngModel]="customStart()" (ngModelChange)="customStart.set($event); applyCustom()" [max]="customEnd() || today()" aria-label="Start date" />
              <span class="text-slate-400">→</span>
              <input type="date" class="input py-2" [ngModel]="customEnd()" (ngModelChange)="customEnd.set($event); applyCustom()" [min]="customStart()" [max]="today()" aria-label="End date" />
            </div>
          } @else {
            <span class="hidden whitespace-nowrap text-xs font-medium text-slate-500 dark:text-slate-400 md:inline">{{ rangeLabel() }}</span>
          }
          <select class="input py-2 sm:w-52" [ngModel]="departmentId()" (ngModelChange)="departmentId.set($event); emit()" aria-label="Department filter">
            <option value="">All departments</option>
            @for (d of departments(); track d.id) {
              <option [value]="d.id">{{ d.name }}</option>
            }
          </select>
          <button type="button" class="btn btn-ai animate-glow-pulse shrink-0" (click)="summarize()" [disabled]="summarizing()">
            <lucide-icon [img]="summarizing() ? icons.LoaderCircle : icons.Sparkles" [size]="16" [class.animate-spin]="summarizing()" />
            {{ summarizing() ? 'Summarizing…' : '✨ Summarize with AI' }}
          </button>
        </div>
      </div>

      @if (summarizing() || summary()) {
        <div @expand>
          <div class="mt-4 rounded-2xl border border-violet-200/80 bg-gradient-to-br from-violet-50 via-white to-purple-50 p-4 dark:border-violet-500/25 dark:from-violet-500/10 dark:via-slate-900 dark:to-purple-500/5 sm:p-5">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <p class="flex items-center gap-2 text-sm font-bold text-violet-800 dark:text-violet-200">
                <lucide-icon [img]="icons.WandSparkles" [size]="16" /> AI insights · {{ rangeLabel() }}
              </p>
              <div class="flex items-center gap-2">
                <app-ai-badge />
                @if (summary() && !summarizing()) {
                  <button type="button" class="rounded-lg p-1.5 text-violet-400 transition hover:bg-violet-100 hover:text-violet-700 dark:hover:bg-violet-500/20" (click)="summary.set(null)" aria-label="Dismiss AI summary">
                    <lucide-icon [img]="icons.X" [size]="15" />
                  </button>
                }
              </div>
            </div>
            @if (summarizing()) {
              <div class="mt-3 space-y-2.5">
                @for (w of [92, 78, 85, 64]; track $index) {
                  <div class="ai-shimmer h-4 rounded-full" [style.width.%]="w"></div>
                }
              </div>
            } @else {
              @if (summary(); as s) {
              @if (s.bullets.length) {
                <ul class="mt-3 space-y-2.5" [@listStagger]="s.bullets.length">
                  @for (b of s.bullets; track $index) {
                    <li class="flex gap-2.5 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                      <span class="mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-300"><lucide-icon [img]="icons.Sparkles" [size]="11" /></span>
                      <span>{{ b }}</span>
                    </li>
                  }
                </ul>
              } @else {
                <p class="mt-3 text-sm text-slate-600 dark:text-slate-300">{{ s.message || 'No insights could be generated for this selection.' }}</p>
              }
              <p class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                @if (s.fallback) {
                  <span class="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300"><lucide-icon [img]="icons.Info" [size]="12" /> AI model unavailable — insights generated from rules over the live KPIs.</span>
                } @else if (s.grounded) {
                  <span class="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300"><lucide-icon [img]="icons.ShieldCheck" [size]="12" /> Every number verified against the live KPI data.</span>
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
          </div>
        </div>
      }
    </section>
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
