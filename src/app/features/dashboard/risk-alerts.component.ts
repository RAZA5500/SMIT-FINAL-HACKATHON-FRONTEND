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
      <header class="mb-4">
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
        <app-empty-state [compact]="true" art="shield" title="No alerts right now" description="Risk scores and absence patterns are computed from attendance, leave, tenure and pay once records exist." />
      } @else {
        <ul class="space-y-2" [@listStagger]="riskItems().length + anomalyItems().length">
          @for (r of riskItems(); track r.employeeId) {
            <li>
              <a [routerLink]="['/employees', r.employeeId]" class="group flex items-center gap-3 rounded-lg border border-slate-200 p-3 transition-colors hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700">
                <span class="num grid h-9 w-9 shrink-0 place-items-center rounded-md bg-slate-100 text-sm font-semibold text-slate-800 dark:bg-slate-800 dark:text-slate-100" [title]="'Risk score ' + r.score + ' / 100'">{{ r.score }}</span>
                <span class="min-w-0 flex-1">
                  <span class="flex items-center gap-2">
                    <span class="truncate text-sm font-medium text-slate-900 dark:text-white">{{ r.fullName }}</span>
                    <app-status-badge [status]="r.level" />
                  </span>
                  <span class="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">{{ r.department }} · {{ r.reasons.slice(0, 2).join(' · ') || 'No contributing factors' }}</span>
                </span>
                <lucide-icon [img]="icons.ChevronRight" [size]="16" class="text-slate-300 dark:text-slate-600" />
              </a>
            </li>
          }
          @for (a of anomalyItems(); track a.employeeId) {
            <li>
              <a [routerLink]="['/employees', a.employeeId]" class="group flex items-center gap-3 rounded-lg border border-slate-200 p-3 transition-colors hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700">
                <span class="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-rose-50 text-rose-600 ring-1 ring-inset ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/25"><lucide-icon [img]="icons.TriangleAlert" [size]="16" /></span>
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-sm font-medium text-slate-900 dark:text-white">{{ a.fullName || 'Employee' }} · {{ a.absentDays }} absent</span>
                  <span class="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">{{ a.flags.length ? a.flags[0].message : 'Unusual absence pattern' }}@if (a.flags.length > 1) { (+{{ a.flags.length - 1 }} more)}</span>
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

}
