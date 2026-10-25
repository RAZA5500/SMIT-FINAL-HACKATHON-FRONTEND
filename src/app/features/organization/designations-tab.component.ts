import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { Designation } from '../../core/models/api.models';
import { ConfirmService } from '../../core/services/confirm.service';
import { OrgService } from '../../core/services/org.service';
import { ToastService } from '../../core/services/toast.service';
import { apiErrorMessage } from '../../core/utils/http';
import { listStagger } from '../../shared/animations';
import { StatusBadgeComponent } from '../../shared/ui/badges';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';
import { FieldErrorComponent } from '../../shared/ui/field-error.component';
import { Icons } from '../../shared/ui/icons';
import { ModalComponent } from '../../shared/ui/modal.component';

@Component({
  selector: 'app-designations-tab',
  imports: [ReactiveFormsModule, LucideAngularModule, ModalComponent, EmptyStateComponent, FieldErrorComponent, StatusBadgeComponent],
  animations: [listStagger],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <p class="text-sm text-slate-500 dark:text-slate-400">{{ items().length }} designation{{ items().length === 1 ? '' : 's' }} · job titles used across all departments.</p>
      @if (canEdit() && items().length) {
        <button type="button" class="btn btn-primary" (click)="openCreate()"><lucide-icon [img]="icons.Plus" [size]="16" /> New designation</button>
      }
    </div>

    @if (loading()) {
      <div class="skeleton h-64"></div>
    } @else if (items().length === 0) {
      <app-empty-state art="org" tone="teal" title="No designations created yet" [description]="canEdit() ? 'Add job titles such as Software Engineer, Accountant or Team Lead.' : 'Your Admin has not created designations yet.'">
        @if (canEdit()) {
          <button type="button" class="btn btn-primary" (click)="openCreate()"><lucide-icon [img]="icons.Plus" [size]="16" /> Create first designation</button>
        }
      </app-empty-state>
    } @else {
      <div class="card overflow-hidden">
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Designation</th>
                <th class="hidden md:table-cell">Description</th>
                <th class="text-right">Employees</th>
                <th>Status</th>
                @if (canEdit()) {
                  <th class="text-right">Actions</th>
                }
              </tr>
            </thead>
            <tbody [@listStagger]="items().length">
              @for (d of items(); track d.id) {
                <tr>
                  <td>
                    <div class="flex items-center gap-3">
                      <span class="grid h-9 w-9 place-items-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400"><lucide-icon [img]="icons.Award" [size]="16" /></span>
                      <span class="font-semibold text-slate-900 dark:text-white">{{ d.name }}</span>
                    </div>
                  </td>
                  <td class="hidden max-w-xs truncate md:table-cell">{{ d.description || '—' }}</td>
                  <td class="num text-right font-semibold">{{ d.employeeCount ?? 0 }}</td>
                  <td><app-status-badge [status]="d.isActive ? 'active' : 'inactive'" /></td>
                  @if (canEdit()) {
                    <td class="text-right">
                      <button type="button" class="btn btn-ghost btn-icon" (click)="openEdit(d)" [attr.aria-label]="'Edit ' + d.name"><lucide-icon [img]="icons.Pencil" [size]="15" /></button>
                      <button type="button" class="btn btn-ghost btn-icon text-rose-500" (click)="remove(d)" [attr.aria-label]="'Delete ' + d.name"><lucide-icon [img]="icons.Trash2" [size]="15" /></button>
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    }

    <app-modal [open]="modalOpen()" [title]="editing() ? 'Edit designation' : 'New designation'" [icon]="icons.Award" tone="teal" (closed)="modalOpen.set(false)">
      <form [formGroup]="form" (ngSubmit)="save()" id="desig-form" class="space-y-4">
        <div>
          <label class="label" for="gn">Title</label>
          <input id="gn" class="input" formControlName="name" placeholder="e.g. Software Engineer" />
          <app-field-error [control]="form.controls.name" label="Title" />
        </div>
        <div>
          <label class="label" for="gd">Description</label>
          <textarea id="gd" rows="3" class="input resize-none" formControlName="description"></textarea>
        </div>
        <label class="flex items-center justify-between rounded-2xl border border-slate-200 p-3.5 dark:border-slate-800">
          <span class="text-sm font-medium">Active</span>
          <input type="checkbox" class="switch" formControlName="isActive" />
        </label>
      </form>
      <div modal-footer class="flex justify-end gap-2 border-t border-slate-100 px-5 py-4 dark:border-slate-800 sm:px-6">
        <button type="button" class="btn btn-secondary" (click)="modalOpen.set(false)">Cancel</button>
        <button type="submit" form="desig-form" class="btn btn-primary" [disabled]="saving()">
          <lucide-icon [img]="saving() ? icons.LoaderCircle : icons.Check" [size]="16" [class.animate-spin]="saving()" /> {{ editing() ? 'Save changes' : 'Create designation' }}
        </button>
      </div>
    </app-modal>
  `,
})
export class DesignationsTabComponent implements OnInit {
  private readonly org = inject(OrgService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly fb = inject(FormBuilder);
  protected readonly icons = Icons;

  readonly canEdit = input(false);

  protected readonly items = signal<Designation[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly modalOpen = signal(false);
  protected readonly editing = signal<Designation | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    description: ['', Validators.maxLength(500)],
    isActive: [true],
  });

  ngOnInit(): void {
    this.load();
  }

  protected openCreate(): void {
    this.editing.set(null);
    this.form.reset({ name: '', description: '', isActive: true });
    this.modalOpen.set(true);
  }

  protected openEdit(d: Designation): void {
    this.editing.set(d);
    this.form.reset({ name: d.name, description: d.description ?? '', isActive: d.isActive });
    this.modalOpen.set(true);
  }

  protected save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    const payload = { name: v.name.trim(), description: v.description.trim(), isActive: v.isActive };
    const editing = this.editing();
    this.saving.set(true);
    (editing ? this.org.updateDesignation(editing.id, payload) : this.org.createDesignation(payload)).subscribe({
      next: () => {
        this.saving.set(false);
        this.modalOpen.set(false);
        this.toast.success(editing ? 'Designation updated' : 'Designation created', payload.name);
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error('Could not save designation', apiErrorMessage(err));
      },
    });
  }

  protected async remove(d: Designation): Promise<void> {
    const ok = await this.confirm.confirm({
      title: `Delete ${d.name}?`,
      message: 'Designations assigned to employees cannot be deleted — mark them inactive instead.',
      confirmText: 'Delete',
      tone: 'danger',
      icon: 'trash',
    });
    if (!ok) return;
    this.org.deleteDesignation(d.id).subscribe({
      next: () => {
        this.toast.success('Designation deleted', d.name);
        this.load();
      },
      error: (err) => this.toast.error('Could not delete', apiErrorMessage(err)),
    });
  }

  private load(): void {
    this.org.designations(true).subscribe({
      next: (items) => {
        this.items.set(items);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
