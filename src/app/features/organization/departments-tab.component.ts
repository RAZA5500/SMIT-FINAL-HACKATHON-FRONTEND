import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { Department } from '../../core/models/api.models';
import { ConfirmService } from '../../core/services/confirm.service';
import { OrgService } from '../../core/services/org.service';
import { ToastService } from '../../core/services/toast.service';
import { apiErrorMessage } from '../../core/utils/http';
import { DEPARTMENT_CODE_REGEX } from '../../core/utils/validators';
import { listStagger } from '../../shared/animations';
import { StatusBadgeComponent } from '../../shared/ui/badges';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';
import { FieldErrorComponent } from '../../shared/ui/field-error.component';
import { Icons } from '../../shared/ui/icons';
import { ModalComponent } from '../../shared/ui/modal.component';

@Component({
  selector: 'app-departments-tab',
  imports: [ReactiveFormsModule, LucideAngularModule, ModalComponent, EmptyStateComponent, FieldErrorComponent, StatusBadgeComponent],
  animations: [listStagger],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <p class="text-sm text-slate-500 dark:text-slate-400">{{ items().length }} department{{ items().length === 1 ? '' : 's' }} · employees are assigned to one department each.</p>
      @if (canEdit() && items().length) {
        <button type="button" class="btn btn-primary" (click)="openCreate()"><lucide-icon [img]="icons.Plus" [size]="16" /> New department</button>
      }
    </div>

    @if (loading()) {
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        @for (i of [1, 2, 3]; track i) {
          <div class="skeleton h-32"></div>
        }
      </div>
    } @else if (items().length === 0) {
      <app-empty-state art="org" tone="emerald" title="No departments created yet" [description]="canEdit() ? 'Departments group your people and power headcount, absenteeism and payroll reports.' : 'Your Admin has not created any departments yet.'">
        @if (canEdit()) {
          <button type="button" class="btn btn-primary" (click)="openCreate()"><lucide-icon [img]="icons.Plus" [size]="16" /> Create first department</button>
        }
      </app-empty-state>
    } @else {
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" [@listStagger]="items().length">
        @for (d of items(); track d.id) {
          <article class="card card-hover group relative overflow-hidden p-5" [class.opacity-70]="!d.isActive">
            <div class="flex items-start justify-between gap-3">
              <div class="flex min-w-0 items-center gap-3">
                <span class="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-600 text-sm font-extrabold text-white shadow-md shadow-emerald-500/25">
                  {{ (d.code || d.name).slice(0, 3).toUpperCase() }}
                </span>
                <div class="min-w-0">
                  <p class="truncate font-semibold text-slate-900 dark:text-white">{{ d.name }}</p>
                  <p class="text-xs text-slate-500 dark:text-slate-400">{{ d.code || 'No code' }}</p>
                </div>
              </div>
              <app-status-badge [status]="d.isActive ? 'active' : 'inactive'" />
            </div>
            @if (d.description) {
              <p class="mt-3 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{{ d.description }}</p>
            }
            <div class="mt-4 flex items-center justify-between">
              <span class="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
                <lucide-icon [img]="icons.Users" [size]="15" class="text-slate-400" /> {{ d.employeeCount ?? 0 }} employee{{ d.employeeCount === 1 ? '' : 's' }}
              </span>
              @if (canEdit()) {
                <div class="flex gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
                  <button type="button" class="btn btn-ghost btn-icon" (click)="openEdit(d)" [attr.aria-label]="'Edit ' + d.name"><lucide-icon [img]="icons.Pencil" [size]="15" /></button>
                  <button type="button" class="btn btn-ghost btn-icon text-rose-500" (click)="remove(d)" [attr.aria-label]="'Delete ' + d.name"><lucide-icon [img]="icons.Trash2" [size]="15" /></button>
                </div>
              }
            </div>
          </article>
        }
      </div>
    }

    <app-modal [open]="modalOpen()" [title]="editing() ? 'Edit department' : 'New department'" [icon]="icons.Network" tone="emerald" (closed)="modalOpen.set(false)">
      <form [formGroup]="form" (ngSubmit)="save()" id="dept-form" class="space-y-4">
        <div class="grid gap-4 sm:grid-cols-[1fr_140px]">
          <div>
            <label class="label" for="dn">Name</label>
            <input id="dn" class="input" formControlName="name" placeholder="e.g. Engineering" />
            <app-field-error [control]="form.controls.name" label="Name" />
          </div>
          <div>
            <label class="label" for="dc">Code</label>
            <input id="dc" class="input uppercase" formControlName="code" placeholder="ENG" maxlength="20" />
            <app-field-error [control]="form.controls.code" label="Code" />
          </div>
        </div>
        <div>
          <label class="label" for="dd">Description</label>
          <textarea id="dd" rows="3" class="input resize-none" formControlName="description" placeholder="What does this team do?"></textarea>
        </div>
        <label class="flex items-center justify-between rounded-2xl border border-slate-200 p-3.5 dark:border-slate-800">
          <span class="text-sm font-medium">Active <span class="block text-xs font-normal text-slate-500">Inactive departments can't receive new employees.</span></span>
          <input type="checkbox" class="switch" formControlName="isActive" />
        </label>
      </form>
      <div modal-footer class="flex justify-end gap-2 border-t border-slate-100 px-5 py-4 dark:border-slate-800 sm:px-6">
        <button type="button" class="btn btn-secondary" (click)="modalOpen.set(false)">Cancel</button>
        <button type="submit" form="dept-form" class="btn btn-primary" [disabled]="saving()">
          <lucide-icon [img]="saving() ? icons.LoaderCircle : icons.Check" [size]="16" [class.animate-spin]="saving()" /> {{ editing() ? 'Save changes' : 'Create department' }}
        </button>
      </div>
    </app-modal>
  `,
})
export class DepartmentsTabComponent implements OnInit {
  private readonly org = inject(OrgService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly fb = inject(FormBuilder);
  protected readonly icons = Icons;

  readonly canEdit = input(false);

  protected readonly items = signal<Department[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly modalOpen = signal(false);
  protected readonly editing = signal<Department | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    code: ['', Validators.pattern(DEPARTMENT_CODE_REGEX)],
    description: ['', Validators.maxLength(500)],
    isActive: [true],
  });

  ngOnInit(): void {
    this.load();
  }

  protected openCreate(): void {
    this.editing.set(null);
    this.form.reset({ name: '', code: '', description: '', isActive: true });
    this.modalOpen.set(true);
  }

  protected openEdit(d: Department): void {
    this.editing.set(d);
    this.form.reset({ name: d.name, code: d.code ?? '', description: d.description ?? '', isActive: d.isActive });
    this.modalOpen.set(true);
  }

  protected save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    const payload = { name: v.name.trim(), description: v.description.trim(), isActive: v.isActive, ...(v.code.trim() ? { code: v.code.trim().toUpperCase() } : {}) };
    const editing = this.editing();
    this.saving.set(true);
    (editing ? this.org.updateDepartment(editing.id, payload) : this.org.createDepartment(payload)).subscribe({
      next: () => {
        this.saving.set(false);
        this.modalOpen.set(false);
        this.toast.success(editing ? 'Department updated' : 'Department created', payload.name);
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error('Could not save department', apiErrorMessage(err));
      },
    });
  }

  protected async remove(d: Department): Promise<void> {
    const ok = await this.confirm.confirm({
      title: `Delete ${d.name}?`,
      message: 'This cannot be undone. Departments with employees cannot be deleted — mark them inactive instead.',
      confirmText: 'Delete',
      tone: 'danger',
      icon: 'trash',
    });
    if (!ok) return;
    this.org.deleteDepartment(d.id).subscribe({
      next: () => {
        this.toast.success('Department deleted', d.name);
        this.load();
      },
      error: (err) => this.toast.error('Could not delete', apiErrorMessage(err)),
    });
  }

  private load(): void {
    this.org.departments(true).subscribe({
      next: (items) => {
        this.items.set(items);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
