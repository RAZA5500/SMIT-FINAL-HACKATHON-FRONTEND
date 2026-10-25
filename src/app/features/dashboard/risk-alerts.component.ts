import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AbsenceAnomalies, AttritionRisk } from '../../core/models/api.models';
import { listStagger } from '../../shared/animations';
import { StatusBadgeComponent } from '../../shared/ui/badges';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';
import { Icons } from '../../shared/ui/icons';

/** Attrition-risk scores and absence-anomaly flags (bonus analytics). */
@Component({
  selector: 'app-risk-alerts',
  imports: [LucideAngularModule, RouterLink, StatusBadgeComponent, EmptyStateComponent],
  animations: [listStagger],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="card flex h-full flex-col p-5">
      <header class="mb-4 flex items-center gap-3">
        <span class="grid h-9 w-9 place-items-center rounded-xl bg-rose-500/10 text-rose-600 ring-1 ring-inset ring-rose-500/20 dark:text-rose-400">
          <lucide-icon [img]="icons.ShieldAlert" [size]="17" />
        </span>
        <div class="min-w-0">
          <h3 class="section-title">Attrition risk & anomaly alerts</h3>
          <p class="truncate text-xs text-slate-500 dark:text-slate-400">
            @if (risk(); as r) {
              {{ r.summary.high }} high · {{ r.summary.medium }} medium of {{ r.summary.evaluated }} evaluated
            }
          </p>
        </div>
      </header>

      @if (loading()) {
        <div class="space-y-2.5">
          @for (i of [1, 2, 3]; track i) {
            <div class="skeleton h-14"></div>
          }
        </div>
      } @else if (riskItems().length === 0 && anomalyItems().length === 0) {
        <app-empty-state [compact]="true" art="shield" tone="emerald" title="No alerts right now" description="Risk scores and absence patterns are computed from attendance, leave, tenure and pay once records exist." />
      } @else {
        <ul class="space-y-2" [@listStagger]="riskItems().length + anomalyItems().length">
          @for (r of riskItems(); track r.employeeId) {
            <li>
              <a [routerLink]="['/employees', r.employeeId]" class="group flex items-center gap-3 rounded-2xl border border-slate-100 p-3 transition hover:border-slate-200 hover:shadow-md dark:border-slate-800 dark:hover:border-slate-700">
                <span class="grid h-11 w-11 shrink-0 place-items-center rounded-xl font-mono text-sm font-extrabold" [class]="scoreClass(r.level)">{{ r.score }}</span>
                <span class="min-w-0 flex-1">
                  <span class="flex items-center gap-2">
                    <span class="truncate text-sm font-semibold text-slate-900 dark:text-white">{{ r.fullName }}</span>
                    <app-status-badge [status]="r.level" />
                  </span>
                  <span class="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">{{ r.department }} · {{ r.reasons.slice(0, 2).join(' · ') || 'No contributing factors' }}</span>
                </span>
                <lucide-icon [img]="icons.ChevronRight" [size]="16" class="text-slate-300 transition group-hover:translate-x-0.5" />
              </a>
            </li>
          }
          @for (a of anomalyItems(); track a.employeeId) {
            <li>
              <a [routerLink]="['/employees', a.employeeId]" class="group flex items-center gap-3 rounded-2xl border border-rose-100 bg-rose-50/40 p-3 transition hover:shadow-md dark:border-rose-500/20 dark:bg-rose-500/5">
                <span class="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400"><lucide-icon [img]="icons.TriangleAlert" [size]="18" /></span>
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-sm font-semibold text-slate-900 dark:text-white">{{ a.fullName || 'Employee' }} · {{ a.absentDays }} absent</span>
                  <span class="mt-0.5 block truncate text-xs text-rose-700 dark:text-rose-300">{{ a.flags.length ? a.flags[0].message : 'Unusual absence pattern' }}@if (a.flags.length > 1) { (+{{ a.flags.length - 1 }} more)}</span>
                </span>
              </a>
            </li>
          }
        </ul>
      }
    </section>
  `,
})
export class RiskAlertsComponent {
  readonly risk = input<AttritionRisk | null>(null);
  readonly anomalies = input<AbsenceAnomalies | null>(null);
  readonly loading = input(false);
  protected readonly icons = Icons;

  /** Only medium/high risk is alert-worthy. */
  protected readonly riskItems = computed(() => (this.risk()?.data ?? []).filter((r) => r.level !== 'low').slice(0, 4));
  protected readonly anomalyItems = computed(() => (this.anomalies()?.data ?? []).slice(0, 3));

  protected scoreClass(level: string): string {
    if (level === 'high') return 'bg-rose-500/15 text-rose-700 dark:text-rose-300';
    if (level === 'medium') return 'bg-amber-400/20 text-amber-800 dark:text-amber-300';
    return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300';
  }
}
