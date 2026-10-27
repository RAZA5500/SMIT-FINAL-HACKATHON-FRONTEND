import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { AttendanceService } from '../../core/services/attendance.service';
import { CheckInStore } from '../../core/services/check-in.store';
import { PolicyStore } from '../../core/services/policy.store';
import { ToastService } from '../../core/services/toast.service';
import { apiErrorMessage } from '../../core/utils/http';
import { atLeastOne, orderedRange } from '../../core/utils/validators';
import { FieldErrorComponent } from '../ui/field-error.component';
import { Icons } from '../ui/icons';
import { ModalComponent } from '../ui/modal.component';

/** "Request correction with reason" — reviewed and approved/rejected by HR. */
@Component({
  selector: 'app-correction-request',
  imports: [LucideAngularModule, ReactiveFormsModule, ModalComponent, FieldErrorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal
      [open]="open()"
      [icon]="icons.Wrench"
      tone="blue"
      title="Request attendance correction"
      subtitle="HR reviews your request; the record updates once approved."
      (closed)="store.closeCorrection()"
    >
      <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-4" id="correction-form">
        <div>
          <label class="label" for="cr-date">Date</label>
          <input id="cr-date" type="date" class="input" formControlName="date" [max]="today()" />
          <app-field-error [control]="form.controls.date" label="Date" [show]="submitted()" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="label" for="cr-in">Check-in time</label>
            <input id="cr-in" type="time" class="input" formControlName="requestedCheckIn" />
          </div>
          <div>
            <label class="label" for="cr-out">Check-out time</label>
            <input id="cr-out" type="time" class="input" formControlName="requestedCheckOut" />
          </div>
        </div>
        @if ((submitted() || form.touched) && form.errors?.['atLeastOne']) {
          <p class="field-error -mt-2">Enter a check-in and/or check-out time.</p>
        }
        @if (form.errors?.['timeOrder']) {
          <p class="field-error -mt-2">Check-out must be after check-in.</p>
        }
        <div>
          <label class="label" for="cr-reason">Reason</label>
          <textarea id="cr-reason" rows="3" class="input resize-none" formControlName="reason" placeholder="e.g. Forgot to check out — was in a client meeting until 6 PM"></textarea>
          <app-field-error [control]="form.controls.reason" label="Reason" [show]="submitted()" />
        </div>
        @if (error()) {
          <p class="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{{ error() }}</p>
        }
      </form>
      <div modal-footer class="flex justify-end gap-2 border-t border-slate-200 px-5 py-4 dark:border-slate-800 sm:px-6">
        <button type="button" class="btn btn-secondary" (click)="store.closeCorrection()">Cancel</button>
        <button type="submit" form="correction-form" class="btn btn-primary" [disabled]="saving()">
          <lucide-icon [img]="saving() ? icons.LoaderCircle : icons.Send" [size]="16" [class.animate-spin]="saving()" />
          Send to HR
        </button>
      </div>
    </app-modal>
  `,
})
export class CorrectionRequestComponent {
  protected readonly store = inject(CheckInStore);
  private readonly api = inject(AttendanceService);
  private readonly policies = inject(PolicyStore);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  protected readonly icons = Icons;

  protected readonly open = computed(() => this.store.correctionDraft() !== null);
  protected readonly saving = signal(false);
  protected readonly submitted = signal(false);
  protected readonly error = signal('');
  protected readonly today = computed(() => {
    this.policies.policies();
    return this.policies.today();
  });

  protected readonly form = this.fb.nonNullable.group(
    {
      date: ['', Validators.required],
      requestedCheckIn: [''],
      requestedCheckOut: [''],
      reason: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(500)]],
    },
    { validators: [atLeastOne(['requestedCheckIn', 'requestedCheckOut']), orderedRange('requestedCheckIn', 'requestedCheckOut', 'timeOrder', false)] },
  );

  constructor() {
    effect(() => {
      const draft = this.store.correctionDraft();
      if (!draft) return;
      untracked(() => {
        this.submitted.set(false);
        this.error.set('');
        this.form.reset({
          date: draft.date ?? this.policies.today(),
          requestedCheckIn: draft.requestedCheckIn ?? '',
          requestedCheckOut: draft.requestedCheckOut ?? '',
          reason: draft.reason ?? '',
        });
      });
    });
  }

  protected submit(): void {
    this.submitted.set(true);
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    this.saving.set(true);
    this.error.set('');
    this.api
      .requestCorrection({
        date: v.date,
        reason: v.reason.trim(),
        ...(v.requestedCheckIn ? { requestedCheckIn: v.requestedCheckIn } : {}),
        ...(v.requestedCheckOut ? { requestedCheckOut: v.requestedCheckOut } : {}),
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.toast.success('Correction requested', 'HR has been notified and will review it.');
          this.store.markChanged();
          this.store.closeCorrection();
        },
        error: (err) => {
          this.saving.set(false);
          this.error.set(apiErrorMessage(err));
        },
      });
  }
}
