import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { PageMeta, Role, UserAccount } from '../../core/models/api.models';
import { AuthService } from '../../core/services/auth.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { ToastService } from '../../core/services/toast.service';
import { UsersService } from '../../core/services/users.service';
import { apiErrorMessage } from '../../core/utils/http';
import { passwordPolicy } from '../../core/utils/validators';
import { listStagger } from '../../shared/animations';
import { AgoPipe } from '../../shared/pipes/format.pipes';
import { AvatarComponent, RoleBadgeComponent, StatusBadgeComponent } from '../../shared/ui/badges';
import { Credentials, CredentialsDialogComponent } from '../../shared/ui/credentials-dialog.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';
import { FieldErrorComponent } from '../../shared/ui/field-error.component';
import { Icons } from '../../shared/ui/icons';
import { ModalComponent } from '../../shared/ui/modal.component';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { PaginationComponent } from '../../shared/ui/pagination.component';

/** Admin: create HR logins, deactivate / reactivate, reset passwords, promote or demote roles. */
@Component({
  selector: 'app-users',
  imports: [
    ReactiveFormsModule,
    LucideAngularModule,
    PageHeaderComponent,
    ModalComponent,
    EmptyStateComponent,
    FieldErrorComponent,
    PaginationComponent,
    AvatarComponent,
    RoleBadgeComponent,
    StatusBadgeComponent,
    CredentialsDialogComponent,
    AgoPipe,
  ],
  animations: [listStagger],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header title="Logins & Access" subtitle="Every sign-in account. Employee logins are created automatically when HR registers someone.">
      <button type="button" class="btn btn-primary" (click)="openCreate()"><lucide-icon [img]="icons.UserPlus" [size]="16" /> Create HR login</button>
    </app-page-header>

    <div class="card mb-4 flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
      <div class="relative flex-1">
        <span class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"><lucide-icon [img]="icons.Search" [size]="16" /></span>
        <input class="input pl-10" [formControl]="search" placeholder="Search by name or email…" aria-label="Search logins" />
      </div>
      <div class="scroll-thin flex gap-1.5 overflow-x-auto">
        @for (r of roleFilters; track r.id) {
          <button type="button" class="pill" [class.pill-active]="role() === r.id" (click)="setRole(r.id)">{{ r.label }}</button>
        }
      </div>
    </div>

    <div class="card overflow-hidden">
      @if (loading() && users().length === 0) {
        <div class="space-y-2 p-4">
          @for (i of [1, 2, 3, 4]; track i) {
            <div class="skeleton h-14"></div>
          }
        </div>
      } @else if (users().length === 0) {
        <app-empty-state art="team" [title]="search.value || role() ? 'No logins match these filters' : 'Only your Admin login exists'" description="Create an HR login so people operations can start registering employees.">
          <button type="button" class="btn btn-primary" (click)="openCreate()"><lucide-icon [img]="icons.UserPlus" [size]="16" /> Create HR login</button>
        </app-empty-state>
      } @else {
        <div class="table-wrap" [class.opacity-60]="loading()">
          <table class="data-table">
            <thead>
              <tr>
                <th>Account</th>
                <th>Role</th>
                <th>Status</th>
                <th class="hidden lg:table-cell">Last sign-in</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody [@listStagger]="users().length">
              @for (u of users(); track u.id) {
                <tr>
                  <td>
                    <div class="flex items-center gap-3">
                      <app-avatar [name]="u.fullName" size="sm" />
                      <div class="min-w-0">
                        <p class="truncate font-semibold text-slate-900 dark:text-white">{{ u.fullName }}@if (u.id === auth.user()?.id) {<span class="ml-1.5 text-xs font-medium text-slate-400">(you)</span>}</p>
                        <p class="truncate text-xs text-slate-500 dark:text-slate-400">{{ u.email }}</p>
                      </div>
                    </div>
                  </td>
                  <td><app-role-badge [role]="u.role" /></td>
                  <td>
                    <div class="flex flex-wrap gap-1">
                      <app-status-badge [status]="u.isActive ? 'active' : 'inactive'" />
                      @if (u.mustChangePassword) {
                        <span class="badge bg-white text-slate-700 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700"><span class="h-1.5 w-1.5 rounded-full bg-amber-500"></span> Temp password</span>
                      }
                    </div>
                  </td>
                  <td class="hidden whitespace-nowrap text-xs lg:table-cell">{{ u.lastLoginAt ? (u.lastLoginAt | ago) : 'Never' }}</td>
                  <td class="whitespace-nowrap text-right">
                    @if (u.role !== 'Admin' && u.id !== auth.user()?.id) {
                      <button type="button" class="btn btn-ghost btn-sm" (click)="reset(u)" title="Reset password"><lucide-icon [img]="icons.RotateCcw" [size]="14" /> <span class="hidden xl:inline">Reset</span></button>
                      @if (u.role === 'Employee') {
                        <button type="button" class="btn btn-ghost btn-sm" (click)="changeRole(u, 'HR')" title="Promote to HR"><lucide-icon [img]="icons.UserCog" [size]="14" /> <span class="hidden xl:inline">Make HR</span></button>
                      } @else if (u.role === 'HR' && u.employeeId) {
                        <button type="button" class="btn btn-ghost btn-sm" (click)="changeRole(u, 'Employee')" title="Demote to Employee"><lucide-icon [img]="icons.UserRound" [size]="14" /> <span class="hidden xl:inline">Make Employee</span></button>
                      }
                      <button type="button" class="btn btn-ghost btn-sm" [class]="u.isActive ? 'text-rose-600 dark:text-rose-400' : 'text-blue-600 dark:text-blue-400'" (click)="toggleActive(u)">
                        <lucide-icon [img]="u.isActive ? icons.Ban : icons.CircleCheck" [size]="14" /> <span class="hidden xl:inline">{{ u.isActive ? 'Deactivate' : 'Activate' }}</span>
                      </button>
                    } @else {
                      <span class="text-xs text-slate-400">—</span>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <div class="border-t border-slate-100 p-4 dark:border-slate-800">
          <app-pagination [meta]="meta()" (pageChange)="page.set($event); load()" />
        </div>
      }
    </div>

    <app-modal [open]="createOpen()" title="Create HR login" subtitle="HR registers employees, approves requests and prepares payroll." [icon]="icons.UserPlus" tone="emerald" (closed)="createOpen.set(false)">
      <form [formGroup]="form" (ngSubmit)="create()" id="hr-form" class="space-y-4">
        <div>
          <label class="label" for="hf">Full name</label>
          <input id="hf" class="input" formControlName="fullName" placeholder="e.g. Sara Khan" />
          <app-field-error [control]="form.controls.fullName" label="Full name" />
        </div>
        <div>
          <label class="label" for="he">Work email</label>
          <input id="he" type="email" class="input" formControlName="email" placeholder="hr@company.com" />
          <app-field-error [control]="form.controls.email" label="Email" />
        </div>
        <div>
          <label class="label" for="hp">Initial password <span class="font-normal normal-case text-slate-400">(optional)</span></label>
          <input id="hp" type="text" class="input font-mono" formControlName="password" placeholder="Leave empty to auto-generate a temporary password" autocomplete="off" />
          <app-field-error [control]="form.controls.password" label="Password" />
          <p class="field-hint">They must change it at first sign-in either way.</p>
        </div>
        <p class="flex gap-2 rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-600 dark:bg-slate-900/60 dark:text-slate-300">
          <lucide-icon [img]="icons.Info" [size]="15" class="mt-0.5 shrink-0 text-slate-400" />
          Want HR to also check in, apply for leave and receive payslips? Have them registered as an employee first, then use “Make HR” on their login.
        </p>
      </form>
      <div modal-footer class="flex justify-end gap-2 border-t border-slate-200 px-5 py-4 dark:border-slate-800 sm:px-6">
        <button type="button" class="btn btn-secondary" (click)="createOpen.set(false)">Cancel</button>
        <button type="submit" form="hr-form" class="btn btn-primary" [disabled]="saving()">
          <lucide-icon [img]="saving() ? icons.LoaderCircle : icons.Check" [size]="16" [class.animate-spin]="saving()" /> Create login
        </button>
      </div>
    </app-modal>

    <app-credentials-dialog [credentials]="credentials()" (closed)="credentials.set(null)" />
  `,
})
export class UsersComponent implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly api = inject(UsersService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly icons = Icons;

  protected readonly roleFilters: { id: Role | ''; label: string }[] = [
    { id: '', label: 'All' },
    { id: 'HR', label: 'HR' },
    { id: 'Employee', label: 'Employees' },
    { id: 'Admin', label: 'Admins' },
  ];

  protected readonly search = new FormControl('', { nonNullable: true });
  protected readonly role = signal<Role | ''>('');
  protected readonly page = signal(1);
  protected readonly users = signal<UserAccount[]>([]);
  protected readonly meta = signal<PageMeta | null>(null);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly createOpen = signal(false);
  protected readonly credentials = signal<Credentials | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.maxLength(120)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', passwordPolicy()],
  });

  ngOnInit(): void {
    this.search.valueChanges.pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.page.set(1);
      this.load();
    });
    if (this.route.snapshot.queryParamMap.get('action') === 'create-hr') this.openCreate();
    this.load();
  }

  protected setRole(role: Role | ''): void {
    this.role.set(role);
    this.page.set(1);
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.api.list({ q: this.search.value.trim() || undefined, role: this.role(), page: this.page(), limit: 15 }).subscribe({
      next: (res) => {
        this.users.set(res.data);
        this.meta.set(res.meta);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected openCreate(): void {
    this.form.reset({ fullName: '', email: '', password: '' });
    this.createOpen.set(true);
  }

  protected create(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    this.saving.set(true);
    this.api.createHr({ fullName: v.fullName.trim(), email: v.email.trim().toLowerCase(), ...(v.password ? { password: v.password } : {}) }).subscribe({
      next: (res) => {
        this.saving.set(false);
        this.createOpen.set(false);
        this.toast.success('HR login created', res.user.email);
        this.credentials.set({
          title: 'HR login created',
          name: res.user.fullName,
          email: res.user.email,
          temporaryPassword: res.temporaryPassword ?? v.password,
        });
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error('Could not create login', apiErrorMessage(err));
      },
    });
  }

  protected async reset(u: UserAccount): Promise<void> {
    const ok = await this.confirm.confirm({
      title: `Reset password for ${u.fullName}?`,
      message: 'A new temporary password is generated, all their sessions are signed out and they must choose a new password at next sign-in.',
      confirmText: 'Reset password',
      tone: 'warning',
      icon: 'lock',
    });
    if (!ok) return;
    this.api.resetPassword(u.id).subscribe({
      next: (res) => {
        this.credentials.set({ title: 'Password reset', name: u.fullName, email: res.email, temporaryPassword: res.temporaryPassword });
        this.load();
      },
      error: (err) => this.toast.error('Reset failed', apiErrorMessage(err)),
    });
  }

  protected async toggleActive(u: UserAccount): Promise<void> {
    const deactivate = u.isActive;
    const ok = await this.confirm.confirm({
      title: `${deactivate ? 'Deactivate' : 'Activate'} ${u.fullName}?`,
      message: deactivate ? 'They are signed out everywhere immediately and cannot sign in until reactivated.' : 'They will be able to sign in again.',
      confirmText: deactivate ? 'Deactivate' : 'Activate',
      tone: deactivate ? 'danger' : 'primary',
    });
    if (!ok) return;
    (deactivate ? this.api.deactivate(u.id) : this.api.activate(u.id)).subscribe({
      next: () => {
        this.toast.success(deactivate ? 'Login deactivated' : 'Login activated', u.email);
        this.load();
      },
      error: (err) => this.toast.error('Update failed', apiErrorMessage(err)),
    });
  }

  protected async changeRole(u: UserAccount, role: 'HR' | 'Employee'): Promise<void> {
    const ok = await this.confirm.confirm({
      title: role === 'HR' ? `Promote ${u.fullName} to HR?` : `Change ${u.fullName} back to Employee?`,
      message:
        role === 'HR'
          ? 'They keep their employee profile (attendance, leave, payslips) and gain HR permissions. Their current sessions are signed out.'
          : 'They lose HR permissions and keep self-service access. Their current sessions are signed out.',
      confirmText: role === 'HR' ? 'Promote' : 'Change role',
      tone: 'navy',
    });
    if (!ok) return;
    this.api.updateRole(u.id, role).subscribe({
      next: () => {
        this.toast.success('Role updated', `${u.fullName} is now ${role}.`);
        this.load();
      },
      error: (err) => this.toast.error('Update failed', apiErrorMessage(err)),
    });
  }
}
