import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { Observable, map } from 'rxjs';
import { AbsenceAnomalies, AttendanceRecord, AttritionRisk, Department, Designation, Employee, Employee360, Payslip } from '../../core/models/api.models';
import { AttendanceService } from '../../core/services/attendance.service';
import { AuthService } from '../../core/services/auth.service';
import { CheckInStore } from '../../core/services/check-in.store';
import { DashboardService } from '../../core/services/dashboard.service';
import { EmployeeService } from '../../core/services/employee.service';
import { FileService } from '../../core/services/file.service';
import { OrgService } from '../../core/services/org.service';
import { PolicyStore } from '../../core/services/policy.store';
import { ToastService } from '../../core/services/toast.service';
import { addDays, endOfMonth, monthOf, tenureLabel } from '../../core/utils/dates';
import { formatMoney, formatPercent } from '../../core/utils/format';
import { apiErrorMessage, apiStatus } from '../../core/utils/http';
import { PHONE_REGEX } from '../../core/utils/validators';
import { fadeInUp, listStagger } from '../../shared/animations';
import { AttendanceCalendarComponent } from '../../shared/domain/attendance-calendar.component';
import { LeaveBalancesComponent } from '../../shared/domain/leave-balances.component';
import { PayslipViewerComponent } from '../../shared/domain/payslip-viewer.component';
import { AgoPipe, DayPipe, MoneyPipe, MonthPipe, PercentPipe } from '../../shared/pipes/format.pipes';
import { AvatarComponent, RoleBadgeComponent, StatusBadgeComponent } from '../../shared/ui/badges';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';
import { FieldErrorComponent } from '../../shared/ui/field-error.component';
import { Icons } from '../../shared/ui/icons';
import { GaugeComponent } from '../../shared/ui/progress';
import { SegmentedTabsComponent, TabItem } from '../../shared/ui/segmented-tabs.component';
import { EmployeeFormComponent } from './employee-form.component';

type Tab = 'info' | 'attendance' | 'leave' | 'salary' | 'payslips';

/** Employee 360: header with risk gauge + anomaly flags, and five profile tabs. */
@Component({
  selector: 'app-employee-360',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    LucideAngularModule,
    SegmentedTabsComponent,
    AvatarComponent,
    StatusBadgeComponent,
    RoleBadgeComponent,
    GaugeComponent,
    EmptyStateComponent,
    FieldErrorComponent,
    AttendanceCalendarComponent,
    LeaveBalancesComponent,
    PayslipViewerComponent,
    EmployeeFormComponent,
    DayPipe,
    MoneyPipe,
    MonthPipe,
    PercentPipe,
    AgoPipe,
  ],
  animations: [fadeInUp, listStagger],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './employee-360.component.html',
})
export class Employee360Component {
  protected readonly auth = inject(AuthService);
  private readonly api = inject(EmployeeService);
  private readonly attendance = inject(AttendanceService);
  private readonly dashboard = inject(DashboardService);
  private readonly org = inject(OrgService);
  private readonly policies = inject(PolicyStore);
  private readonly checkIn = inject(CheckInStore);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  protected readonly files = inject(FileService);
  protected readonly icons = Icons;

  /** Route param (`/employees/:id`); undefined on `/profile`. */
  readonly id = input<string | undefined>(undefined);

  protected readonly tabs: TabItem[] = [
    { id: 'info', label: 'Job & Personal Info', icon: Icons.UserRound },
    { id: 'attendance', label: 'Attendance Calendar', icon: Icons.CalendarCheck },
    { id: 'leave', label: 'Leave Balances', icon: Icons.TreePalm },
    { id: 'salary', label: 'Salary Breakdown', icon: Icons.Banknote },
    { id: 'payslips', label: 'Payslips', icon: Icons.Receipt },
  ];
  protected readonly tab = signal<Tab>('info');

  protected readonly profile = signal<Employee360 | null>(null);
  protected readonly loading = signal(true);
  protected readonly notFound = signal(false);
  protected readonly risk = signal<AttritionRisk['data'][number] | null>(null);
  protected readonly anomaly = signal<AbsenceAnomalies['data'][number] | null>(null);
  protected readonly riskLoaded = signal(false);

  protected readonly month = signal(monthOf(this.policies.today()));
  protected readonly records = signal<AttendanceRecord[]>([]);
  protected readonly recordsLoading = signal(false);

  protected readonly viewing = signal<Payslip | null>(null);
  protected readonly editOpen = signal(false);
  protected readonly departments = signal<Department[]>([]);
  protected readonly designations = signal<Designation[]>([]);

  protected readonly editingContact = signal(false);
  protected readonly savingContact = signal(false);
  protected readonly contactForm = this.fb.nonNullable.group({
    phone: ['', Validators.pattern(PHONE_REGEX)],
    address: ['', Validators.maxLength(300)],
  });

