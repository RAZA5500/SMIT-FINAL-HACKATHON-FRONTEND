import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { Subscription, debounceTime, distinctUntilChanged } from 'rxjs';
import { CreateEmployeeResponse, Department, Designation, Employee, EmployeeStatus, PageMeta } from '../../core/models/api.models';
import { AuthService } from '../../core/services/auth.service';
import { EmployeeService } from '../../core/services/employee.service';
import { FileService } from '../../core/services/file.service';
import { OrgService } from '../../core/services/org.service';
import { safeStorage } from '../../core/utils/storage';
import { listStagger } from '../../shared/animations';
import { DayPipe, MoneyPipe } from '../../shared/pipes/format.pipes';
import { AvatarComponent, StatusBadgeComponent } from '../../shared/ui/badges';
import { Credentials, CredentialsDialogComponent } from '../../shared/ui/credentials-dialog.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';
import { Icons } from '../../shared/ui/icons';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { PaginationComponent } from '../../shared/ui/pagination.component';
import { CsvImportComponent } from './csv-import.component';
import { EmployeeFormComponent } from './employee-form.component';

type ViewMode = 'grid' | 'table';
const VIEW_KEY = 'hcm-employees-view';

/** M3 — employee directory with debounced search, filter pills, server-side pagination and grid/table views. */
@Component({
  selector: 'app-employees',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    LucideAngularModule,
    PageHeaderComponent,
    EmptyStateComponent,
    PaginationComponent,
    AvatarComponent,
    StatusBadgeComponent,
    EmployeeFormComponent,
    CsvImportComponent,
    CredentialsDialogComponent,
    DayPipe,
    MoneyPipe,
  ],
  animations: [listStagger],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './employees.component.html',
})
export class EmployeesComponent implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly api = inject(EmployeeService);
  private readonly org = inject(OrgService);
  private readonly files = inject(FileService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly icons = Icons;

  protected readonly statusFilters: { id: EmployeeStatus | ''; label: string }[] = [
    { id: '', label: 'All' },
    { id: 'active', label: 'Active' },
    { id: 'probation', label: 'Probation' },
    { id: 'exited', label: 'Exited' },
  ];

  protected readonly search = new FormControl('', { nonNullable: true });
  /** Debounced search term (signal mirror of the input). */
  protected readonly query = signal('');
  protected readonly status = signal<EmployeeStatus | ''>('');
  protected readonly departmentId = signal('');
  protected readonly designationId = signal('');
  protected readonly page = signal(1);
  protected readonly view = signal<ViewMode>((safeStorage.get(VIEW_KEY) as ViewMode) || 'grid');

  protected readonly employees = signal<Employee[]>([]);
  protected readonly meta = signal<PageMeta | null>(null);
  protected readonly loading = signal(true);
  protected readonly everLoaded = signal(false);
  protected readonly totalInCompany = signal<number | null>(null);
  protected readonly departments = signal<Department[]>([]);
  protected readonly designations = signal<Designation[]>([]);
  protected readonly exporting = signal(false);

  protected readonly formOpen = signal(false);
  protected readonly editing = signal<Employee | null>(null);
  protected readonly importOpen = signal(false);
  protected readonly credentials = signal<Credentials | null>(null);

  protected readonly canManage = computed(() => this.auth.isHr());
  protected readonly hasFilters = computed(() => !!(this.query() || this.status() || this.departmentId() || this.designationId()));
  protected readonly activeDepartments = computed(() => this.departments().filter((d) => d.isActive));

  private request: Subscription | null = null;

  ngOnInit(): void {
    this.org.departments(true).subscribe({ next: (d) => this.departments.set(d), error: () => undefined });
    this.org.designations(true).subscribe({ next: (d) => this.designations.set(d), error: () => undefined });

    // RxJS debounced search (300 ms) → server-side query.
    this.search.valueChanges.pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef)).subscribe((value) => {
      this.query.set(value.trim());
      this.page.set(1);
      this.load();
    });

    const action = this.route.snapshot.queryParamMap.get('action');
    if (this.canManage() && action === 'register') this.openRegister();
    if (this.canManage() && action === 'import') this.importOpen.set(true);
    if (action) void this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });

    this.load();
  }

  protected setStatus(status: EmployeeStatus | ''): void {
    this.status.set(status);
    this.page.set(1);
    this.load();
  }

  protected setDepartment(id: string): void {
    this.departmentId.set(this.departmentId() === id ? '' : id);
    this.page.set(1);
    this.load();
  }

  protected setDesignation(id: string): void {
    this.designationId.set(id);
    this.page.set(1);
    this.load();
  }

  protected clearFilters(): void {
    this.search.setValue('', { emitEvent: false });
    this.query.set('');
    this.status.set('');
    this.departmentId.set('');
    this.designationId.set('');
    this.page.set(1);
    this.load();
  }

  protected setView(view: ViewMode): void {
    this.view.set(view);
    safeStorage.set(VIEW_KEY, view);
    this.load();
  }

  protected goToPage(page: number): void {
    this.page.set(page);
    this.load();
  }

  protected openRegister(): void {
    this.editing.set(null);
    this.formOpen.set(true);
  }

  protected openEdit(employee: Employee, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.editing.set(employee);
    this.formOpen.set(true);
  }

  protected onCreated(res: CreateEmployeeResponse): void {
    this.formOpen.set(false);
    if (res.login.temporaryPassword) {
      this.credentials.set({ title: 'Employee registered', name: res.employee.fullName, email: res.login.email, temporaryPassword: res.login.temporaryPassword });
    }
    this.load();
  }

  protected onUpdated(): void {
    this.formOpen.set(false);
    this.load();
  }

  protected exportCsv(): void {
    this.exporting.set(true);
    this.files.download(
      this.api.exportCsv({ q: this.query() || undefined, status: this.status(), departmentId: this.departmentId() || undefined, designationId: this.designationId() || undefined }),
      'employees.csv',
      () => this.exporting.set(false),
    );
  }

  protected load(): void {
    this.request?.unsubscribe();
    this.loading.set(true);
    this.request = this.api
      .list({
        q: this.query() || undefined,
        status: this.status(),
        departmentId: this.departmentId() || undefined,
        designationId: this.designationId() || undefined,
        page: this.page(),
        limit: this.view() === 'grid' ? 12 : 20,
        sortBy: 'fullName',
        sortOrder: 'asc',
      })
      .subscribe({
        next: (res) => {
          this.employees.set(res.data);
          this.meta.set(res.meta);
          this.loading.set(false);
          this.everLoaded.set(true);
          if (!this.hasFilters()) this.totalInCompany.set(res.meta.total);
        },
        error: () => this.loading.set(false),
      });
  }
}
