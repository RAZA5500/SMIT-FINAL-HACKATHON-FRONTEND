import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { PersonalDashboard } from '../../core/models/api.models';
import { AssistantStore } from '../../core/services/assistant.store';
import { CheckInStore } from '../../core/services/check-in.store';
import { DashboardService } from '../../core/services/dashboard.service';
import { FileService } from '../../core/services/file.service';
import { formatNumber } from '../../core/utils/format';
import { apiErrorMessage } from '../../core/utils/http';
import { listStagger } from '../../shared/animations';
import { QuickCheckinComponent } from '../../shared/attendance/quick-checkin.component';
import { AnnouncementFeedComponent } from '../../shared/domain/announcement-feed.component';
import { LeaveBalancesComponent } from '../../shared/domain/leave-balances.component';
import { MoneyPipe, MonthPipe } from '../../shared/pipes/format.pipes';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';
import { Icons } from '../../shared/ui/icons';
import { KpiCardComponent } from '../../shared/ui/kpi-card.component';
import { MeterComponent } from '../../shared/ui/progress';

/** Personal self-service dashboard (GET /api/dashboard/me). */
@Component({
  selector: 'app-employee-dashboard',
  imports: [
    LucideAngularModule,
    RouterLink,
    QuickCheckinComponent,
    LeaveBalancesComponent,
    AnnouncementFeedComponent,
    KpiCardComponent,
    MeterComponent,
    EmptyStateComponent,
    MoneyPipe,
    MonthPipe,
  ],
  animations: [listStagger],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (error()) {
      <div class="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">{{ error() }}</div>
    }

    <div class="grid grid-cols-1 gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <app-quick-checkin />

      <div class="flex flex-col gap-4">
        <!-- Hours this week vs 40h -->
        <section class="card relative overflow-hidden p-5">
          <div class="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-teal-400/20 blur-3xl"></div>
          <div class="relative flex flex-wrap items-end justify-between gap-3">
            <div>
              <p class="text-[13px] font-medium text-slate-500 dark:text-slate-400">Hours this week</p>
              @if (data(); as d) {
                <p class="mt-1.5 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  {{ hours(d.week.hoursWorked) }}<span class="text-lg font-bold text-slate-400"> / {{ d.week.targetHours }}h</span>
                </p>
              } @else {
                <div class="skeleton mt-2 h-8 w-32"></div>
              }
            </div>
            <span class="rounded-full bg-teal-500/10 px-3 py-1 text-xs font-bold text-teal-700 dark:text-teal-300">{{ data()?.week?.progressPercent ?? 0 }}% of target</span>
          </div>
          <div class="relative mt-4">
            <app-meter [value]="(data()?.week?.progressPercent ?? 0) / 100" tone="teal" />
          </div>
          <p class="relative mt-2 text-xs text-slate-500 dark:text-slate-400">Counted from Monday, including today's open session.</p>
        </section>

        <div class="grid grid-cols-2 gap-4 lg:grid-cols-4" [@listStagger]="4">
          <app-kpi-card label="Late this month" [value]="data()?.month?.lateCount" [icon]="icons.Clock" tone="blue" [loading]="!data()" />
          <app-kpi-card label="Present days" [value]="data()?.month?.present" [icon]="icons.CircleCheck" tone="emerald" [loading]="!data()" />
          <app-kpi-card label="Half days" [value]="data()?.month?.halfDays" [icon]="icons.Timer" tone="orange" [loading]="!data()" />
          <app-kpi-card label="Absent" [value]="data()?.month?.absent" [icon]="icons.CalendarX2" tone="rose" [loading]="!data()" />
        </div>
      </div>
    </div>

    <section class="mt-6">
      <div class="mb-3 flex items-center justify-between">
        <h2 class="section-title">Leave balance</h2>
        <a routerLink="/leave" class="btn btn-ghost btn-sm">Apply for leave <lucide-icon [img]="icons.ArrowRight" [size]="14" /></a>
      </div>
      @if (data(); as d) {
        @if (d.leaveBalances.length) {
          <app-leave-balances [balances]="d.leaveBalances" />
        } @else {
          <app-empty-state [compact]="true" art="calendar" tone="amber" title="No leave types configured" description="Your Admin hasn't set up leave quotas yet." />
        }
      } @else {
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          @for (i of [1, 2, 3, 4]; track i) {
            <div class="skeleton h-32"></div>
          }
        </div>
      }
    </section>

    <div class="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
      <section class="card relative flex flex-col overflow-hidden p-5">
        <div class="pointer-events-none absolute -bottom-16 -right-16 h-48 w-48 rounded-full bg-emerald-400/20 blur-3xl"></div>
        <header class="relative mb-4 flex items-center gap-3">
          <span class="grid h-9 w-9 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 ring-1 ring-inset ring-emerald-500/20 dark:text-emerald-400"><lucide-icon [img]="icons.Receipt" [size]="17" /></span>
          <h3 class="section-title">Last payslip</h3>
        </header>
        @if (data(); as d) {
          @if (d.lastPayslip; as p) {
            <div class="relative flex-1">
              <p class="text-sm text-slate-500 dark:text-slate-400">{{ p.month | month }}</p>
              <p class="mt-1 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">{{ p.netPay | money: p.currency }}</p>
              <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Net pay · gross {{ p.gross | money: p.currency }}</p>
            </div>
            <div class="relative mt-5 flex gap-2">
              <button type="button" class="btn btn-primary flex-1" (click)="files.downloadPayslip(p.id, p.month)" [disabled]="files.downloadingPayslip() === p.id">
                <lucide-icon [img]="files.downloadingPayslip() === p.id ? icons.LoaderCircle : icons.Download" [size]="16" [class.animate-spin]="files.downloadingPayslip() === p.id" /> Download PDF
              </button>
              <a routerLink="/payroll" class="btn btn-secondary">All payslips</a>
            </div>
          } @else {
            <app-empty-state [compact]="true" art="payroll" tone="emerald" title="No payslip yet" description="Your payslip appears here once HR prepares payroll and Admin finalizes the month." />
          }
        } @else {
          <div class="skeleton h-32"></div>
        }
      </section>

      <section class="card relative overflow-hidden bg-gradient-to-br from-violet-600 via-purple-600 to-violet-800 p-5 text-white">
        <div class="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl"></div>
        <span class="grid h-11 w-11 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/25"><lucide-icon [img]="icons.Bot" [size]="22" /></span>
        <h3 class="mt-4 text-lg font-bold">Ask My Assistant</h3>
        <p class="mt-1 text-sm text-violet-100">“Meri casual leave kitni bachi hai?” · “When is the next holiday?” — answers from your own records.</p>
        <button type="button" class="btn mt-5 w-full bg-white text-violet-700 shadow-lg hover:bg-violet-50" (click)="assistant.openDrawer()">
          <lucide-icon [img]="icons.Sparkles" [size]="16" /> Ask my assistant
        </button>
      </section>

      <app-announcement-feed [items]="data()?.announcements" [limit]="3" />
    </div>
  `,
})
export class EmployeeDashboardComponent {
  private readonly dashboard = inject(DashboardService);
  private readonly checkIn = inject(CheckInStore);
  protected readonly assistant = inject(AssistantStore);
  protected readonly files = inject(FileService);
  protected readonly icons = Icons;

  protected readonly data = signal<PersonalDashboard | null>(null);
  protected readonly error = signal('');

  constructor() {
    // Reload after every check-in/out so hours and counts stay live.
    effect(() => {
      this.checkIn.version();
      untracked(() => this.load());
    });
  }

  protected hours(value: number): string {
    return `${formatNumber(value, 1)}h`;
  }

  private load(): void {
    this.dashboard.personal().subscribe({
      next: (data) => {
        this.data.set(data);
        this.error.set('');
      },
      error: (err) => this.error.set(apiErrorMessage(err)),
    });
  }

  protected readonly unread = computed(() => this.data()?.unreadNotifications ?? 0);
}
