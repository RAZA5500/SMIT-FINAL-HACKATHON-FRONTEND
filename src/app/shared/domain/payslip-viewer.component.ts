import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { Payslip } from '../../core/models/api.models';
import { FileService } from '../../core/services/file.service';
import { PolicyStore } from '../../core/services/policy.store';
import { DayPipe, MoneyPipe, MonthPipe, NumPipe } from '../pipes/format.pipes';
import { AvatarComponent, StatusBadgeComponent } from '../ui/badges';
import { Icons } from '../ui/icons';
import { ModalComponent } from '../ui/modal.component';

/** Formatted payslip preview with one-click PDF download. */
@Component({
  selector: 'app-payslip-viewer',
  imports: [LucideAngularModule, ModalComponent, AvatarComponent, StatusBadgeComponent, MoneyPipe, MonthPipe, NumPipe, DayPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal [open]="!!payslip()" size="lg" [icon]="icons.Receipt" tone="emerald" [title]="'Payslip · ' + (payslip()?.month | month)" [subtitle]="policies.companyName()" (closed)="closed.emit()">
      @if (payslip(); as p) {
        <div class="space-y-5">
          <div class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
            <div class="flex items-center gap-3">
              <app-avatar [name]="p.employee.fullName" size="md" />
              <div>
                <p class="font-semibold text-slate-900 dark:text-white">{{ p.employee.fullName }}</p>
                <p class="text-xs text-slate-500 dark:text-slate-400">{{ p.employee.code }} · {{ p.employee.designationName || '—' }} · {{ p.employee.departmentName || '—' }}</p>
              </div>
            </div>
            <div class="text-right">
              <p class="text-xs text-slate-500 dark:text-slate-400">Net pay</p>
              <p class="num text-2xl font-semibold text-slate-900 dark:text-white">{{ p.netPay | money: p.currency }}</p>
            </div>
          </div>

          <div class="grid gap-4 md:grid-cols-2">
            <section class="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
              <h4 class="eyebrow mb-3">Earnings</h4>
              <dl class="space-y-2 text-sm">
                <div class="flex justify-between"><dt class="muted">Basic salary</dt><dd class="num font-medium">{{ p.basic | money: p.currency }}</dd></div>
                <div class="flex justify-between"><dt class="muted">House rent (HRA)</dt><dd class="num font-medium">{{ p.hra | money: p.currency }}</dd></div>
                <div class="flex justify-between"><dt class="muted">Medical</dt><dd class="num font-medium">{{ p.medical | money: p.currency }}</dd></div>
                <div class="flex justify-between border-t border-dashed border-slate-200 pt-2 dark:border-slate-700"><dt class="font-semibold">Gross (monthly)</dt><dd class="num font-semibold">{{ p.gross | money: p.currency }}</dd></div>
                @if (p.proratedGross !== p.gross) {
                  <div class="flex justify-between text-amber-700 dark:text-amber-400"><dt>Prorated gross ({{ p.eligibleWorkingDays }}/{{ p.workingDaysInMonth }} days)</dt><dd class="num font-semibold">{{ p.proratedGross | money: p.currency }}</dd></div>
                }
              </dl>
            </section>
            <section class="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
              <h4 class="eyebrow mb-3">Deductions</h4>
              <dl class="space-y-2 text-sm">
                <div class="flex justify-between"><dt class="muted">Attendance ({{ p.deductionDays | num: 1 }} days × {{ p.perDay | money: p.currency }})</dt><dd class="num font-medium text-rose-600 dark:text-rose-400">− {{ p.attendanceDeduction | money: p.currency }}</dd></div>
                <div class="flex justify-between"><dt class="muted">Income tax (monthly)</dt><dd class="num font-medium text-rose-600 dark:text-rose-400">− {{ p.monthlyTax | money: p.currency }}</dd></div>
                <div class="flex justify-between text-xs text-slate-400"><dt>Annual gross {{ p.annualGross | money: p.currency }} → annual tax</dt><dd class="num">{{ p.annualTax | money: p.currency }}</dd></div>
                <div class="flex justify-between border-t border-dashed border-slate-200 pt-2 dark:border-slate-700"><dt class="font-semibold">Net pay</dt><dd class="num font-semibold text-blue-600 dark:text-blue-400">{{ p.netPay | money: p.currency }}</dd></div>
              </dl>
            </section>
          </div>

          <section class="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
            <h4 class="eyebrow mb-3">Attendance summary</h4>
            <div class="grid grid-cols-2 gap-3 text-center sm:grid-cols-5">
              @for (s of stats(); track s.label) {
                <div class="rounded-lg bg-slate-50 px-2 py-3 dark:bg-slate-800/60">
                  <p class="text-lg font-semibold text-slate-900 dark:text-white">{{ s.value }}</p>
                  <p class="text-[11px] text-slate-500 dark:text-slate-400">{{ s.label }}</p>
                </div>
              }
            </div>
            @if (p.latePenaltyDays > 0) {
              <p class="mt-3 flex items-center gap-1.5 text-xs text-blue-700 dark:text-blue-300">
                <lucide-icon [img]="icons.Clock" [size]="13" /> Late penalty applied: {{ p.lateCount }} lates → {{ p.latePenaltyDays | num: 1 }} day deduction (3 lates = 0.5 day).
              </p>
            }
          </section>

          <p class="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <app-status-badge [status]="p.status" /> Joined {{ p.employee.joinDate | day }}@if (p.employee.exitDate) {<span> · Exit {{ p.employee.exitDate | day }}</span>}
          </p>
        </div>
      }
      <div modal-footer class="flex flex-col-reverse gap-2 border-t border-slate-200 px-5 py-4 dark:border-slate-800 sm:flex-row sm:justify-end sm:px-6">
        <button type="button" class="btn btn-secondary" (click)="closed.emit()">Close</button>
        @if (payslip(); as p) {
          <button type="button" class="btn btn-primary" [disabled]="files.downloadingPayslip() === p.id" (click)="files.downloadPayslip(p.id, p.month)">
            <lucide-icon [img]="files.downloadingPayslip() === p.id ? icons.LoaderCircle : icons.Download" [size]="16" [class.animate-spin]="files.downloadingPayslip() === p.id" />
            Download PDF
          </button>
        }
      </div>
    </app-modal>
  `,
})
export class PayslipViewerComponent {
  protected readonly policies = inject(PolicyStore);
  protected readonly files = inject(FileService);
  protected readonly icons = Icons;

  readonly payslip = input<Payslip | null>(null);
  readonly closed = output<void>();

  protected readonly stats = computed(() => {
    const p = this.payslip();
    if (!p) return [];
    return [
      { label: 'Working days', value: `${p.eligibleWorkingDays}/${p.workingDaysInMonth}` },
      { label: 'Absent', value: p.absentDays },
      { label: 'Unpaid leave', value: p.unpaidLeaveDays },
      { label: 'Half days', value: p.halfDays },
      { label: 'Late', value: p.lateCount },
    ];
  });
}
