import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import {
  Department,
  LeaveBalance,
  LeaveRequest,
  LeaveStatus,
  LeaveType,
  SmartLeaveResponse,
  WorkingDaysResponse,
} from '../../core/models/api.models';
import { AiService } from '../../core/services/ai.service';
import { ApprovalsStore } from '../../core/services/approvals.store';
import { AuthService } from '../../core/services/auth.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { LeaveService } from '../../core/services/leave.service';
import { OrgService } from '../../core/services/org.service';
import { PolicyStore } from '../../core/services/policy.store';
import { ToastService } from '../../core/services/toast.service';
import { celebrate } from '../../core/utils/celebrate';
import { apiErrorMessage } from '../../core/utils/http';
import { LeaveBalancesComponent } from '../../shared/domain/leave-balances.component';
import { FORMAT_PIPES } from '../../shared/pipes/format.pipes';
import { AvatarComponent, StatusBadgeComponent } from '../../shared/ui/badges';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';
import { FieldErrorComponent } from '../../shared/ui/field-error.component';
import { Icons } from '../../shared/ui/icons';
import { ModalComponent } from '../../shared/ui/modal.component';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { SegmentedTabsComponent, TabItem } from '../../shared/ui/segmented-tabs.component';

@Component({
  selector: 'app-leave',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    LucideAngularModule,
    PageHeaderComponent,
    SegmentedTabsComponent,
    EmptyStateComponent,
    AvatarComponent,
    StatusBadgeComponent,
    ModalComponent,
    FieldErrorComponent,
    LeaveBalancesComponent,
    FORMAT_PIPES,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header
      title="Leave Management"
      [subtitle]="auth.isManager() ? 'Review leave balances, approve requests with AI assistance and track company time off.' : 'Apply for time off with AI assistance, track leave balances and view request history.'"
    >
      <div header-actions class="flex flex-wrap items-center gap-2">
        @if (auth.hasEmployeeProfile()) {
          <button type="button" class="btn btn-primary" (click)="openApplyModal()">
            <lucide-icon [img]="icons.Plus" [size]="16" /> Apply for leave
          </button>
        }
      </div>
    </app-page-header>

    @if (auth.isManager()) {
      <!-- Manager Segmented Tabs -->
      <div class="mb-6">
        <app-segmented-tabs [tabs]="managerTabs()" [(active)]="activeTab" />
      </div>

      <!-- Tab 1: Approval Inbox -->
      @if (activeTab() === 'inbox') {
        <div class="space-y-6">
          <div class="card flex flex-wrap items-center justify-between gap-4 p-4">
            <div class="flex flex-wrap items-center gap-3">
              <span class="text-xs font-medium text-slate-500">Filter status:</span>
              <div class="flex gap-1">
                @for (s of ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'ALL']; track s) {
                  <button type="button" class="pill" [class.pill-active]="inboxFilter() === s" (click)="setInboxFilter(s)">
                    {{ s.charAt(0) + s.slice(1).toLowerCase() }}
                    @if (s === 'PENDING' && approvals.pendingLeave() > 0) {
                      <span class="num rounded-full bg-amber-100 px-1.5 text-[11px] font-medium text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">{{ approvals.pendingLeave() }}</span>
                    }
                  </button>
                }
              </div>

              <select class="input input-sm max-w-[180px]" [ngModel]="selectedDept()" (ngModelChange)="selectedDept.set($event); loadInbox()">
                <option value="">All departments</option>
                @for (d of departments(); track d.id) {
                  <option [value]="d.id">{{ d.name }}</option>
                }
              </select>
            </div>

            <button type="button" class="btn btn-ghost btn-sm" (click)="loadInbox()" [disabled]="inboxLoading()">
              <lucide-icon [img]="icons.RefreshCw" [size]="14" [class.animate-spin]="inboxLoading()" /> Refresh
            </button>
          </div>

          @if (inboxLoading()) {
            <div class="space-y-3">
              @for (i of [1, 2, 3]; track i) {
                <div class="skeleton h-20"></div>
              }
            </div>
          } @else if (inboxRequests().length === 0) {
            <app-empty-state
              art="inbox"
              title="No leave requests"
              description="There are no leave requests matching this filter."
            />
          } @else {
            <div class="card overflow-hidden">
              <div class="table-wrap">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Leave Type</th>
                      <th>Dates & Duration</th>
                      <th>Reason</th>
                      <th>Status</th>
                      <th>Applied</th>
                      <th class="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (r of inboxRequests(); track r.id) {
                      <tr>
                        <td>
                          <div class="flex items-center gap-2.5">
                            <app-avatar [name]="getEmployeeName(r)" size="sm" />
                            <div>
                              <p class="font-semibold text-slate-900 dark:text-white">{{ getEmployeeName(r) }}</p>
                              <p class="text-xs text-slate-400">{{ getEmployeeCode(r) }}</p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold" [class]="r.isPaid ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'">
                            {{ r.leaveTypeName }}
                          </span>
                        </td>
                        <td>
                          <p class="font-semibold text-sm">{{ r.startDate | day }} &rarr; {{ r.endDate | day }}</p>
                          <p class="text-xs text-slate-400">{{ r.workingDays }} working day{{ r.workingDays === 1 ? '' : 's' }}</p>
                        </td>
                        <td class="max-w-xs text-sm">
                          <p class="line-clamp-2 text-slate-600 dark:text-slate-300">{{ r.reason }}</p>
                          @if (r.reviewComment) {
                            <p class="mt-1 text-xs italic text-slate-400">Review: "{{ r.reviewComment }}"</p>
                          }
                        </td>
                        <td>
                          <app-status-badge [status]="r.status" />
                        </td>
                        <td class="text-xs text-slate-400">
                          {{ r.createdAt | ago }}
                        </td>
                        <td class="text-right">
                          @if (r.status === 'pending') {
                            @if (auth.isHr()) {
                              <div class="flex justify-end gap-1.5">
                                <button type="button" class="btn btn-primary btn-sm" (click)="openDecisionModal(r, 'approve')">
                                  <lucide-icon [img]="icons.Check" [size]="14" /> Approve
                                </button>
                                <button type="button" class="btn btn-ghost btn-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10" (click)="openDecisionModal(r, 'reject')">
                                  <lucide-icon [img]="icons.X" [size]="14" /> Reject
                                </button>
                              </div>
                            } @else {
                              <span class="badge bg-white text-slate-700 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700">
                                <span class="h-1.5 w-1.5 rounded-full bg-amber-500"></span> Pending HR review
                              </span>
                            }
                          } @else {
                            <span class="text-xs text-slate-400">{{ r.reviewedAt ? (r.reviewedAt | ago) : 'Decided' }}</span>
                          }
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          }
        </div>
      }

      <!-- Tab 2: My Leave (Manager Self-Service) -->
      @if (activeTab() === 'self') {
        <div class="space-y-6">
          <app-leave-balances [balances]="myBalances()" />
          <!-- Smart Leave Magic Bar -->
          <ng-container *ngTemplateOutlet="smartLeaveBarTpl"></ng-container>
          <!-- My Leave Requests -->
          <ng-container *ngTemplateOutlet="myRequestsTpl"></ng-container>
        </div>
      }
    } @else {
      <!-- Non-Manager (Employee View) -->
      <div class="space-y-6">
        <!-- Leave Balances -->
        <app-leave-balances [balances]="myBalances()" />

        <!-- Smart Leave Magic Bar -->
        <ng-container *ngTemplateOutlet="smartLeaveBarTpl"></ng-container>

        <!-- My Requests -->
        <ng-container *ngTemplateOutlet="myRequestsTpl"></ng-container>
      </div>
    }

    <!-- Reusable Smart Leave Bar Template -->
    <ng-template #smartLeaveBarTpl>
      <section class="rounded-lg border border-violet-200 bg-white p-5 shadow-card dark:border-violet-500/30 dark:bg-slate-900 sm:p-6">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex items-center gap-3">
            <span class="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-violet-50 text-violet-600 ring-1 ring-inset ring-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-500/25">
              <lucide-icon [img]="icons.WandSparkles" [size]="18" />
            </span>
            <div>
              <div class="flex items-center gap-2">
                <h3 class="section-title">Smart Leave</h3>
                <span class="badge bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-500/25">
                  <lucide-icon [img]="icons.Sparkles" [size]="11" /> AI-powered
                </span>
              </div>
              <p class="text-xs text-slate-500 dark:text-slate-400">
                Type in English or Roman Urdu — e.g. "I need next Monday and Tuesday off for family function" or "Agle jummarat ko chutti chahiye"
              </p>
            </div>
          </div>
        </div>

        <form (ngSubmit)="submitSmartLeave()" class="mt-4 flex flex-col gap-2 sm:flex-row">
          <div class="relative flex-1">
            <input
              type="text"
              class="input w-full pr-10 focus:border-violet-500 focus:ring-violet-500/15 dark:focus:border-violet-400"
              placeholder="Tell AI when and why you need leave..."
              [(ngModel)]="smartLeaveQuery"
              name="smartLeaveQuery"
              [disabled]="smartLeaveLoading()"
            />
            @if (smartLeaveLoading()) {
              <lucide-icon [img]="icons.LoaderCircle" [size]="18" class="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-violet-600" />
            }
          </div>
          <button type="submit" class="btn btn-ai" [disabled]="smartLeaveLoading() || !smartLeaveQuery().trim()">
            <lucide-icon [img]="icons.Sparkles" [size]="16" /> Extract & Apply
          </button>
        </form>

        @if (smartLeaveLoading()) {
          <div class="mt-3 space-y-2">
            <div class="ai-shimmer h-3.5 w-3/4 rounded-full"></div>
            <div class="ai-shimmer h-3 w-1/2 rounded-full"></div>
          </div>
        }

        @if (smartLeaveMessage()) {
          <p class="mt-2 text-xs text-violet-700 dark:text-violet-300 flex items-center gap-1.5">
            <lucide-icon [img]="icons.Info" [size]="13" /> {{ smartLeaveMessage() }}
          </p>
        }
      </section>
    </ng-template>

    <!-- Reusable My Requests Template -->
    <ng-template #myRequestsTpl>
      <div class="card p-5">
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 class="section-title">My Leave History</h3>
            <p class="text-xs text-slate-500">Track all your applied leave requests and HR approvals</p>
          </div>
          <button type="button" class="btn btn-ghost btn-sm" (click)="loadMyRequests()">
            <lucide-icon [img]="icons.RefreshCw" [size]="14" /> Refresh
          </button>
        </div>

        @if (myRequests().length === 0) {
          <app-empty-state
            art="calendar"
            title="No leave requests"
            description="You haven't requested any time off yet. Use the Smart Leave bar or click Apply."
          />
        } @else {
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Leave Type</th>
                  <th>Dates</th>
                  <th>Working Days</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>HR Comment</th>
                  <th class="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                @for (mr of myRequests(); track mr.id) {
                  <tr>
                    <td class="font-semibold">{{ mr.leaveTypeName }}</td>
                    <td class="num text-sm">
                      {{ mr.startDate | day }} &rarr; {{ mr.endDate | day }}
                    </td>
                    <td>{{ mr.workingDays }} day{{ mr.workingDays === 1 ? '' : 's' }}</td>
                    <td class="max-w-xs text-sm truncate">{{ mr.reason }}</td>
                    <td><app-status-badge [status]="mr.status" /></td>
                    <td class="text-xs text-slate-400">{{ mr.reviewComment || '—' }}</td>
                    <td class="text-right">
                      @if (mr.status === 'pending') {
                        <button type="button" class="btn btn-ghost btn-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10" (click)="cancelRequest(mr)">
                          <lucide-icon [img]="icons.Ban" [size]="14" /> Cancel
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
        }
      </div>
    </ng-template>

    <!-- Apply Leave Modal -->
    <app-modal
      [open]="applyModalOpen()"
      title="Apply for Leave"
      subtitle="Select leave type and dates. Weekends and public holidays are automatically skipped."
      tone="amber"
      [icon]="icons.CalendarPlus"
      (closed)="applyModalOpen.set(false)"
    >
      <form [formGroup]="applyForm" (ngSubmit)="submitApplyForm()" class="space-y-4">
        <div>
          <label class="label" for="leave-type-sel">Leave Type</label>
          <select id="leave-type-sel" class="input" formControlName="leaveTypeId">
            <option value="">-- Choose leave type --</option>
            @for (t of leaveTypes(); track t.id) {
              <option [value]="t.id">
                {{ t.name }} ({{ t.isPaid ? 'Paid' : 'Unpaid' }} - {{ t.annualQuota ? t.annualQuota + ' days/yr' : 'Unlimited' }})
              </option>
            }
          </select>
          <app-field-error [control]="applyForm.controls['leaveTypeId']" label="Leave type" [show]="applySubmitted()" />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="label" for="leave-start-date">Start Date</label>
            <input id="leave-start-date" type="date" class="input" formControlName="startDate" />
            <app-field-error [control]="applyForm.controls['startDate']" label="Start date" [show]="applySubmitted()" />
          </div>
          <div>
            <label class="label" for="leave-end-date">End Date</label>
            <input id="leave-end-date" type="date" class="input" formControlName="endDate" />
            <app-field-error [control]="applyForm.controls['endDate']" label="End date" [show]="applySubmitted()" />
          </div>
        </div>

        <!-- Working days calculation preview -->
        @if (workingDaysCalc(); as wd) {
          <div class="rounded-lg border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200">
            <div class="flex items-center justify-between">
              <span class="font-semibold flex items-center gap-1.5">
                <lucide-icon [img]="icons.CalendarCheck" [size]="14" /> Effective working days:
              </span>
              <span class="text-sm font-semibold">{{ wd.workingDays }} day{{ wd.workingDays === 1 ? '' : 's' }}</span>
            </div>
            <p class="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Configured weekend days and registered public holidays are not deducted from your quota.
            </p>
          </div>
        }

        <div>
          <label class="label" for="leave-reason">Reason</label>
          <textarea
            id="leave-reason"
            rows="3"
            class="input resize-none"
            formControlName="reason"
            placeholder="e.g. Attending family wedding, medical appointment, personal rest"
          ></textarea>
          <app-field-error [control]="applyForm.controls['reason']" label="Reason" [show]="applySubmitted()" />
        </div>

        @if (applyError()) {
          <p class="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
            {{ applyError() }}
          </p>
        }

        <div modal-footer class="flex justify-end gap-2 border-t border-slate-200 px-5 py-4 dark:border-slate-800 sm:px-6">
          <button type="button" class="btn btn-secondary" (click)="applyModalOpen.set(false)">Cancel</button>
          <button type="submit" class="btn btn-primary" [disabled]="applySubmitting()">
            <lucide-icon [img]="applySubmitting() ? icons.LoaderCircle : icons.Send" [size]="16" [class.animate-spin]="applySubmitting()" />
            Submit Request
          </button>
        </div>
      </form>
    </app-modal>

    <!-- Manager Decision Modal -->
    <app-modal
      [open]="decisionModalOpen()"
      [title]="decisionAction() === 'approve' ? 'Approve leave request' : 'Reject leave request'"
      [tone]="decisionAction() === 'approve' ? 'emerald' : 'rose'"
      [icon]="decisionAction() === 'approve' ? icons.CircleCheck : icons.CircleX"
      [subtitle]="selectedRequest() ? 'For ' + getEmployeeName(selectedRequest()!) + ' (' + selectedRequest()!.leaveTypeName + ')' : ''"
      (closed)="decisionModalOpen.set(false)"
    >
      <div class="space-y-4">
        <div class="rounded-lg bg-slate-50 p-3 text-xs dark:bg-slate-800 space-y-1">
          <p><span class="text-slate-400">Duration:</span> {{ selectedRequest()?.startDate | day }} &rarr; {{ selectedRequest()?.endDate | day }} ({{ selectedRequest()?.workingDays }} working days)</p>
          <p><span class="text-slate-400">Reason:</span> {{ selectedRequest()?.reason }}</p>
        </div>

        <div>
          <label class="label" for="dec-comment">
            {{ decisionAction() === 'approve' ? 'Optional comment' : 'Reason for rejection (required)' }}
          </label>
          <textarea
            id="dec-comment"
            rows="3"
            class="input resize-none"
            [placeholder]="decisionAction() === 'approve' ? 'e.g. Approved. Have a good break!' : 'e.g. Insufficient staffing during this sprint'"
            [(ngModel)]="decisionComment"
          ></textarea>
        </div>
      </div>

      <div modal-footer class="flex justify-end gap-2 border-t border-slate-200 px-5 py-4 dark:border-slate-800 sm:px-6">
        <button type="button" class="btn btn-secondary" (click)="decisionModalOpen.set(false)">Cancel</button>
        <button
          type="button"
          [class]="decisionAction() === 'approve' ? 'btn btn-primary' : 'btn btn-danger'"
          [disabled]="decisionAction() === 'reject' && !decisionComment().trim()"
          (click)="confirmDecision()"
        >
          {{ decisionAction() === 'approve' ? 'Confirm Approval' : 'Reject Request' }}
        </button>
      </div>
    </app-modal>
  `,
})
export class LeaveComponent implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly leaveService = inject(LeaveService);
  private readonly orgService = inject(OrgService);
  private readonly aiService = inject(AiService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  protected readonly approvals = inject(ApprovalsStore);
  protected readonly icons = Icons;

  protected readonly activeTab = signal('inbox');
  protected readonly departments = signal<Department[]>([]);
  protected readonly selectedDept = signal('');
  protected readonly leaveTypes = signal<LeaveType[]>([]);

  // Balances
  protected readonly myBalances = signal<LeaveBalance[]>([]);

  // Inbox State
  protected readonly inboxFilter = signal<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'>('PENDING');
  protected readonly inboxRequests = signal<LeaveRequest[]>([]);
  protected readonly inboxLoading = signal(false);

  // My Requests State
  protected readonly myRequests = signal<LeaveRequest[]>([]);

  // Smart Leave State
  protected readonly smartLeaveQuery = signal('');
  protected readonly smartLeaveLoading = signal(false);
  protected readonly smartLeaveMessage = signal('');

  // Apply Form Modal
  protected readonly applyModalOpen = signal(false);
  protected readonly applySubmitted = signal(false);
  protected readonly applySubmitting = signal(false);
  protected readonly applyError = signal('');
  protected readonly workingDaysCalc = signal<WorkingDaysResponse | null>(null);

  // Decision Modal
  protected readonly decisionModalOpen = signal(false);
  protected readonly selectedRequest = signal<LeaveRequest | null>(null);
  protected readonly decisionAction = signal<'approve' | 'reject'>('approve');
  protected readonly decisionComment = signal('');

  protected readonly applyForm: FormGroup = this.fb.group({
    leaveTypeId: ['', Validators.required],
    startDate: ['', Validators.required],
    endDate: ['', Validators.required],
    reason: ['', Validators.required],
  });

  protected readonly managerTabs = computed<TabItem[]>(() => {
    const tabs: TabItem[] = [
      { id: 'inbox', label: 'Approval Inbox', icon: Icons.Inbox, badge: this.approvals.pendingLeave() || null },
    ];
    if (this.auth.hasEmployeeProfile()) {
      tabs.push({ id: 'self', label: 'My Leave', icon: Icons.TreePalm });
    }
    return tabs;
  });

  ngOnInit(): void {
    this.loadLeaveTypes();
    if (this.auth.isManager()) {
      this.loadDepartments();
      this.loadInbox();
    }
    if (this.auth.hasEmployeeProfile()) {
      this.loadMyBalances();
      this.loadMyRequests();
    }

    // Reactively compute working days when start & end dates change
    this.applyForm.valueChanges.pipe(debounceTime(300), distinctUntilChanged()).subscribe(() => {
      const s = this.applyForm.get('startDate')?.value;
      const e = this.applyForm.get('endDate')?.value;
      if (s && e && s <= e) {
        this.leaveService.workingDays(s, e).subscribe({
          next: (calc) => this.workingDaysCalc.set(calc),
          error: () => this.workingDaysCalc.set(null),
        });
      } else {
        this.workingDaysCalc.set(null);
      }
    });
  }

  protected loadLeaveTypes(): void {
    this.orgService.leaveTypes().subscribe({
      next: (types) => this.leaveTypes.set(types),
      error: () => undefined,
    });
  }

  protected loadDepartments(): void {
    this.orgService.departments().subscribe({
      next: (depts) => this.departments.set(depts),
      error: () => undefined,
    });
  }

  protected loadMyBalances(): void {
    this.leaveService.balance().subscribe({
      next: (res) => this.myBalances.set(res.balances),
      error: () => undefined,
    });
  }

  protected loadMyRequests(): void {
    this.leaveService.list({ limit: 100 }).subscribe({
      next: (res) => this.myRequests.set(res.data),
      error: () => undefined,
    });
  }

  protected setInboxFilter(f: string): void {
    this.inboxFilter.set(f as 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED');
    this.loadInbox();
  }

  protected loadInbox(): void {
    this.inboxLoading.set(true);
    const statusParam = this.inboxFilter() === 'ALL' ? undefined : (this.inboxFilter().toLowerCase() as LeaveStatus);
    this.leaveService.list({ status: statusParam, departmentId: this.selectedDept() || undefined, limit: 100 }).subscribe({
      next: (res) => {
        this.inboxRequests.set(res.data);
        this.inboxLoading.set(false);
        this.approvals.refresh();
      },
      error: (err) => {
        this.inboxLoading.set(false);
        this.toast.error('Failed to load leave requests', apiErrorMessage(err));
      },
    });
  }

  protected submitSmartLeave(): void {
    const text = this.smartLeaveQuery().trim();
    if (!text) return;

    this.smartLeaveLoading.set(true);
    this.smartLeaveMessage.set('AI is understanding your leave dates and reason...');

    this.aiService.smartLeave(text).subscribe({
      next: (res) => {
        this.smartLeaveLoading.set(false);
        this.smartLeaveMessage.set(res.message);

        if (res.draft) {
          // Pre-populate apply form and open modal for user review
          let matchingType = this.leaveTypes().find((t) => t.name.toLowerCase().includes(res.draft!.type.toLowerCase()))?.id;
          if (!matchingType && res.leaveTypeId) matchingType = res.leaveTypeId;
          if (!matchingType && this.leaveTypes().length > 0) matchingType = this.leaveTypes()[0].id;

          this.applyForm.patchValue({
            leaveTypeId: matchingType || '',
            startDate: res.draft.startDate,
            endDate: res.draft.endDate,
            reason: res.draft.reason,
          });
          this.openApplyModal();
          this.toast.info('Smart Leave parsed successfully', 'Review the extracted dates and click Submit Request.');
        } else if (res.fallbackToManualForm) {
          this.openApplyModal();
          this.toast.warning('Manual entry needed', res.message || 'Please fill in the leave form manually.');
        }
      },
      error: (err) => {
        this.smartLeaveLoading.set(false);
        this.smartLeaveMessage.set('AI parsing failed. Please use manual form.');
        this.openApplyModal();
      },
    });
  }

  protected openApplyModal(): void {
    this.applySubmitted.set(false);
    this.applyError.set('');
    this.applyModalOpen.set(true);
  }

  protected submitApplyForm(): void {
    this.applySubmitted.set(true);
    if (this.applyForm.invalid) return;

    const val = this.applyForm.value;
    if (val.startDate > val.endDate) {
      this.applyError.set('End date cannot be earlier than start date.');
      return;
    }

    this.applySubmitting.set(true);
    this.applyError.set('');

    this.leaveService
      .apply({
        leaveTypeId: val.leaveTypeId,
        startDate: val.startDate,
        endDate: val.endDate,
        reason: val.reason,
      })
      .subscribe({
        next: () => {
          this.applySubmitting.set(false);
          this.applyModalOpen.set(false);
          this.applyForm.reset();
          this.workingDaysCalc.set(null);
          this.smartLeaveQuery.set('');
          this.smartLeaveMessage.set('');
          this.toast.success('Leave applied successfully', 'Your request has been submitted to HR.');
          void celebrate();
          this.loadMyBalances();
          this.loadMyRequests();
          if (this.auth.isManager()) this.loadInbox();
        },
        error: (err) => {
          this.applySubmitting.set(false);
          this.applyError.set(apiErrorMessage(err));
          this.toast.error('Failed to submit leave', apiErrorMessage(err));
        },
      });
  }

  protected async cancelRequest(req: LeaveRequest): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Cancel leave request?',
      message: `Are you sure you want to cancel your leave request for ${req.leaveTypeName} (${req.startDate} to ${req.endDate})?`,
      confirmText: 'Cancel request',
      tone: 'danger',
    });
    if (!ok) return;

    this.leaveService.cancel(req.id).subscribe({
      next: () => {
        this.toast.success('Leave request cancelled');
        this.loadMyBalances();
        this.loadMyRequests();
        if (this.auth.isManager()) this.loadInbox();
      },
      error: (err) => this.toast.error('Cancellation failed', apiErrorMessage(err)),
    });
  }

  protected openDecisionModal(r: LeaveRequest, action: 'approve' | 'reject'): void {
    this.selectedRequest.set(r);
    this.decisionAction.set(action);
    this.decisionComment.set('');
    this.decisionModalOpen.set(true);
  }

  protected confirmDecision(): void {
    if (!this.auth.isHr()) return;
    const r = this.selectedRequest();
    if (!r) return;

    const action = this.decisionAction();
    const comment = this.decisionComment().trim();

    if (action === 'approve') {
      this.leaveService.approve(r.id, comment || undefined).subscribe({
        next: () => {
          this.decisionModalOpen.set(false);
          this.toast.success('Leave request approved');
          this.loadInbox();
          this.approvals.refresh();
        },
        error: (err) => this.toast.error('Approval failed', apiErrorMessage(err)),
      });
    } else {
      if (!comment) return;
      this.leaveService.reject(r.id, comment).subscribe({
        next: () => {
          this.decisionModalOpen.set(false);
          this.toast.info('Leave request rejected');
          this.loadInbox();
          this.approvals.refresh();
        },
        error: (err) => this.toast.error('Rejection failed', apiErrorMessage(err)),
      });
    }
  }

  protected getEmployeeName(r: LeaveRequest): string {
    if (typeof r.employeeId === 'object' && r.employeeId !== null) {
      return r.employeeId.fullName;
    }
    return 'Employee';
  }

  protected getEmployeeCode(r: LeaveRequest): string {
    if (typeof r.employeeId === 'object' && r.employeeId !== null) {
      return r.employeeId.code;
    }
    return '';
  }
}
