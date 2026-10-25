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
    <header class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="eyebrow flex items-center gap-2">
          {{ todayLabel() }}
          @if (auth.role(); as role) {
            <app-role-badge [role]="role" />
          }
        </p>
        <h1 class="page-title mt-1.5">{{ greeting() }}, {{ auth.firstName() }} <span class="inline-block origin-[70%_70%] animate-[wiggle_1.6s_ease-in-out_1]">👋</span></h1>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ intro() }}</p>
      </div>
      @if (auth.isEmployee()) {
        <button type="button" class="btn btn-ai self-start sm:self-auto" (click)="assistant.openDrawer()">
          <lucide-icon [img]="icons.Bot" [size]="16" /> Ask my assistant
        </button>
      }
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
