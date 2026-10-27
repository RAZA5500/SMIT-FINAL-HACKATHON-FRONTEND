import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { DashboardSummary } from '../../core/models/api.models';
import { PolicyStore } from '../../core/services/policy.store';
import { ThemeService } from '../../core/services/theme.service';
import { formatMonth } from '../../core/utils/dates';
import { formatCompact, formatMoney, formatNumber, formatPercent } from '../../core/utils/format';
import { AnnouncementFeedComponent } from '../../shared/domain/announcement-feed.component';
import { ChartCardComponent, ChartTable } from '../../shared/charts/chart-card.component';
import { TENURE_RAMP } from '../../shared/charts/chart-theme';
import { BarChartComponent } from '../../shared/charts/charts';
import { listStagger } from '../../shared/animations';
import { Icons } from '../../shared/ui/icons';
import { KpiCardComponent } from '../../shared/ui/kpi-card.component';
import { AuditFeedComponent } from './audit-feed.component';
import { GettingStartedComponent } from './getting-started.component';
import { RiskAlertsComponent } from './risk-alerts.component';

const GENDER_LABELS: Record<string, string> = { male: 'Male', female: 'Female', other: 'Other', unspecified: 'Not specified' };
const TENURE_LABELS: Record<string, string> = { '<6m': '< 6 months', '6-12m': '6–12 months', '1-3y': '1–3 years', '3-5y': '3–5 years', '5y+': '5+ years' };

