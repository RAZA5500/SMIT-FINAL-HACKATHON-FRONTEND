import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { LucideAngularModule } from 'lucide-angular';
import { catchError, filter, of, switchMap, tap } from 'rxjs';
import { DashboardFilters, DashboardSummary, Department } from '../../core/models/api.models';
import { AssistantStore } from '../../core/services/assistant.store';
import { AuthService } from '../../core/services/auth.service';
import { ClockService } from '../../core/services/clock.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { OrgService } from '../../core/services/org.service';
import { PolicyStore } from '../../core/services/policy.store';
import { ToastService } from '../../core/services/toast.service';
import { formatDate, minutesNowIn } from '../../core/utils/dates';
import { apiErrorMessage } from '../../core/utils/http';
import { RoleBadgeComponent } from '../../shared/ui/badges';
import { Icons } from '../../shared/ui/icons';
import { AdminDashboardComponent } from './admin-dashboard.component';
import { EmployeeDashboardComponent } from './employee-dashboard.component';
import { FilterRibbonComponent } from './filter-ribbon.component';
import { HrDashboardComponent } from './hr-dashboard.component';

/** Role-specific dashboards: Admin (company), HR (people ops), Employee (personal). */
@Component({
  selector: 'app-dashboard',
  imports: [LucideAngularModule, RoleBadgeComponent, FilterRibbonComponent, AdminDashboardComponent, HrDashboardComponent, EmployeeDashboardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header
      class="relative isolate mb-6 overflow-hidden rounded-2xl border border-slate-200/80 bg-white/80 p-6 shadow-card backdrop-blur-sm dark:border-white/[0.06] dark:bg-slate-900/70 sm:p-8"
    >
      <!-- mesh -->
      <div aria-hidden="true" class="pointer-events-none absolute inset-0 -z-10">
        <div class="absolute -left-16 -top-24 h-64 w-64 animate-aurora rounded-full bg-blue-300/40 blur-3xl dark:bg-blue-500/20"></div>
        <div class="absolute -bottom-28 left-1/3 h-56 w-72 animate-aurora rounded-full bg-indigo-200/40 blur-3xl [animation-delay:-7s] dark:bg-indigo-500/10"></div>
        <div class="absolute -right-10 -top-16 h-64 w-64 animate-aurora rounded-full bg-violet-300/40 blur-3xl [animation-delay:-14s] dark:bg-violet-500/20"></div>
        <div class="absolute inset-0 bg-grid-light bg-[size:24px_24px] [mask-image:linear-gradient(to_left,black,transparent_70%)] dark:bg-grid-dark"></div>
      </div>
      <!-- orbit ornament -->
      <div aria-hidden="true" class="pointer-events-none absolute right-8 top-1/2 hidden h-40 w-40 -translate-y-1/2 lg:block">
        <div class="absolute inset-0 rounded-full border border-blue-500/20"></div>
        <div class="absolute inset-5 rounded-full border border-violet-500/20"></div>
        <div class="absolute inset-0 animate-radar-sweep [animation-duration:14s]">
          <span class="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-brand-gradient shadow-glow-brand"></span>
        </div>
        <div class="absolute inset-5 animate-radar-sweep [animation-direction:reverse] [animation-duration:10s]">
          <span class="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-violet-500 shadow-glow-violet"></span>
        </div>
        <div class="absolute inset-12 grid place-items-center rounded-full bg-white/70 shadow-card ring-1 ring-slate-200/70 backdrop-blur dark:bg-slate-900/70 dark:ring-white/10">
          <lucide-icon [img]="heroIcon()" [size]="26" class="text-blue-600 dark:text-blue-400" />
        </div>
      </div>

      <div class="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between lg:pr-48">
        <div class="min-w-0">
          <p class="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            <span class="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/70 px-2.5 py-1 dark:border-white/10 dark:bg-white/[0.04]">
              <lucide-icon [img]="icons.CalendarDays" [size]="13" /> {{ todayLabel() }}
            </span>
            @if (auth.role(); as role) {
              <app-role-badge [role]="role" />
            }
          </p>
          <h1 class="mt-3 text-[1.75rem] font-semibold leading-tight tracking-tight text-slate-900 dark:text-white sm:text-[2.125rem]">
            {{ greeting() }}, <span class="text-gradient">{{ auth.firstName() }}</span>
          </h1>
          <p class="mt-2 max-w-xl text-sm leading-relaxed text-slate-500 dark:text-slate-400 sm:text-[15px]">{{ intro() }}</p>
        </div>
        @if (auth.isEmployee()) {
          <button type="button" class="btn btn-ai self-start sm:self-auto" (click)="assistant.openDrawer()">
            <lucide-icon [img]="icons.Sparkles" [size]="15" /> Ask my assistant
          </button>
        }
      </div>
    </header>

    @if (auth.isManager()) {
      <app-filter-ribbon [departments]="departments()" (filtersChange)="filters.set($event)" />
      @if (auth.isAdmin()) {
        <app-admin-dashboard [summary]="summary()" [loading]="loading()" [refreshing]="refreshing()" />
      } @else {
        <app-hr-dashboard [summary]="summary()" [loading]="loading()" [refreshing]="refreshing()" />
      }
    } @else {
      <app-employee-dashboard />
    }
  `,
})
export class DashboardComponent {
  protected readonly auth = inject(AuthService);
  protected readonly assistant = inject(AssistantStore);
  private readonly api = inject(DashboardService);
  private readonly org = inject(OrgService);
  private readonly policies = inject(PolicyStore);
  private readonly clock = inject(ClockService);
  private readonly toast = inject(ToastService);
  protected readonly icons = Icons;

  protected readonly filters = signal<DashboardFilters | null>(null);
  protected readonly summary = signal<DashboardSummary | null>(null);
  protected readonly loading = signal(true);
  protected readonly refreshing = signal(false);
  protected readonly departments = signal<Department[]>([]);

  protected readonly todayLabel = computed(() => {
    this.policies.policies();
    return formatDate(this.policies.today(), 'long');
  });

  protected readonly greeting = computed(() => {
    const minutes = minutesNowIn(this.policies.timezone(), this.clock.now());
    if (minutes < 12 * 60) return 'Good morning';
    if (minutes < 17 * 60) return 'Good afternoon';
    return 'Good evening';
  });

  protected readonly heroIcon = computed(() => {
    switch (this.auth.role()) {
      case 'Admin':
        return Icons.Building2;
      case 'HR':
        return Icons.Users;
      default:
        return Icons.Sparkles;
    }
  });

  protected readonly intro = computed(() => {
    switch (this.auth.role()) {
      case 'Admin':
        return 'Company-wide headcount, attrition, payroll and activity — all live from the database.';
      case 'HR':
        return "Today's attendance, approvals and people trends at a glance.";
      default:
        return 'Your day, your hours, your leave and payslips in one place.';
    }
  });

  constructor() {
    if (this.auth.isManager()) {
      this.org.departments().subscribe({ next: (d) => this.departments.set(d), error: () => undefined });
      toObservable(this.filters)
        .pipe(
          filter((f): f is DashboardFilters => f !== null),
          tap(() => (this.summary() ? this.refreshing.set(true) : this.loading.set(true))),
          switchMap((f) =>
            this.api.summary(f).pipe(
              catchError((err) => {
                this.toast.error('Dashboard unavailable', apiErrorMessage(err));
                return of(null);
              }),
            ),
          ),
          takeUntilDestroyed(),
        )
        .subscribe((summary) => {
          if (summary) this.summary.set(summary);
          this.loading.set(false);
          this.refreshing.set(false);
        });
    }
  }
}
