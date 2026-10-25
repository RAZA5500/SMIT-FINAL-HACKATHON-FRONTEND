import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { DashboardSummary } from '../../core/models/api.models';
import { AuthService } from '../../core/services/auth.service';
import { formatDate } from '../../core/utils/dates';
import { formatNumber, formatPercent } from '../../core/utils/format';
import { listStagger } from '../../shared/animations';
import { QuickCheckinComponent } from '../../shared/attendance/quick-checkin.component';
import { ChartCardComponent, ChartTable } from '../../shared/charts/chart-card.component';
import { BarChartComponent, LineChartComponent } from '../../shared/charts/charts';
import { AnnouncementFeedComponent } from '../../shared/domain/announcement-feed.component';
import { DayPipe, NumPipe } from '../../shared/pipes/format.pipes';
import { AvatarComponent } from '../../shared/ui/badges';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';
import { Icons } from '../../shared/ui/icons';
import { KpiCardComponent } from '../../shared/ui/kpi-card.component';

/** People-operations dashboard for HR. */
@Component({
  selector: 'app-hr-dashboard',
  imports: [
    LucideAngularModule,
    RouterLink,
    KpiCardComponent,
    ChartCardComponent,
    BarChartComponent,
    LineChartComponent,
    AnnouncementFeedComponent,
    QuickCheckinComponent,
    EmptyStateComponent,
    AvatarComponent,
    DayPipe,
    NumPipe,
  ],
  animations: [listStagger],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (!loading() && s()?.today?.headcount === 0 && (s()?.headcount?.total ?? 0) === 0) {
      <div class="mb-6">
        <app-empty-state art="team" tone="emerald" title="No employees registered yet" description="Register your first employee — a login with a temporary password is created automatically — or bulk-import a CSV with dry-run validation.">
          <button type="button" class="btn btn-primary" (click)="go('register')"><lucide-icon [img]="icons.UserPlus" [size]="16" /> Register employee</button>
          <button type="button" class="btn btn-secondary" (click)="go('import')"><lucide-icon [img]="icons.FileSpreadsheet" [size]="16" /> Import CSV</button>
        </app-empty-state>
      </div>
    }

    <div class="grid gap-6" [class]="auth.hasEmployeeProfile() ? 'xl:grid-cols-[minmax(0,1fr)_340px]' : ''">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5" [@listStagger]="5">
        <app-kpi-card label="Headcount" [value]="today()?.headcount" [icon]="icons.Users" tone="navy" hint="Active + probation today" [loading]="loading()" />
        <app-kpi-card label="Present today" [value]="today()?.present" [icon]="icons.CircleCheck" tone="emerald" [hint]="presentHint()" [loading]="loading()" />
        <app-kpi-card label="On leave today" [value]="today()?.onLeave" [icon]="icons.TreePalm" tone="amber" [hint]="leaveHint()" [loading]="loading()" />
        <app-kpi-card label="Late today" [value]="today()?.late" [icon]="icons.Clock" tone="blue" [hint]="lateHint()" [loading]="loading()" />
        <a routerLink="/leave" class="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500">
          <app-kpi-card label="Pending approvals" [value]="today()?.pendingApprovals?.total" [icon]="icons.Inbox" tone="amber" [hint]="pendingHint()" [loading]="loading()" />
        </a>
      </div>
      @if (auth.hasEmployeeProfile()) {
        <div class="xl:row-span-2">
          <app-quick-checkin />
        </div>
      }
    </div>

    <div class="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-5">
      <div class="xl:col-span-3">
        <app-chart-card
          title="Attendance trend"
          subtitle="Daily attendance rate (present + late + ½ half-days ÷ expected)"
          [icon]="icons.Activity"
          tone="amber"
          [loading]="loading()"
          [refreshing]="refreshing()"
          [empty]="trend().labels.length === 0"
          emptyTitle="No attendance recorded in this period"
          emptyText="The trend fills in as employees check in and days are closed."
          emptyArt="clock"
          [table]="trendTable()"
          [height]="270"
        >
          <app-line-chart series="amber" [labels]="trend().labels" [values]="trend().values" [max]="100" [format]="pct" [footer]="trendFooter" ariaLabel="Attendance trend" />
        </app-chart-card>
      </div>
      <div class="xl:col-span-2">
        <app-chart-card
          title="Leave by type"
          subtitle="Approved leave days in the period"
          [icon]="icons.TreePalm"
          tone="amber"
          [loading]="loading()"
          [refreshing]="refreshing()"
          [empty]="leaveTotal() === 0"
          emptyTitle="No approved leave in this period"
          emptyArt="calendar"
          [table]="leaveTable()"
          [height]="270"
        >
          <app-bar-chart series="amberBar" [labels]="leave().labels" [values]="leave().values" [footer]="leaveFooter" [format]="days" ariaLabel="Leave by type" />
        </app-chart-card>
      </div>
    </div>

    <div class="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
      <app-chart-card
        title="Absenteeism by department"
        subtitle="Absent days ÷ expected working days"
        [icon]="icons.CalendarX2"
        tone="rose"
        [loading]="loading()"
        [refreshing]="refreshing()"
        [empty]="absenteeism().labels.length === 0"
        emptyTitle="No absences to analyse yet"
        emptyText="Absence rates appear once working days have been closed."
        emptyArt="calendar"
        [table]="absenteeismTable()"
        [height]="chartHeight(absenteeism().labels.length)"
      >
        <app-bar-chart [horizontal]="true" series="rose" [labels]="absenteeism().labels" [values]="absenteeism().values" [format]="pct" ariaLabel="Absenteeism by department" />
      </app-chart-card>

      <section class="card flex flex-col p-5">
        <header class="mb-4 flex items-center gap-3">
          <span class="grid h-9 w-9 place-items-center rounded-xl bg-blue-500/10 text-blue-600 ring-1 ring-inset ring-blue-500/20 dark:text-blue-400"><lucide-icon [img]="icons.Timer" [size]="17" /></span>
          <div>
            <h3 class="section-title">Top 5 late-comers</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400">{{ s()?.lateComers?.totalLateArrivals ?? 0 }} late arrivals by {{ s()?.lateComers?.employeesWithLates ?? 0 }} people</p>
          </div>
        </header>
        @if (loading()) {
          <div class="space-y-2">
            @for (i of [1, 2, 3, 4, 5]; track i) {
              <div class="skeleton h-11"></div>
            }
          </div>
        } @else if ((s()?.lateComers?.data ?? []).length === 0) {
          <app-empty-state [compact]="true" art="clock" tone="blue" title="Nobody was late in this period" description="Late arrivals after the grace time are ranked here." />
        } @else {
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Employee</th>
                  <th class="text-right">Lates</th>
                  <th class="text-right">Avg late</th>
                  <th class="text-right">Last</th>
                </tr>
              </thead>
              <tbody [@listStagger]="s()!.lateComers.data.length">
                @for (l of s()!.lateComers.data; track l.employeeId; let i = $index) {
                  <tr class="row-click" [routerLink]="['/employees', l.employeeId]">
                    <td class="w-8 font-bold text-slate-400">{{ i + 1 }}</td>
                    <td>
                      <div class="flex items-center gap-2.5">
                        <app-avatar [name]="l.fullName" size="xs" />
                        <div class="min-w-0">
                          <p class="truncate font-semibold text-slate-900 dark:text-white">{{ l.fullName }}</p>
                          <p class="truncate text-xs text-slate-500 dark:text-slate-400">{{ l.code }} · {{ l.department }}</p>
                        </div>
                      </div>
                    </td>
                    <td class="num text-right"><span class="badge bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-400/25">{{ l.lateCount }}</span></td>
                    <td class="num text-right">{{ l.avgLateMinutes | num: 0 }} min</td>
                    <td class="num whitespace-nowrap text-right text-xs">{{ l.lastLateDate | day: 'short' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </section>
    </div>

    <div class="mt-6">
      <app-announcement-feed [limit]="3" />
    </div>
  `,
})
export class HrDashboardComponent {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly icons = Icons;

  readonly summary = input<DashboardSummary | null>(null);
  readonly loading = input(false);
  readonly refreshing = input(false);
  protected readonly s = this.summary;
  protected readonly today = computed(() => this.s()?.today ?? null);

  protected readonly pct = (n: number) => formatPercent(n, n % 1 === 0 ? 0 : 1);
  protected readonly days = (n: number) => `${formatNumber(n)}d`;

  protected readonly presentHint = computed(() => {
    const t = this.today();
    if (!t) return '';
    if (!t.isWorkingDay) return 'Today is not a working day';
    return `${t.onTime} on time · ${t.notCheckedIn} not checked in`;
  });
  protected readonly leaveHint = computed(() => {
    const byType = this.today()?.onLeaveByType ?? {};
    const parts = Object.entries(byType).map(([type, n]) => `${n} ${type}`);
    return parts.length ? parts.join(' · ') : 'No approved leave today';
  });
  protected readonly lateHint = computed(() => {
    const t = this.today();
    return t ? `${t.halfDay} half day${t.halfDay === 1 ? '' : 's'} so far` : '';
  });
  protected readonly pendingHint = computed(() => {
    const p = this.today()?.pendingApprovals;
    return p ? `${p.leave} leave · ${p.corrections} corrections` : '';
  });

  protected readonly trend = computed(() => {
    const data = this.s()?.attendanceTrend?.data ?? [];
    return { labels: data.map((d) => formatDate(d.date, 'short')), values: data.map((d) => d.attendanceRate) };
  });
  protected readonly trendFooter = (index: number) => {
    const d = this.s()?.attendanceTrend?.data[index];
    if (!d) return [];
    return [`${d.counts.present} present · ${d.counts.late} late · ${d.counts.half_day} half day`, `${d.counts.absent} absent · ${d.counts.on_leave} on leave`];
  };
  protected readonly trendTable = computed<ChartTable>(() => ({
    columns: ['Date', 'Attendance rate', 'Present', 'Late', 'Absent', 'On leave'],
    rows: (this.s()?.attendanceTrend?.data ?? []).map((d) => [
      formatDate(d.date),
      formatPercent(d.attendanceRate),
      d.counts.present,
      d.counts.late,
      d.counts.absent,
      d.counts.on_leave,
    ]),
  }));

  protected readonly leave = computed(() => {
    const rows = this.s()?.leaveUtilization?.byLeaveType ?? [];
    return { labels: rows.map((r) => r.leaveType), values: rows.map((r) => r.approvedDays) };
  });
  protected readonly leaveTotal = computed(() => this.leave().values.reduce((a, b) => a + b, 0));
  protected readonly leaveFooter = (index: number) => {
    const row = this.s()?.leaveUtilization?.byLeaveType[index];
    if (!row) return [];
    return [row.utilization === null ? 'Unlimited quota' : `${formatPercent(row.utilization)} of the annual quota pool`];
  };
  protected readonly leaveTable = computed<ChartTable>(() => ({
    columns: ['Leave type', 'Approved days', 'Utilization'],
    rows: (this.s()?.leaveUtilization?.byLeaveType ?? []).map((r) => [r.leaveType, r.approvedDays, r.utilization === null ? '—' : formatPercent(r.utilization)]),
  }));

  protected readonly absenteeism = computed(() => {
    const rows = this.s()?.absenteeism?.byDepartment ?? [];
    return { labels: rows.map((r) => r.department), values: rows.map((r) => r.absenteeismRate) };
  });
  protected readonly absenteeismTable = computed<ChartTable>(() => ({
    columns: ['Department', 'Absent days', 'Expected days', 'Rate'],
    rows: (this.s()?.absenteeism?.byDepartment ?? []).map((r) => [r.department, r.absentDays, r.expectedWorkingDays, formatPercent(r.absenteeismRate)]),
  }));

  protected chartHeight(rows: number): number {
    return Math.max(220, Math.min(420, rows * 38 + 40));
  }

  protected go(action: 'register' | 'import'): void {
    void this.router.navigate(['/employees'], { queryParams: { action } });
  }
}