/** Company-level dashboard for Admin. */
@Component({
  selector: 'app-admin-dashboard',
  imports: [KpiCardComponent, ChartCardComponent, BarChartComponent, AuditFeedComponent, RiskAlertsComponent, AnnouncementFeedComponent, GettingStartedComponent],
  animations: [listStagger],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-getting-started />

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" [@listStagger]="4">
      <app-kpi-card label="Headcount" [value]="s()?.headcount?.total" [icon]="icons.Users" tone="navy" [hint]="headcountHint()" [loading]="loading()" />
      <app-kpi-card label="Attrition YTD" format="percent" [value]="s()?.attritionYtd?.attritionRate" [icon]="icons.TrendingDown" tone="rose" [hint]="attritionHint()" [loading]="loading()" />
      <app-kpi-card label="Payroll cost" format="money" [value]="s()?.payrollCost?.totals?.gross" [icon]="icons.Banknote" tone="teal" [hint]="payrollHint()" [loading]="loading()" />
      <app-kpi-card label="Average salary" format="money" [value]="averageSalary()" [icon]="icons.Wallet" tone="teal" [hint]="averageHint()" [loading]="loading()" />
    </div>

    <div class="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
      <app-chart-card
        title="Headcount by department"
        subtitle="Active + probation on the end date"
        [loading]="loading()"
        [refreshing]="refreshing()"
        [empty]="headcountDept().labels.length === 0"
        emptyTitle="No employees yet"
        emptyText="Once HR registers employees, department headcount appears here."
        emptyArt="team"
        [table]="headcountTable()"
        [height]="chartHeight(headcountDept().labels.length)"
      >
        <app-bar-chart [horizontal]="true" series="ink" [labels]="headcountDept().labels" [values]="headcountDept().values" ariaLabel="Headcount by department" />
      </app-chart-card>

      <app-chart-card
        title="Payroll cost by department"
        [subtitle]="payrollSubtitle()"
        [loading]="loading()"
        [refreshing]="refreshing()"
        [empty]="payrollDept().labels.length === 0"
        emptyTitle="No payroll in this period"
        emptyText="Gross pay per department appears after HR generates a monthly payroll run."
        emptyArt="payroll"
        [table]="payrollTable()"
        [height]="chartHeight(payrollDept().labels.length)"
      >
        <app-bar-chart [horizontal]="true" series="ink" [labels]="payrollDept().labels" [values]="payrollDept().values" [format]="moneyCompact" ariaLabel="Payroll cost by department" />
      </app-chart-card>

      <app-chart-card
        title="Gender mix"
        subtitle="Headcount by gender"
        [loading]="loading()"
        [refreshing]="refreshing()"
        [empty]="genderTotal() === 0"
        emptyTitle="No headcount yet"
        emptyArt="team"
        [table]="genderTable()"
        [height]="210"
      >
        <app-bar-chart [horizontal]="true" series="ink" [labels]="gender().labels" [values]="gender().values" [footer]="genderFooter" ariaLabel="Gender mix" />
      </app-chart-card>

      <app-chart-card
        title="Tenure bands"
        subtitle="Longer tenure = deeper shade"
        [loading]="loading()"
        [refreshing]="refreshing()"
        [empty]="genderTotal() === 0"
        emptyTitle="No headcount yet"
        emptyArt="team"
        [table]="tenureTable()"
        [height]="210"
      >
        <app-bar-chart [labels]="tenure().labels" [values]="tenure().values" [colors]="tenureColors()" ariaLabel="Tenure bands" />
      </app-chart-card>
    </div>

    <div class="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
      <app-audit-feed />
      <app-risk-alerts [risk]="s()?.attritionRisk ?? null" [anomalies]="s()?.absenceAnomalies ?? null" [loading]="loading()" />
      <app-announcement-feed [limit]="4" />
    </div>
  `,
})
export class AdminDashboardComponent {
  private readonly policies = inject(PolicyStore);
  private readonly theme = inject(ThemeService);
  protected readonly icons = Icons;

  readonly summary = input<DashboardSummary | null>(null);
  readonly loading = input(false);
  readonly refreshing = input(false);
  protected readonly s = this.summary;
  protected readonly gettingStartedDone = signal(false);

  protected readonly moneyCompact = (n: number) => formatMoney(n, this.policies.currency(), true);

  protected readonly headcountHint = computed(() => {
    const h = this.s()?.headcount;
    return h ? `${formatNumber(h.active)} active · ${formatNumber(h.probation)} on probation` : '';
  });
  protected readonly attritionHint = computed(() => {
    const a = this.s()?.attritionYtd;
    return a ? `${a.exits} exit${a.exits === 1 ? '' : 's'} since Jan 1 · avg headcount ${formatNumber(a.averageHeadcount, 1)}` : '';
  });
  protected readonly payrollHint = computed(() => {
    const p = this.s()?.payrollCost;
    if (!p) return '';
    if (p.byMonth.length === 0) return 'No payroll run in this period yet';
    return `Gross · ${p.byMonth.length} month${p.byMonth.length === 1 ? '' : 's'} · net ${formatMoney(p.totals.net, this.policies.currency(), true)}`;
  });
  protected readonly averageSalary = computed(() => {
    const rows = this.s()?.averageSalary?.byDepartment ?? [];
    const people = rows.reduce((sum, r) => sum + r.employees, 0);
    if (!this.s()) return null;
    return people ? rows.reduce((sum, r) => sum + r.averageGross * r.employees, 0) / people : 0;
  });
  protected readonly averageHint = computed(() => {
    const source = this.s()?.averageSalary?.source;
    if (!source) return '';
    return source === 'payslips' ? 'Monthly gross, from payslips in range' : 'Monthly gross, from current salary structures';
  });

  protected readonly headcountDept = computed(() => {
    const rows = this.s()?.headcount?.byDepartment ?? [];
    return { labels: rows.map((r) => r.department), values: rows.map((r) => r.headcount) };
  });
  protected readonly headcountTable = computed<ChartTable>(() => ({
    columns: ['Department', 'Headcount'],
    rows: (this.s()?.headcount?.byDepartment ?? []).map((r) => [r.department, r.headcount]),
  }));

  protected readonly payrollDept = computed(() => {
    const byDept = new Map<string, number>();
    for (const r of this.s()?.payrollCost?.byMonthAndDepartment ?? []) byDept.set(r.department, (byDept.get(r.department) ?? 0) + r.gross);
    const rows = [...byDept.entries()].sort((a, b) => b[1] - a[1]);
    return { labels: rows.map((r) => r[0]), values: rows.map((r) => Math.round(r[1])) };
  });
  protected readonly payrollTable = computed<ChartTable>(() => ({
    columns: ['Department', 'Gross pay'],
    rows: this.payrollDept().labels.map((label, i) => [label, formatMoney(this.payrollDept().values[i], this.policies.currency())]),
  }));
  protected readonly payrollSubtitle = computed(() => {
    const p = this.s()?.payrollCost;
    if (!p) return 'Gross pay from payroll runs';
    return p.startMonth === p.endMonth ? `Gross pay · ${formatMonth(p.startMonth)}` : `Gross pay · ${formatMonth(p.startMonth, true)} – ${formatMonth(p.endMonth, true)}`;
  });

  protected readonly gender = computed(() => {
    const rows = (this.s()?.demographics?.gender ?? []).filter((g) => g.count > 0 || g.gender !== 'other');
    return { labels: rows.map((g) => GENDER_LABELS[g.gender] ?? g.gender), values: rows.map((g) => g.count) };
  });
  protected readonly genderTotal = computed(() => (this.s()?.demographics?.gender ?? []).reduce((sum, g) => sum + g.count, 0));
  protected readonly genderFooter = (index: number) => {
    const total = this.genderTotal();
    const value = this.gender().values[index] ?? 0;
    return total ? [`${formatPercent((value / total) * 100)} of headcount`] : [];
  };
  protected readonly genderTable = computed<ChartTable>(() => ({
    columns: ['Gender', 'Employees', 'Share'],
    rows: this.gender().labels.map((label, i) => [
      label,
      this.gender().values[i],
      this.genderTotal() ? formatPercent((this.gender().values[i] / this.genderTotal()) * 100) : '—',
    ]),
  }));

  protected readonly tenure = computed(() => {
    const rows = this.s()?.demographics?.tenure ?? [];
    return { labels: rows.map((t) => TENURE_LABELS[t.band] ?? t.band), values: rows.map((t) => t.count) };
  });
  protected readonly tenureColors = computed(() => (this.theme.isDark() ? TENURE_RAMP.dark : TENURE_RAMP.light));
  protected readonly tenureTable = computed<ChartTable>(() => ({
    columns: ['Tenure', 'Employees'],
    rows: this.tenure().labels.map((label, i) => [label, this.tenure().values[i]]),
  }));

  protected chartHeight(rows: number): number {
    return Math.max(200, Math.min(420, rows * 38 + 40));
  }

  protected compact(n: number): string {
    return formatCompact(n);
  }
}
