import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import {
  Department,
  PayrollRun,
  PayrollRunDetail,
  PayrollStatus,
  Payslip,
} from '../../core/models/api.models';
import { AuthService } from '../../core/services/auth.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { FileService } from '../../core/services/file.service';
import { OrgService } from '../../core/services/org.service';
import { PayrollService } from '../../core/services/payroll.service';
import { PolicyStore } from '../../core/services/policy.store';
import { ToastService } from '../../core/services/toast.service';
import { formatMoney } from '../../core/utils/format';
import { apiErrorMessage } from '../../core/utils/http';
import { SalaryBreakdown, describeSlab, salaryBreakdown } from '../../core/utils/payroll-math';
import { PayslipViewerComponent } from '../../shared/domain/payslip-viewer.component';
import { FORMAT_PIPES } from '../../shared/pipes/format.pipes';
import { AvatarComponent, StatusBadgeComponent } from '../../shared/ui/badges';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';
import { Icons } from '../../shared/ui/icons';
import { ModalComponent } from '../../shared/ui/modal.component';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { SegmentedTabsComponent, TabItem } from '../../shared/ui/segmented-tabs.component';

@Component({
  selector: 'app-payroll',
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    PageHeaderComponent,
    SegmentedTabsComponent,
    EmptyStateComponent,
    AvatarComponent,
    StatusBadgeComponent,
    ModalComponent,
    PayslipViewerComponent,
    FORMAT_PIPES,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header
      title="Payroll Studio"
      [subtitle]="auth.isManager() ? 'Draft and finalize monthly payroll runs, calculate tax slabs and generate official PDF payslips.' : 'Access and download your official monthly payslips and review your earnings breakdown.'"
    >
      <div header-actions class="flex flex-wrap items-center gap-2">
        @if (auth.isManager()) {
          <button type="button" class="btn btn-secondary" (click)="calculatorOpen.set(true)">
            <lucide-icon [img]="icons.Calculator" [size]="16" /> Live salary calculator
          </button>
        }
      </div>
    </app-page-header>

    @if (auth.isManager()) {
      <!-- Manager Tabs -->
      <div class="mb-6">
        <app-segmented-tabs [tabs]="managerTabs()" [(active)]="activeTab" />
      </div>

      <!-- Tab 1: Monthly Payroll Runs -->
      @if (activeTab() === 'runs') {
        <div class="space-y-6">
          <!-- Month Selector Ribbon -->
          <div class="card flex flex-wrap items-center justify-between gap-4 p-4">
            <div class="flex flex-wrap items-center gap-3">
              <div class="flex items-center gap-2">
                <label for="payroll-month" class="text-xs font-semibold uppercase tracking-wider text-slate-500">Month:</label>
                <input
                  id="payroll-month"
                  type="month"
                  class="input input-sm max-w-[170px]"
                  [ngModel]="selectedMonth()"
                  (ngModelChange)="onMonthChange($event)"
                />
              </div>

              @if (currentRun()) {
                <div class="flex items-center gap-2">
                  <app-status-badge [status]="currentRun()!.status" />
                  @if (currentRun()!.status === 'finalized') {
                    <span class="inline-flex items-center gap-1 text-xs text-slate-500">
                      <lucide-icon [img]="icons.Lock" [size]="12" /> Finalized & Locked
                    </span>
                  }
                </div>
              }
            </div>

            <!-- Run Actions -->
            <div class="flex flex-wrap items-center gap-2">
              @if (!currentRun()) {
                @if (auth.isHr()) {
                  <button type="button" class="btn btn-primary btn-sm" (click)="createDraftRun()" [disabled]="runBusy()">
                    <lucide-icon [img]="runBusy() ? icons.LoaderCircle : icons.Plus" [size]="15" [class.animate-spin]="runBusy()" /> Generate Draft for {{ selectedMonth() | month: true }}
                  </button>
                }
              } @else {
                <!-- Draft Run Actions (HR) -->
                @if (currentRun()!.status === 'draft') {
                  @if (auth.isHr()) {
                    <button type="button" class="btn btn-secondary btn-sm" (click)="recalculateRun()" [disabled]="runBusy()">
                      <lucide-icon [img]="runBusy() ? icons.LoaderCircle : icons.RefreshCw" [size]="14" [class.animate-spin]="runBusy()" /> Recalculate
                    </button>
                    <button type="button" class="btn btn-ghost btn-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10" (click)="deleteDraftRun()" [disabled]="runBusy()">
                      <lucide-icon [img]="icons.Trash2" [size]="14" /> Delete draft
                    </button>
                  }
                  <!-- Admin Finalize & Lock Action -->
                  @if (auth.isAdmin()) {
                    <button type="button" class="btn btn-primary btn-sm" (click)="finalizeRun()" [disabled]="runBusy()">
                      <lucide-icon [img]="icons.Lock" [size]="14" /> Finalize & Lock Month
                    </button>
                  }
                } @else {
                  <!-- Finalized locked badge -->
                  <span class="badge bg-slate-900 text-white ring-slate-900 dark:bg-white dark:text-slate-900">
                    <lucide-icon [img]="icons.Lock" [size]="13" /> Locked & Immutable
                  </span>
                }
              }
            </div>
          </div>

          <!-- Current Run Totals Card -->
          @if (currentRun(); as run) {
            <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <div class="card p-4">
                <p class="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Employees</p>
                <p class="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{{ run.totals.employees }}</p>
              </div>
              <div class="card p-4">
                <p class="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Gross total</p>
                <p class="mt-1 text-xl font-bold text-slate-900 dark:text-white">{{ run.totals.gross | money }}</p>
              </div>
              <div class="card p-4">
                <p class="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Prorated gross</p>
                <p class="mt-1 text-xl font-bold text-slate-900 dark:text-white">{{ run.totals.proratedGross | money }}</p>
              </div>
              <div class="card p-4">
                <p class="text-[11px] font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">Attendance deductions</p>
                <p class="mt-1 text-xl font-bold text-rose-600 dark:text-rose-400">− {{ run.totals.attendanceDeduction | money }}</p>
              </div>
              <div class="card p-4">
                <p class="text-[11px] font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">Tax withheld</p>
                <p class="mt-1 text-xl font-bold text-rose-600 dark:text-rose-400">− {{ run.totals.tax | money }}</p>
              </div>
              <div class="card p-4 bg-emerald-500/5 ring-1 ring-emerald-500/20">
                <p class="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Net payout</p>
                <p class="mt-1 text-xl font-extrabold text-emerald-600 dark:text-emerald-400">{{ run.totals.net | money }}</p>
              </div>
            </div>

            <!-- Payslips Table -->
            <div class="card overflow-hidden">
              <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 dark:border-slate-800">
                <div class="flex items-center gap-3">
                  <h3 class="section-title">Payslips for {{ run.month | month }}</h3>
                  <span class="text-xs text-slate-400">Working days: {{ run.workingDaysInMonth }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <div class="relative">
                    <lucide-icon [img]="icons.Search" [size]="14" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search employee..."
                      class="input input-sm pl-8 max-w-[200px]"
                      [ngModel]="searchQuery()"
                      (ngModelChange)="searchQuery.set($event)"
                    />
                  </div>
                </div>
              </div>

              <div class="table-wrap">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Dept & Role</th>
                      <th>Days (W/P/L/A)</th>
                      <th>Gross</th>
                      <th>Deductions</th>
                      <th>Tax</th>
                      <th>Net Pay</th>
                      <th class="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    @if (filteredPayslips().length === 0) {
                      <tr>
                        <td colspan="8">
                          <app-empty-state
                            [compact]="true"
                            art="payroll"
                            tone="slate"
                            title="No payslips found"
                            description="No employee payslips match the filter."
                          />
                        </td>
                      </tr>
                    }
                    @for (p of filteredPayslips(); track p.id) {
                      <tr>
                        <td>
                          <div class="flex items-center gap-2.5">
                            <app-avatar [name]="p.employee.fullName" size="sm" />
                            <div>
                              <p class="font-semibold text-slate-900 dark:text-white">{{ p.employee.fullName }}</p>
                              <p class="text-xs text-slate-400">{{ p.employee.code }}</p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <p class="text-sm font-medium">{{ p.employee.departmentName || '—' }}</p>
                          <p class="text-xs text-slate-400">{{ p.employee.designationName || '—' }}</p>
                        </td>
                        <td class="font-mono text-xs">
                          <div title="Working / Present / Late / Half-Day / Unpaid / Absent">
                            <span class="text-slate-600 dark:text-slate-300 font-semibold">{{ p.eligibleWorkingDays }}w</span> ·
                            <span class="text-emerald-600 dark:text-emerald-400">{{ p.eligibleWorkingDays - p.absentDays }}p</span> ·
                            <span class="text-blue-500" [title]="p.latePenaltyDays > 0 ? 'Late arrivals incurred ' + p.latePenaltyDays + ' days penalty (3 lates = 0.5d)' : ''">
                              {{ p.lateCount }}l @if (p.latePenaltyDays > 0) { <span class="text-rose-500 font-bold">(-{{ p.latePenaltyDays }}d)</span> }
                            </span>
                            @if (p.halfDays > 0) {
                              · <span class="text-amber-500 font-semibold" title="Half days worked">{{ p.halfDays }}hd</span>
                            }
                            @if (p.unpaidLeaveDays > 0) {
                              · <span class="text-orange-500 font-semibold" title="Unpaid leave days">{{ p.unpaidLeaveDays }}u</span>
                            }
                            · <span class="text-rose-500 font-semibold" title="Absent days">{{ p.absentDays }}a</span>
                          </div>
                        </td>
                        <td class="font-mono text-sm font-semibold">
                          {{ p.proratedGross | money: p.currency }}
                          @if (p.proratedGross !== p.gross) {
                            <span class="block text-[11px] font-normal text-amber-500">Prorated</span>
                          }
                        </td>
                        <td class="font-mono text-sm text-rose-600 dark:text-rose-400" [title]="p.attendanceDeduction > 0 ? 'Deduction: ' + p.deductionDays + ' days · ' + (p.attendanceDeduction | money: p.currency) : 'No attendance deduction'">
                          {{ p.attendanceDeduction > 0 ? '− ' + (p.attendanceDeduction | money: p.currency) : '—' }}
                        </td>
                        <td class="font-mono text-sm text-slate-600 dark:text-slate-300" [title]="'Annualized Gross: ' + (p.annualGross | money: p.currency) + ' · Annual Tax: ' + (p.annualTax | money: p.currency) + ' · Monthly: ' + (p.monthlyTax | money: p.currency)">
                          {{ p.monthlyTax > 0 ? (p.monthlyTax | money: p.currency) : '0' }}
                        </td>
                        <td class="font-mono text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                          {{ p.netPay | money: p.currency }}
                        </td>
                        <td class="text-right">
                          <div class="flex justify-end gap-1.5">
                            <button type="button" class="btn btn-ghost btn-sm" (click)="selectedPayslip.set(p)" title="Preview Payslip">
                              <lucide-icon [img]="icons.Receipt" [size]="14" /> View
                            </button>
                            <button
                              type="button"
                              class="btn btn-ghost btn-sm text-emerald-600 dark:text-emerald-400"
                              (click)="downloadPdf(p)"
                              [disabled]="fileService.downloadingPayslip() === p.id"
                              title="Download PDF"
                            >
                              <lucide-icon
                                [img]="fileService.downloadingPayslip() === p.id ? icons.LoaderCircle : icons.Download"
                                [size]="14"
                                [class.animate-spin]="fileService.downloadingPayslip() === p.id"
                              />
                            </button>
                          </div>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          } @else {
            <app-empty-state
              art="payroll"
              tone="amber"
              title="No payroll run for this month"
              [description]="auth.isHr() ? 'Generate a draft payroll run to calculate working days, attendance deductions, tax slabs and net pay.' : 'HR has not prepared a payroll draft for this month yet.'"
            >
              @if (auth.isHr()) {
                <button type="button" class="btn btn-primary mt-4" (click)="createDraftRun()" [disabled]="runBusy()">
                  <lucide-icon [img]="runBusy() ? icons.LoaderCircle : icons.Plus" [size]="16" [class.animate-spin]="runBusy()" />
                  Generate Draft for {{ selectedMonth() | month }}
                </button>
              }
            </app-empty-state>
          }
        </div>
      }

      <!-- Tab 2: My Payslips (for manager's own self-service) -->
      @if (activeTab() === 'self') {
        <ng-container *ngTemplateOutlet="myPayslipsTpl"></ng-container>
      }
    } @else {
      <!-- Non-Manager (Employee View) -->
      <ng-container *ngTemplateOutlet="myPayslipsTpl"></ng-container>
    }

    <!-- Reusable My Payslips Template -->
    <ng-template #myPayslipsTpl>
      <div class="space-y-6">
        <div class="card p-5">
          <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 class="section-title">My Official Payslips</h3>
              <p class="text-xs text-slate-500">Download PDF copies for your personal records or visa applications</p>
            </div>
            <button type="button" class="btn btn-ghost btn-sm" (click)="loadMyPayslips()">
              <lucide-icon [img]="icons.RefreshCw" [size]="14" /> Refresh
            </button>
          </div>

          @if (myPayslips().length === 0) {
            <app-empty-state
              art="payroll"
              tone="emerald"
              title="No payslips available"
              description="Your payslips will appear here once the monthly payroll is finalized by Admin."
            />
          } @else {
            <div class="table-wrap">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Basic</th>
                    <th>Gross</th>
                    <th>Deductions</th>
                    <th>Net Payout</th>
                    <th>Status</th>
                    <th class="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  @for (p of myPayslips(); track p.id) {
                    <tr>
                      <td class="font-semibold">{{ p.month | month }}</td>
                      <td class="font-mono text-sm">{{ p.basic | money: p.currency }}</td>
                      <td class="font-mono text-sm font-semibold">{{ p.gross | money: p.currency }}</td>
                      <td class="font-mono text-sm text-rose-600 dark:text-rose-400">
                        {{ p.attendanceDeduction + p.monthlyTax > 0 ? '− ' + (p.attendanceDeduction + p.monthlyTax | money: p.currency) : '—' }}
                      </td>
                      <td class="font-mono text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                        {{ p.netPay | money: p.currency }}
                      </td>
                      <td>
                        <app-status-badge [status]="p.status" />
                      </td>
                      <td class="text-right">
                        <div class="flex justify-end gap-1.5">
                          <button type="button" class="btn btn-ghost btn-sm" (click)="selectedPayslip.set(p)">
                            <lucide-icon [img]="icons.Receipt" [size]="14" /> View
                          </button>
                          <button
                            type="button"
                            class="btn btn-primary btn-sm"
                            (click)="downloadPdf(p)"
                            [disabled]="fileService.downloadingPayslip() === p.id"
                          >
                            <lucide-icon
                              [img]="fileService.downloadingPayslip() === p.id ? icons.LoaderCircle : icons.Download"
                              [size]="14"
                              [class.animate-spin]="fileService.downloadingPayslip() === p.id"
                            /> PDF
                          </button>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      </div>
    </ng-template>

    <!-- Payslip Viewer Modal -->
    <app-payslip-viewer [payslip]="selectedPayslip()" (closed)="selectedPayslip.set(null)" />

    <!-- Live Salary Structure Calculator Modal (Signals-Powered) -->
    <app-modal
      [open]="calculatorOpen()"
      title="Live Salary Structure Calculator"
      subtitle="Reactively computes HRA, Medical, Gross (1.5x Basic) and Annualized Tax Slabs based on company policies."
      tone="emerald"
      [icon]="icons.Calculator"
      size="lg"
      (closed)="calculatorOpen.set(false)"
    >
      <div class="space-y-5">
        <div>
          <label class="label" for="calc-basic">Basic Salary (Monthly)</label>
          <div class="relative">
            <input
              id="calc-basic"
              type="number"
              class="input text-lg font-mono font-bold pl-12"
              placeholder="e.g. 100000"
              [(ngModel)]="calcBasicInput"
              min="0"
              step="1000"
            />
            <span class="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs font-bold text-slate-400">
              {{ policies.currency() }}
            </span>
          </div>
        </div>

        @if (calcBreakdown(); as b) {
          <div class="grid gap-4 sm:grid-cols-2">
            <!-- Earnings -->
            <div class="rounded-2xl border border-slate-100 p-4 dark:border-slate-800">
              <h4 class="eyebrow mb-3">Earnings Breakdown</h4>
              <dl class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <dt class="text-slate-500">Basic Salary</dt>
                  <dd class="font-mono font-medium">{{ b.basic | money }}</dd>
                </div>
                <div class="flex justify-between">
                  <dt class="text-slate-500">House Rent Allowance (HRA 40%)</dt>
                  <dd class="font-mono font-medium">{{ b.hra | money }}</dd>
                </div>
                <div class="flex justify-between">
                  <dt class="text-slate-500">Medical Allowance (10%)</dt>
                  <dd class="font-mono font-medium">{{ b.medical | money }}</dd>
                </div>
                <div class="flex justify-between border-t border-dashed border-slate-200 pt-2 dark:border-slate-700">
                  <dt class="font-bold">Gross Monthly (1.5x Basic)</dt>
                  <dd class="font-mono font-bold text-slate-900 dark:text-white">{{ b.gross | money }}</dd>
                </div>
                <div class="flex justify-between text-xs text-slate-400">
                  <dt>Annualized Gross (12x)</dt>
                  <dd class="font-mono">{{ b.annualGross | money }}</dd>
                </div>
              </dl>
            </div>

            <!-- Tax & Net Payout -->
            <div class="rounded-2xl border border-slate-100 p-4 dark:border-slate-800">
              <h4 class="eyebrow mb-3">Tax Slab & Net Payout</h4>
              <dl class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <dt class="text-slate-500">Applicable Tax Slab</dt>
                  <dd class="font-medium text-xs text-right text-slate-700 dark:text-slate-300 max-w-[160px] truncate" [title]="slabDesc()">
                    {{ slabDesc() }}
                  </dd>
                </div>
                <div class="flex justify-between">
                  <dt class="text-slate-500">Annual Income Tax</dt>
                  <dd class="font-mono font-medium text-rose-600 dark:text-rose-400">{{ b.annualTax | money }}</dd>
                </div>
                <div class="flex justify-between">
                  <dt class="text-slate-500">Monthly Tax Withholding</dt>
                  <dd class="font-mono font-medium text-rose-600 dark:text-rose-400">− {{ b.monthlyTax | money }}</dd>
                </div>
                <div class="flex justify-between border-t border-dashed border-slate-200 pt-2 dark:border-slate-700">
                  <dt class="font-bold">Net Full-Month Pay</dt>
                  <dd class="font-mono font-extrabold text-emerald-600 dark:text-emerald-400">{{ b.netFullMonth | money }}</dd>
                </div>
              </dl>
            </div>
          </div>
        }
      </div>

      <div modal-footer class="flex justify-end border-t border-slate-100 px-5 py-4 dark:border-slate-800 sm:px-6">
        <button type="button" class="btn btn-secondary" (click)="calculatorOpen.set(false)">Done</button>
      </div>
    </app-modal>
  `,
})
export class PayrollComponent implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly payrollService = inject(PayrollService);
  private readonly orgService = inject(OrgService);
  protected readonly policies = inject(PolicyStore);
  protected readonly fileService = inject(FileService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  protected readonly icons = Icons;

  protected readonly activeTab = signal('runs');
  protected readonly selectedMonth = signal(new Date().toISOString().slice(0, 7));
  protected readonly currentRun = signal<PayrollRunDetail | null>(null);
  protected readonly runBusy = signal(false);
  protected readonly searchQuery = signal('');

  // Self-Service State
  protected readonly myPayslips = signal<Payslip[]>([]);

  // Selected Payslip for Viewer
  protected readonly selectedPayslip = signal<Payslip | null>(null);

  // Live Calculator State
  protected readonly calculatorOpen = signal(false);
  protected readonly calcBasicInput = signal(100000);

  protected readonly managerTabs = computed<TabItem[]>(() => {
    const tabs: TabItem[] = [
      { id: 'runs', label: 'Monthly Payroll Run', icon: Icons.Banknote },
    ];
    if (this.auth.hasEmployeeProfile()) {
      tabs.push({ id: 'self', label: 'My Payslips', icon: Icons.Receipt });
    }
    return tabs;
  });

  protected readonly calcBreakdown = computed<SalaryBreakdown>(() => {
    const p = this.policies.policies();
    const hraRate = p?.payroll?.hraRate ?? 0.4;
    const medicalRate = p?.payroll?.medicalRate ?? 0.1;
    const slabs = p?.payroll?.taxSlabs ?? [];
    return salaryBreakdown(this.calcBasicInput(), { hraRate, medicalRate }, slabs);
  });

  protected readonly slabDesc = computed(() => {
    const b = this.calcBreakdown();
    const curr = this.policies.currency();
    return describeSlab(b.slab, (n) => formatMoney(n, curr, true));
  });

  protected readonly filteredPayslips = computed<Payslip[]>(() => {
    const run = this.currentRun();
    if (!run) return [];
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) return run.payslips;
    return run.payslips.filter(
      (p) =>
        p.employee.fullName.toLowerCase().includes(q) ||
        p.employee.code.toLowerCase().includes(q) ||
        (p.employee.departmentName && p.employee.departmentName.toLowerCase().includes(q)),
    );
  });

  ngOnInit(): void {
    if (this.auth.isManager()) {
      this.loadMonthRun(this.selectedMonth());
    }
    if (this.auth.hasEmployeeProfile()) {
      this.loadMyPayslips();
    }
  }

  protected onMonthChange(month: string): void {
    this.selectedMonth.set(month);
    this.loadMonthRun(month);
  }

  protected loadMonthRun(month: string): void {
    this.runBusy.set(true);
    // Find run for this month
    this.payrollService.runs({ limit: 100 }).subscribe({
      next: (res) => {
        const found = res.data.find((r) => r.month === month);
        if (found) {
          this.payrollService.run(found.id).subscribe({
            next: (detail) => {
              this.currentRun.set(detail);
              this.runBusy.set(false);
            },
            error: () => {
              this.currentRun.set(null);
              this.runBusy.set(false);
            },
          });
        } else {
          this.currentRun.set(null);
          this.runBusy.set(false);
        }
      },
      error: () => {
        this.currentRun.set(null);
        this.runBusy.set(false);
      },
    });
  }

  protected loadMyPayslips(): void {
    this.payrollService.myPayslips({ limit: 50 }).subscribe({
      next: (res) => this.myPayslips.set(res.data),
      error: () => undefined,
    });
  }

  protected createDraftRun(): void {
    this.runBusy.set(true);
    this.payrollService.createRun(this.selectedMonth()).subscribe({
      next: (run) => {
        this.currentRun.set(run);
        this.runBusy.set(false);
        this.toast.success('Payroll draft generated', `Calculated for ${run.totals.employees} employees.`);
      },
      error: (err) => {
        this.runBusy.set(false);
        this.toast.error('Draft generation failed', apiErrorMessage(err));
      },
    });
  }

  protected recalculateRun(): void {
    const run = this.currentRun();
    if (!run) return;

    this.runBusy.set(true);
    this.payrollService.recalculate(run.id).subscribe({
      next: (updated) => {
        this.currentRun.set(updated);
        this.runBusy.set(false);
        this.toast.success('Payroll recalculated');
      },
      error: (err) => {
        this.runBusy.set(false);
        this.toast.error('Recalculation failed', apiErrorMessage(err));
      },
    });
  }

  protected async deleteDraftRun(): Promise<void> {
    const run = this.currentRun();
    if (!run) return;

    const ok = await this.confirm.confirm({
      title: `Delete draft payroll for ${run.month}?`,
      message: 'This removes all unfinalized payslips for this draft run. You can regenerate the draft anytime.',
      confirmText: 'Delete draft',
      tone: 'danger',
    });
    if (!ok) return;

    this.runBusy.set(true);
    this.payrollService.deleteRun(run.id).subscribe({
      next: () => {
        this.currentRun.set(null);
        this.runBusy.set(false);
        this.toast.success('Draft payroll deleted');
      },
      error: (err) => {
        this.runBusy.set(false);
        this.toast.error('Delete failed', apiErrorMessage(err));
      },
    });
  }

  protected async finalizeRun(): Promise<void> {
    const run = this.currentRun();
    if (!run) return;

    const ok = await this.confirm.confirm({
      title: `Finalize and lock payroll for ${run.month}?`,
      message: `Finalizing locks this payroll run permanently. Payslips become visible to employees and no further adjustments can be made.`,
      confirmText: 'Finalize & Lock',
      tone: 'primary',
      icon: 'lock',
    });
    if (!ok) return;

    this.runBusy.set(true);
    this.payrollService.finalize(run.id).subscribe({
      next: () => {
        this.toast.success('Payroll finalized and locked', 'Employees can now view and download their payslips.');
        this.loadMonthRun(this.selectedMonth());
      },
      error: (err) => {
        this.runBusy.set(false);
        this.toast.error('Finalization failed', apiErrorMessage(err));
      },
    });
  }

  protected downloadPdf(p: Payslip): void {
    this.fileService.downloadPayslip(p.id, p.month);
  }
}
