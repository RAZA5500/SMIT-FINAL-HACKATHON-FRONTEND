import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { CreateEmployeeResponse, Department, Designation, Employee, EmployeePayload } from '../../core/models/api.models';
import { EmployeeService } from '../../core/services/employee.service';
import { PolicyStore } from '../../core/services/policy.store';
import { ToastService } from '../../core/services/toast.service';
import { apiErrorMessage } from '../../core/utils/http';
import { EMPLOYEE_CODE_REGEX, PHONE_REGEX, orderedRange } from '../../core/utils/validators';
import { MoneyPipe } from '../../shared/pipes/format.pipes';
import { FieldErrorComponent } from '../../shared/ui/field-error.component';
import { Icons } from '../../shared/ui/icons';
import { ModalComponent } from '../../shared/ui/modal.component';

/** HR: register an employee (auto-creates the login) or edit job details & salary. */
@Component({
  selector: 'app-employee-form',
  imports: [ReactiveFormsModule, RouterLink, LucideAngularModule, ModalComponent, FieldErrorComponent, MoneyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal
      [open]="open()"
      size="lg"
      [title]="employee() ? 'Edit ' + employee()!.fullName : 'Register employee'"
      [subtitle]="employee() ? 'Job details, status and salary structure' : 'A login with a temporary password is created automatically.'"
      [icon]="employee() ? icons.Pencil : icons.UserPlus"
      tone="emerald"
      (closed)="closed.emit()"
    >
      @if (activeDepartments().length === 0 || activeDesignations().length === 0) {
        <div class="mb-4 flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          <lucide-icon [img]="icons.TriangleAlert" [size]="18" class="mt-0.5 shrink-0" />
          <div>
            <p class="font-semibold">Departments and designations are needed first</p>
            <p class="mt-0.5 text-xs">Ask your Admin to create them in <a routerLink="/organization" class="font-semibold underline" (click)="closed.emit()">Organization</a>.</p>
          </div>
        </div>
      }
      <form [formGroup]="form" (ngSubmit)="save()" id="employee-form" class="space-y-5">
        <section>
          <p class="eyebrow mb-3">Identity</p>
          <div class="grid gap-4 sm:grid-cols-[150px_1fr]">
            <div>
              <label class="label" for="ec">Employee code</label>
              <input id="ec" class="input uppercase" formControlName="code" placeholder="EMP-001" maxlength="20" />
              <app-field-error [control]="form.controls.code" label="Code" [show]="attempted()" />
            </div>
            <div>
              <label class="label" for="efn">Full name</label>
              <input id="efn" class="input" formControlName="fullName" placeholder="e.g. Ali Raza" />
              <app-field-error [control]="form.controls.fullName" label="Full name" [show]="attempted()" />
            </div>
          </div>
          <div class="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label class="label" for="eem">Email (sign-in)</label>
              <input id="eem" type="email" class="input" formControlName="email" placeholder="ali.raza@company.com" />
              <app-field-error [control]="form.controls.email" label="Email" [show]="attempted()" />
            </div>
            <div>
              <label class="label" for="eph">Phone</label>
              <input id="eph" class="input" formControlName="phone" placeholder="+92 300 1234567" />
              <app-field-error [control]="form.controls.phone" label="Phone" [show]="attempted()" />
            </div>
          </div>
          <div class="mt-4 grid gap-4 sm:grid-cols-[1fr_170px]">
            <div>
              <label class="label" for="ead">Address</label>
              <input id="ead" class="input" formControlName="address" placeholder="House, street, city" />
            </div>
            <div>
              <label class="label" for="egn">Gender</label>
              <select id="egn" class="input" formControlName="gender">
                <option value="">Not specified</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        </section>

        <section>
          <p class="eyebrow mb-3">Job</p>
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="label" for="edp">Department</label>
              <select id="edp" class="input" formControlName="departmentId">
                <option value="" disabled>Select department</option>
                @for (d of activeDepartments(); track d.id) {
                  <option [value]="d.id">{{ d.name }}</option>
                }
              </select>
              <app-field-error [control]="form.controls.departmentId" label="Department" [show]="attempted()" />
            </div>
            <div>
              <label class="label" for="eds">Designation</label>
              <select id="eds" class="input" formControlName="designationId">
                <option value="" disabled>Select designation</option>
                @for (d of activeDesignations(); track d.id) {
                  <option [value]="d.id">{{ d.name }}</option>
                }
              </select>
              <app-field-error [control]="form.controls.designationId" label="Designation" [show]="attempted()" />
            </div>
          </div>
          <div class="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <label class="label" for="ejd">Join date</label>
              <input id="ejd" type="date" class="input" formControlName="joinDate" />
              <app-field-error [control]="form.controls.joinDate" label="Join date" [show]="attempted()" />
            </div>
            <div>
              <label class="label" for="est">Status</label>
              <select id="est" class="input" formControlName="status">
                <option value="active">Active</option>
                <option value="probation">Probation</option>
                <option value="exited">Exited</option>
              </select>
            </div>
            <div>
              <label class="label" for="ext">Exit date</label>
              <input id="ext" type="date" class="input" formControlName="exitDate" [min]="form.controls.joinDate.value" />
            </div>
          </div>
          @if (status() === 'exited' && !form.controls.exitDate.value) {
            <p class="field-error">An exit date is required when the status is Exited — their login is deactivated automatically.</p>
          }
          @if (form.errors?.['exitOrder']) {
            <p class="field-error">The exit date cannot be before the join date.</p>
          }
        </section>

        <section class="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
          <div class="grid gap-4 sm:grid-cols-[220px_1fr] sm:items-end">
            <div>
              <label class="label" for="ebs">Basic salary (monthly)</label>
              <input id="ebs" type="number" min="1" step="1" class="input num" formControlName="basicSalary" placeholder="100000" />
              <app-field-error [control]="form.controls.basicSalary" label="Basic salary" [show]="attempted()" />
            </div>
            <dl class="grid grid-cols-3 gap-2 text-center">
              <div class="rounded-lg bg-white/80 px-2 py-2.5 dark:bg-slate-900/60">
                <dt class="text-xs font-medium text-slate-400">HRA {{ hraPct() }}</dt>
                <dd class="num mt-0.5 text-sm font-semibold text-slate-800 dark:text-slate-100">{{ salary().hra | money }}</dd>
              </div>
              <div class="rounded-lg bg-white/80 px-2 py-2.5 dark:bg-slate-900/60">
                <dt class="text-xs font-medium text-slate-400">Medical {{ medicalPct() }}</dt>
                <dd class="num mt-0.5 text-sm font-semibold text-slate-800 dark:text-slate-100">{{ salary().medical | money }}</dd>
              </div>
              <div class="rounded-lg bg-blue-500 px-2 py-2.5 text-white shadow-xs">
                <dt class="text-xs font-medium text-blue-100">Gross</dt>
                <dd class="num mt-0.5 text-sm font-semibold">{{ salary().gross | money }}</dd>
              </div>
            </dl>
          </div>
        </section>

        @if (serverError()) {
          <p class="flex gap-2 rounded-lg bg-rose-50 p-3.5 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
            <lucide-icon [img]="icons.CircleAlert" [size]="17" class="mt-0.5 shrink-0" /> {{ serverError() }}
          </p>
        }
      </form>
      <div modal-footer class="flex justify-end gap-2 border-t border-slate-200 px-5 py-4 dark:border-slate-800 sm:px-6">
        <button type="button" class="btn btn-secondary" (click)="closed.emit()">Cancel</button>
        <button type="submit" form="employee-form" class="btn btn-primary" [disabled]="saving()">
          <lucide-icon [img]="saving() ? icons.LoaderCircle : icons.Check" [size]="16" [class.animate-spin]="saving()" />
          {{ employee() ? 'Save changes' : 'Register & create login' }}
        </button>
      </div>
    </app-modal>
  `,
})
export class EmployeeFormComponent {
  private readonly api = inject(EmployeeService);
  private readonly policies = inject(PolicyStore);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  protected readonly icons = Icons;

  readonly open = input(false);
  /** Employee to edit; null registers a new one. */
  readonly employee = input<Employee | null>(null);
  readonly departments = input<Department[]>([]);
  readonly designations = input<Designation[]>([]);
  readonly closed = output<void>();
  readonly created = output<CreateEmployeeResponse>();
  readonly updated = output<Employee>();

  protected readonly saving = signal(false);
  protected readonly attempted = signal(false);
  protected readonly serverError = signal('');

  protected readonly form = this.fb.nonNullable.group(
    {
      code: ['', [Validators.required, Validators.pattern(EMPLOYEE_CODE_REGEX)]],
      fullName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.pattern(PHONE_REGEX)],
      address: ['', Validators.maxLength(300)],
      gender: [''],
      departmentId: ['', Validators.required],
      designationId: ['', Validators.required],
      joinDate: ['', Validators.required],
      status: ['active' as 'active' | 'probation' | 'exited'],
      exitDate: [''],
      basicSalary: [0, [Validators.required, Validators.min(1)]],
    },
    { validators: orderedRange('joinDate', 'exitDate', 'exitOrder') },
  );

  private readonly basic = toSignal(this.form.controls.basicSalary.valueChanges, { initialValue: 0 });
  protected readonly status = toSignal(this.form.controls.status.valueChanges, { initialValue: 'active' as const });

  /** Live salary structure — rates from company policy (40% HRA, 10% medical). */
  protected readonly salary = computed(() => {
    const payroll = this.policies.policies()?.payroll;
    const hraRate = payroll?.hraRate ?? 0.4;
    const medicalRate = payroll?.medicalRate ?? 0.1;
    const basic = Number(this.basic()) || 0;
    return { hra: basic * hraRate, medical: basic * medicalRate, gross: basic * (1 + hraRate + medicalRate) };
  });
  protected readonly hraPct = computed(() => `${Math.round((this.policies.policies()?.payroll.hraRate ?? 0.4) * 100)}%`);
  protected readonly medicalPct = computed(() => `${Math.round((this.policies.policies()?.payroll.medicalRate ?? 0.1) * 100)}%`);

  protected readonly activeDepartments = computed(() => this.departments().filter((d) => d.isActive || d.id === this.employee()?.departmentId));
  protected readonly activeDesignations = computed(() => this.designations().filter((d) => d.isActive || d.id === this.employee()?.designationId));

  constructor() {
    effect(() => {
      if (!this.open()) return;
      const e = this.employee();
      untracked(() => {
        this.attempted.set(false);
        this.serverError.set('');
        this.form.reset({
          code: e?.code ?? '',
          fullName: e?.fullName ?? '',
          email: e?.email ?? '',
          phone: e?.phone ?? '',
          address: e?.address ?? '',
          gender: e?.gender ?? '',
          departmentId: e?.departmentId ?? '',
          designationId: e?.designationId ?? '',
          joinDate: e?.joinDate ?? this.policies.today(),
          status: e?.status ?? 'active',
          exitDate: e?.exitDate ?? '',
          basicSalary: e?.basicSalary ?? 0,
        });
      });
    });
  }

  protected save(): void {
    this.attempted.set(true);
    this.form.markAllAsTouched();
    const v = this.form.getRawValue();
    if (this.form.invalid || (v.status === 'exited' && !v.exitDate)) return;

    const payload: EmployeePayload = {
      code: v.code.trim().toUpperCase(),
      fullName: v.fullName.trim(),
      email: v.email.trim().toLowerCase(),
      departmentId: v.departmentId,
      designationId: v.designationId,
      joinDate: v.joinDate,
      status: v.status,
      basicSalary: Number(v.basicSalary),
      exitDate: v.exitDate || null,
      ...(v.phone.trim() ? { phone: v.phone.trim() } : {}),
      ...(v.address.trim() ? { address: v.address.trim() } : {}),
      ...(v.gender ? { gender: v.gender as EmployeePayload['gender'] } : {}),
    };

    const editing = this.employee();
    this.saving.set(true);
    this.serverError.set('');
    if (editing) {
      this.api.update(editing.id, payload).subscribe({
        next: (employee) => {
          this.saving.set(false);
          this.toast.success('Employee updated', employee.fullName);
          this.updated.emit(employee);
        },
        error: (err) => {
          this.saving.set(false);
          this.serverError.set(apiErrorMessage(err));
        },
      });
    } else {
      this.api.create(payload).subscribe({
        next: (res) => {
          this.saving.set(false);
          this.toast.success('Employee registered', `${res.employee.fullName} can now sign in.`);
          this.created.emit(res);
        },
        error: (err) => {
          this.saving.set(false);
          this.serverError.set(apiErrorMessage(err));
        },
      });
    }
  }
}
