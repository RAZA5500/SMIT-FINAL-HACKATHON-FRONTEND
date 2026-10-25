import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { LeaveType } from '../../core/models/api.models';
import { ConfirmService } from '../../core/services/confirm.service';
import { OrgService } from '../../core/services/org.service';
import { PolicyStore } from '../../core/services/policy.store';
import { ToastService } from '../../core/services/toast.service';
import { apiErrorMessage } from '../../core/utils/http';
import { listStagger } from '../../shared/animations';
import { StatusBadgeComponent } from '../../shared/ui/badges';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';
import { FieldErrorComponent } from '../../shared/ui/field-error.component';
import { Icons } from '../../shared/ui/icons';
import { ModalComponent } from '../../shared/ui/modal.component';

/** Leave types & annual quotas (defaults: Annual 14, Sick 8, Casual 10, Unpaid unlimited). */
@Component({
  selector: 'app-leave-quotas-tab',
  imports: [ReactiveFormsModule, LucideAngularModule, ModalComponent, EmptyStateComponent, FieldErrorComponent, StatusBadgeComponent],
  animations: [listStagger],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <p class="text-sm text-slate-500 dark:text-slate-400">Quotas are working days per calendar year. Weekends and public holidays never count.</p>
      @if (canEdit()) {
        <button type="button" class="btn btn-primary" (click)="openCreate()"><lucide-icon [img]="icons.Plus" [size]="16" /> New leave type</button>
      }
    </div>

    @if (loading()) {
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        @for (i of [1, 2, 3, 4]; track i) {
          <div class="skeleton h-40"></div>
        }
      </div>
    } @else if (items().length === 0) {
      <app-empty-state art="calendar" tone="amber" title="No leave types yet" description="Create leave types so employees can request time off.">
        @if (canEdit()) {
          <button type="button" class="btn btn-primary" (click)="openCreate()"><lucide-icon [img]="icons.Plus" [size]="16" /> Create leave type</button>
        }
      </app-empty-state>
    } @else {
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" [@listStagger]="items().length">
        @for (t of items(); track t.id) {
          <article class="card card-hover relative overflow-hidden p-5" [class.opacity-60]="!t.isActive">
            <div class="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-amber-400/20 blur-2xl"></div>
            <div class="relative flex items-start justify-between gap-2">
              <span class="grid h-10 w-10 place-items-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400"><lucide-icon [img]="icons.TreePalm" [size]="18" /></span>
              <div class="flex flex-wrap justify-end gap-1">
                <span class="badge" [class]="t.isPaid ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-300'">{{ t.isPaid ? 'Paid' : 'Unpaid' }}</span>
                @if (!t.isActive) {
                  <app-status-badge status="inactive" />
                }
              </div>
            </div>
            <p class="relative mt-4 font-semibold text-slate-900 dark:text-white">{{ t.name }}</p>
            <p class="relative mt-1 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {{ t.annualQuota === null ? '∞' : t.annualQuota }}
              <span class="text-sm font-semibold text-slate-400">{{ t.annualQuota === null ? 'unlimited' : 'days / year' }}</span>
            </p>
            @if (t.description) {
              <p class="relative mt-2 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{{ t.description }}</p>
            }
            @if (canEdit()) {
              <div class="relative mt-4 flex gap-1 border-t border-slate-100 pt-3 dark:border-slate-800">
                <button type="button" class="btn btn-ghost btn-sm" (click)="openEdit(t)"><lucide-icon [img]="icons.Pencil" [size]="13" /> Edit</button>
                <button type="button" class="btn btn-ghost btn-sm text-rose-500" (click)="remove(t)"><lucide-icon [img]="icons.Trash2" [size]="13" /> Delete</button>
              </div>
            }
          </article>
        }
      </div>
    }

    <app-modal [open]="modalOpen()" [title]="editing() ? 'Edit leave type' : 'New leave type'" [icon]="icons.TreePalm" tone="amber" (closed)="modalOpen.set(false)">
      <form [formGroup]="form" (ngSubmit)="save()" id="lt-form" class="space-y-4">
        <div>
          <label class="label" for="ln">Name</label>
          <input id="ln" class="input" formControlName="name" placeholder="e.g. Maternity" />
          <app-field-error [control]="form.controls.name" label="Name" />
        </div>
        <label class="flex items-center justify-between rounded-2xl border border-slate-200 p-3.5 dark:border-slate-800">
          <span class="text-sm font-medium">Unlimited quota <span class="block text-xs font-normal text-slate-500">No annual cap (e.g. Unpaid leave).</span></span>
          <input type="checkbox" class="switch" formControlName="unlimited" />
        </label>
        @if (!unlimited()) {
          <div>
            <label class="label" for="lq">Annual quota (working days)</label>
            <input id="lq" type="number" min="0" max="366" class="input" formControlName="annualQuota" />
            <app-field-error [control]="form.controls.annualQuota" label="Quota" />
          </div>
        }
        <label class="flex items-center justify-between rounded-2xl border border-slate-200 p-3.5 dark:border-slate-800">
          <span class="text-sm font-medium">Paid leave <span class="block text-xs font-normal text-slate-500">Unpaid leave days are deducted in payroll.</span></span>
          <input type="checkbox" class="switch" formControlName="isPaid" />
        </label>
        <div>
          <label class="label" for="ld">Description</label>
          <textarea id="ld" rows="2" class="input resize-none" formControlName="description"></textarea>
        </div>
        <label class="flex items-center justify-between rounded-2xl border border-slate-200 p-3.5 dark:border-slate-800">
          <span class="text-sm font-medium">Active</span>
          <input type="checkbox" class="switch" formControlName="isActive" />
        </label>
      </form>
      <div modal-footer class="flex justify-end gap-2 border-t border-slate-100 px-5 py-4 dark:border-slate-800 sm:px-6">
        <button type="button" class="btn btn-secondary" (click)="modalOpen.set(false)">Cancel</button>
        <button type="submit" form="lt-form" class="btn btn-amber" [disabled]="saving()">
          <lucide-icon [img]="saving() ? icons.LoaderCircle : icons.Check" [size]="16" [class.animate-spin]="saving()" /> {{ editing() ? 'Save changes' : 'Create leave type' }}
        </button>
      </div>
    </app-modal>
  `,
})
export class LeaveQuotasTabComponent implements OnInit {
  private readonly org = inject(OrgService);
  private readonly policies = inject(PolicyStore);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly fb = inject(FormBuilder);
  protected readonly icons = Icons;

  readonly canEdit = input(false);

  protected readonly items = signal<LeaveType[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly modalOpen = signal(false);
  protected readonly editing = signal<LeaveType | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(50)]],
    unlimited: [false],
    annualQuota: [10, [Validators.min(0), Validators.max(366)]],
    isPaid: [true],
    description: ['', Validators.maxLength(500)],
    isActive: [true],
  });
  protected readonly unlimited = toSignal(this.form.controls.unlimited.valueChanges, { initialValue: false });

  ngOnInit(): void {
    this.load();
  }

  protected openCreate(): void {
    this.editing.set(null);
    this.form.reset({ name: '', unlimited: false, annualQuota: 10, isPaid: true, description: '', isActive: true });
    this.modalOpen.set(true);
  }

  protected openEdit(t: LeaveType): void {
    this.editing.set(t);
    this.form.reset({
      name: t.name,
      unlimited: t.annualQuota === null,
      annualQuota: t.annualQuota ?? 0,
      isPaid: t.isPaid,
      description: t.description ?? '',
      isActive: t.isActive,
    });
    this.modalOpen.set(true);
  }

  protected save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    const payload = {
      name: v.name.trim(),
      annualQuota: v.unlimited ? null : Math.round(Number(v.annualQuota)),
      isPaid: v.isPaid,
      description: v.description.trim(),
      isActive: v.isActive,
    };
    const editing = this.editing();
    this.saving.set(true);
    (editing ? this.org.updateLeaveType(editing.id, payload) : this.org.createLeaveType(payload)).subscribe({
      next: () => {
        this.saving.set(false);
        this.modalOpen.set(false);
        this.toast.success(editing ? 'Leave type updated' : 'Leave type created', payload.name);
        this.policies.refresh();
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error('Could not save leave type', apiErrorMessage(err));
      },
    });
  }

  protected async remove(t: LeaveType): Promise<void> {
    const ok = await this.confirm.confirm({
      title: `Delete ${t.name}?`,
      message: 'Leave types that were already requested cannot be deleted — deactivate them instead.',
      confirmText: 'Delete',
      tone: 'danger',
      icon: 'trash',
    });
    if (!ok) return;
    this.org.deleteLeaveType(t.id).subscribe({
      next: () => {
        this.toast.success('Leave type deleted', t.name);
        this.policies.refresh();
        this.load();
      },
      error: (err) => this.toast.error('Could not delete', apiErrorMessage(err)),
    });
  }

  private load(): void {
    this.org.leaveTypes(true).subscribe({
      next: (items) => {
        this.items.set(items);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
