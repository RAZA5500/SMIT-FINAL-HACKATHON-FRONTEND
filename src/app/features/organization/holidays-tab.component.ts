import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { Holiday } from '../../core/models/api.models';
import { ConfirmService } from '../../core/services/confirm.service';
import { OrgService } from '../../core/services/org.service';
import { PolicyStore } from '../../core/services/policy.store';
import { ToastService } from '../../core/services/toast.service';
import { parseIsoDate, weekdayOf } from '../../core/utils/dates';
import { apiErrorMessage } from '../../core/utils/http';
import { listStagger } from '../../shared/animations';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';
import { FieldErrorComponent } from '../../shared/ui/field-error.component';
import { Icons } from '../../shared/ui/icons';
import { ModalComponent } from '../../shared/ui/modal.component';

@Component({
  selector: 'app-holidays-tab',
  imports: [ReactiveFormsModule, LucideAngularModule, ModalComponent, EmptyStateComponent, FieldErrorComponent],
  animations: [listStagger],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-1 rounded-2xl border border-slate-200 bg-white/70 p-1 dark:border-slate-800 dark:bg-slate-900/70">
        <button type="button" class="btn btn-ghost btn-icon" (click)="shift(-1)" aria-label="Previous year"><lucide-icon [img]="icons.ChevronLeft" [size]="16" /></button>
        <span class="min-w-16 text-center font-mono text-sm font-bold">{{ year() }}</span>
        <button type="button" class="btn btn-ghost btn-icon" (click)="shift(1)" aria-label="Next year"><lucide-icon [img]="icons.ChevronRight" [size]="16" /></button>
      </div>
      @if (canEdit()) {
        <button type="button" class="btn btn-primary" (click)="openCreate()"><lucide-icon [img]="icons.CalendarPlus" [size]="16" /> Add holiday</button>
      }
    </div>

    @if (loading()) {
      <div class="skeleton h-64"></div>
    } @else if (items().length === 0) {
      <app-empty-state art="calendar" tone="teal" [title]="'No public holidays for ' + year()" description="Holidays are skipped automatically in leave working-day counts, attendance and payroll.">
        @if (canEdit()) {
          <button type="button" class="btn btn-primary" (click)="openCreate()"><lucide-icon [img]="icons.CalendarPlus" [size]="16" /> Add first holiday</button>
        }
      </app-empty-state>
    } @else {
      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" [@listStagger]="items().length">
        @for (h of items(); track h.id) {
          <article class="card card-hover group flex items-center gap-4 p-4" [class.opacity-60]="h.date < today()">
            <div class="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-600 text-center text-white shadow-md shadow-emerald-500/25">
              <div>
                <p class="text-[10px] font-bold uppercase tracking-wider opacity-80">{{ monthShort(h.date) }}</p>
                <p class="text-2xl font-extrabold leading-none">{{ h.date.slice(8) }}</p>
              </div>
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate font-semibold text-slate-900 dark:text-white">{{ h.name }}</p>
              <p class="text-xs text-slate-500 dark:text-slate-400">{{ weekday(h.date) }}{{ h.date < today() ? ' · passed' : '' }}</p>
              @if (h.description) {
                <p class="mt-0.5 truncate text-xs text-slate-400">{{ h.description }}</p>
              }
            </div>
            @if (canEdit()) {
              <div class="flex flex-col gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
                <button type="button" class="btn btn-ghost btn-icon" (click)="openEdit(h)" [attr.aria-label]="'Edit ' + h.name"><lucide-icon [img]="icons.Pencil" [size]="14" /></button>
                <button type="button" class="btn btn-ghost btn-icon text-rose-500" (click)="remove(h)" [attr.aria-label]="'Delete ' + h.name"><lucide-icon [img]="icons.Trash2" [size]="14" /></button>
              </div>
            }
          </article>
        }
      </div>
    }

    <app-modal [open]="modalOpen()" [title]="editing() ? 'Edit holiday' : 'Add public holiday'" [icon]="icons.PartyPopper" tone="teal" (closed)="modalOpen.set(false)">
      <form [formGroup]="form" (ngSubmit)="save()" id="hol-form" class="space-y-4">
        <div>
          <label class="label" for="hn">Name</label>
          <input id="hn" class="input" formControlName="name" placeholder="e.g. Independence Day" />
          <app-field-error [control]="form.controls.name" label="Name" />
        </div>
        <div>
          <label class="label" for="hd">Date</label>
          <input id="hd" type="date" class="input" formControlName="date" />
          <app-field-error [control]="form.controls.date" label="Date" />
        </div>
        <div>
          <label class="label" for="hx">Description</label>
          <input id="hx" class="input" formControlName="description" placeholder="Optional" />
        </div>
      </form>
      <div modal-footer class="flex justify-end gap-2 border-t border-slate-100 px-5 py-4 dark:border-slate-800 sm:px-6">
        <button type="button" class="btn btn-secondary" (click)="modalOpen.set(false)">Cancel</button>
        <button type="submit" form="hol-form" class="btn btn-primary" [disabled]="saving()">
          <lucide-icon [img]="saving() ? icons.LoaderCircle : icons.Check" [size]="16" [class.animate-spin]="saving()" /> {{ editing() ? 'Save changes' : 'Add holiday' }}
        </button>
      </div>
    </app-modal>
  `,
})
export class HolidaysTabComponent implements OnInit {
  private readonly org = inject(OrgService);
  private readonly policies = inject(PolicyStore);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly fb = inject(FormBuilder);
  protected readonly icons = Icons;

  readonly canEdit = input(false);

  protected readonly year = signal(Number(this.policies.today().slice(0, 4)));
  protected readonly items = signal<Holiday[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly modalOpen = signal(false);
  protected readonly editing = signal<Holiday | null>(null);
  protected readonly today = computed(() => {
    this.policies.policies();
    return this.policies.today();
  });

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    date: ['', Validators.required],
    description: ['', Validators.maxLength(500)],
  });

  ngOnInit(): void {
    this.load();
  }

  protected shift(delta: number): void {
    this.year.update((y) => y + delta);
    this.load();
  }

  protected monthShort(iso: string): string {
    return new Intl.DateTimeFormat('en-GB', { month: 'short' }).format(parseIsoDate(iso));
  }

  protected weekday(iso: string): string {
    return weekdayOf(iso);
  }

  protected openCreate(): void {
    this.editing.set(null);
    this.form.reset({ name: '', date: `${this.year()}-01-01` > this.today() ? `${this.year()}-01-01` : this.today(), description: '' });
    this.modalOpen.set(true);
  }

  protected openEdit(h: Holiday): void {
    this.editing.set(h);
    this.form.reset({ name: h.name, date: h.date, description: h.description ?? '' });
    this.modalOpen.set(true);
  }

  protected save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    const payload = { name: v.name.trim(), date: v.date, description: v.description.trim() };
    const editing = this.editing();
    this.saving.set(true);
    (editing ? this.org.updateHoliday(editing.id, payload) : this.org.createHoliday(payload)).subscribe({
      next: () => {
        this.saving.set(false);
        this.modalOpen.set(false);
        this.toast.success(editing ? 'Holiday updated' : 'Holiday added', `${payload.name} · ${payload.date}`);
        this.policies.refresh();
        if (payload.date.slice(0, 4) !== String(this.year())) this.year.set(Number(payload.date.slice(0, 4)));
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error('Could not save holiday', apiErrorMessage(err));
      },
    });
  }

  protected async remove(h: Holiday): Promise<void> {
    const ok = await this.confirm.confirm({ title: `Delete ${h.name}?`, message: 'The day becomes a regular working day again.', confirmText: 'Delete', tone: 'danger', icon: 'trash' });
    if (!ok) return;
    this.org.deleteHoliday(h.id).subscribe({
      next: () => {
        this.toast.success('Holiday deleted', h.name);
        this.policies.refresh();
        this.load();
      },
      error: (err) => this.toast.error('Could not delete', apiErrorMessage(err)),
    });
  }

  private load(): void {
    this.loading.set(true);
    this.org.holidays({ year: this.year() }).subscribe({
      next: (items) => {
        this.items.set([...items].sort((a, b) => a.date.localeCompare(b.date)));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