  protected readonly employee = computed(() => this.profile()?.employee ?? null);
  /** Own profile: `/profile`, or an HR user opening their own record. */
  protected readonly isOwn = computed(() => !this.id() || this.id() === this.auth.employeeId());
  protected readonly isManagerView = computed(() => this.auth.isManager() && !!this.id());
  protected readonly canEditJob = computed(() => this.auth.isHr() && !!this.id() && this.id() !== this.auth.employeeId());
  protected readonly tenure = computed(() => {
    const e = this.employee();
    return e ? tenureLabel(e.joinDate, e.exitDate && e.exitDate < this.policies.today() ? e.exitDate : this.policies.today()) : '';
  });
  protected readonly salary = computed(() => this.profile()?.payroll.salaryStructure ?? null);
  protected readonly netMonthly = computed(() => {
    const s = this.salary();
    return s ? s.gross - s.monthlyTax : 0;
  });
  protected readonly salarySegments = computed(() => {
    const s = this.salary();
    if (!s || !s.gross) return [];
    return [
      { label: 'Basic', value: s.basic, cls: 'bg-indigo-600' },
      { label: 'HRA', value: s.hra, cls: 'bg-indigo-400' },
      { label: 'Medical', value: s.medical, cls: 'bg-blue-300' },
    ].map((seg) => ({ ...seg, pct: (seg.value / s.gross) * 100 }));
  });
  protected readonly monthStats = computed(() => {
    const m = this.profile()?.attendance.currentMonth;
    if (!m) return [];
    return [
      { label: 'Attendance rate', value: formatPercent(m.attendanceRate), tone: 'text-blue-600 dark:text-blue-400' },
      { label: 'Present', value: String(m.counts.present), tone: 'text-slate-900 dark:text-white' },
      { label: 'Late', value: String(m.counts.late), tone: 'text-blue-600 dark:text-blue-400' },
      { label: 'Absent', value: String(m.counts.absent), tone: 'text-rose-600 dark:text-rose-400' },
      { label: 'On leave', value: String(m.counts.on_leave), tone: 'text-amber-600 dark:text-amber-400' },
    ];
  });

  constructor() {
    effect(() => {
      const id = this.id();
      untracked(() => this.load(id));
    });
    effect(() => {
      const month = this.month();
      const employee = this.employee();
      this.checkIn.version();
      if (employee) untracked(() => this.loadMonth(month, employee.id));
    });
  }

  protected setTab(tab: string): void {
    this.tab.set(tab as Tab);
  }

  protected startContactEdit(): void {
    const e = this.employee();
    this.contactForm.reset({ phone: e?.phone ?? '', address: e?.address ?? '' });
    this.editingContact.set(true);
  }

  protected saveContact(): void {
    this.contactForm.markAllAsTouched();
    if (this.contactForm.invalid) return;
    const v = this.contactForm.getRawValue();
    this.savingContact.set(true);
    this.api.updateMyContact({ ...(v.phone.trim() ? { phone: v.phone.trim() } : {}), address: v.address.trim() }).subscribe({
      next: (employee) => {
        this.savingContact.set(false);
        this.editingContact.set(false);
        this.profile.update((p) => (p ? { ...p, employee } : p));
        this.toast.success('Contact details updated');
      },
      error: (err) => {
        this.savingContact.set(false);
        this.toast.error('Could not update', apiErrorMessage(err));
      },
    });
  }

  protected openEdit(): void {
    if (this.departments().length === 0) this.org.departments(true).subscribe((d) => this.departments.set(d));
    if (this.designations().length === 0) this.org.designations(true).subscribe((d) => this.designations.set(d));
    this.editOpen.set(true);
  }

  protected onUpdated(employee: Employee): void {
    this.editOpen.set(false);
    this.profile.update((p) => (p ? { ...p, employee } : p));
    this.load(this.id());
  }

  protected requestCorrection(date: string): void {
    this.checkIn.openCorrection({ date });
  }

  protected flagsText(anomaly: AbsenceAnomalies['data'][number]): string {
    return anomaly.flags.map((f) => f.message).join(' · ');
  }

  protected riskFactorWidth(contribution: number, weight: number): number {
    return weight ? Math.round((contribution / weight) * 100) : 0;
  }

  protected money(value: number): string {
    return formatMoney(value, this.policies.currency());
  }

  private load(id: string | undefined): void {
    this.loading.set(true);
    this.notFound.set(false);
    this.risk.set(null);
    this.anomaly.set(null);
    this.riskLoaded.set(false);
    const request: Observable<Employee360> = id ? this.api.profile(id) : this.api.myProfile();
    request.subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.loading.set(false);
        if (this.auth.isManager() && id) this.loadRisk(profile.employee);
      },
      error: (err) => {
        this.loading.set(false);
        if (apiStatus(err) === 404 || apiStatus(err) === 400) this.notFound.set(true);
        else this.toast.error('Could not load profile', apiErrorMessage(err));
      },
    });
  }

  /** Bonus analytics for Admin/HR: risk score and anomaly flags over the last 90 days. */
  private loadRisk(employee: Employee): void {
    const endDate = this.policies.today();
    const query = { departmentId: employee.departmentId, startDate: addDays(endDate, -89), endDate, limit: 100 };
    this.dashboard.attritionRisk(query).subscribe({
      next: (res) => {
        this.risk.set(res.data.find((r) => r.employeeId === employee.id) ?? null);
        this.riskLoaded.set(true);
      },
      error: () => this.riskLoaded.set(true),
    });
    this.dashboard.absenceAnomalies(query).subscribe({
      next: (res) => this.anomaly.set(res.data.find((a) => a.employeeId === employee.id) ?? null),
      error: () => undefined,
    });
  }

  private loadMonth(month: string, employeeId: string): void {
    const from = `${month}-01`;
    const to = endOfMonth(month);
    this.recordsLoading.set(true);
    const request: Observable<AttendanceRecord[]> = this.isOwn()
      ? this.attendance.mine(from, to).pipe(map((r) => r.data))
      : this.attendance.list({ employeeId, from, to, limit: 100 }).pipe(map((r) => r.data));
    request.subscribe({
      next: (records) => {
        this.records.set(records);
        this.recordsLoading.set(false);
      },
      error: () => this.recordsLoading.set(false),
    });
  }

  protected back(): void {
    void this.router.navigate(['/employees']);
  }
}
