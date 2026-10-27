import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import {
  AttendanceBoard,
  AttendanceBoardRow,
  AttendanceCorrection,
  AttendanceRecord,
  Department,
  Employee,
  RequestStatus,
} from '../../core/models/api.models';
import { ApprovalsStore } from '../../core/services/approvals.store';
import { AttendanceService } from '../../core/services/attendance.service';
import { AuthService } from '../../core/services/auth.service';
import { CheckInStore } from '../../core/services/check-in.store';
import { ConfirmService } from '../../core/services/confirm.service';
import { EmployeeService } from '../../core/services/employee.service';
import { OrgService } from '../../core/services/org.service';
import { PolicyStore } from '../../core/services/policy.store';
import { ToastService } from '../../core/services/toast.service';
import { formatDate } from '../../core/utils/dates';
import { apiErrorMessage } from '../../core/utils/http';
import { CameraCheckinComponent } from '../../shared/attendance/camera-checkin.component';
import { CorrectionRequestComponent } from '../../shared/attendance/correction-request.component';
import { AttendanceCalendarComponent } from '../../shared/domain/attendance-calendar.component';
import { FORMAT_PIPES } from '../../shared/pipes/format.pipes';
import { AvatarComponent, StatusBadgeComponent } from '../../shared/ui/badges';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';
import { Icons } from '../../shared/ui/icons';
import { ModalComponent } from '../../shared/ui/modal.component';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { SegmentedTabsComponent, TabItem } from '../../shared/ui/segmented-tabs.component';
import { CheckInHeroComponent } from './check-in-hero.component';

@Component({
  selector: 'app-attendance',
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    LucideAngularModule,
    PageHeaderComponent,
    SegmentedTabsComponent,
    EmptyStateComponent,
    AvatarComponent,
    StatusBadgeComponent,
    ModalComponent,
    CheckInHeroComponent,
    CameraCheckinComponent,
    CorrectionRequestComponent,
    AttendanceCalendarComponent,
    FORMAT_PIPES,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header
      title="Attendance"
      [subtitle]="auth.isManager() ? 'Real-time check-in HUD, daily company board and correction approval queue.' : 'Track your daily check-in, review monthly records and request corrections.'"
    >
      <div header-actions class="flex flex-wrap items-center gap-2">
        @if (auth.hasEmployeeProfile()) {
          <button type="button" class="btn btn-secondary" (click)="checkInStore.openCorrection({ date: today() })">
            <lucide-icon [img]="icons.Wrench" [size]="16" /> Request correction
          </button>
        }
        @if (auth.isAdmin() && activeTab() === 'daily') {
          <button type="button" class="btn btn-ghost text-rose-600 dark:text-rose-400" (click)="closePastDays()" [disabled]="closingDays()">
            <lucide-icon [img]="icons.CalendarCheck" [size]="16" /> Close day records
          </button>
        }
      </div>
    </app-page-header>

    @if (auth.isManager()) {
      <!-- Manager Tabs -->
      <div class="mb-6">
        <app-segmented-tabs [tabs]="managerTabs()" [(active)]="activeTab" />
      </div>

      <!-- Tab 1: Daily Board -->
      @if (activeTab() === 'daily') {
        <div class="space-y-6">
          <!-- Filters Ribbon -->
          <div class="card flex flex-wrap items-center justify-between gap-4 p-4">
            <div class="flex flex-wrap items-center gap-3">
              <div class="flex items-center gap-2">
                <label for="board-date" class="text-xs font-medium text-slate-500">Date</label>
                <input
                  id="board-date"
                  type="date"
                  class="input input-sm max-w-[160px]"
                  [ngModel]="selectedDate()"
                  (ngModelChange)="onDateChange($event)"
                />
              </div>

              <div class="flex items-center gap-2">
                <label for="board-dept" class="text-xs font-medium text-slate-500">Dept</label>
                <select
                  id="board-dept"
                  class="input input-sm max-w-[180px]"
                  [ngModel]="selectedDept()"
                  (ngModelChange)="onDeptChange($event)"
                >
                  <option value="">All departments</option>
                  @for (d of departments(); track d.id) {
                    <option [value]="d.id">{{ d.name }}</option>
                  }
                </select>
              </div>

              <div class="relative">
                <lucide-icon [img]="icons.Search" [size]="14" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter name or code..."
                  class="input input-sm pl-8 max-w-[200px]"
                  [ngModel]="searchQuery()"
                  (ngModelChange)="searchQuery.set($event)"
                />
              </div>
            </div>

            <div class="flex items-center gap-2">
              <button type="button" class="btn btn-ghost btn-sm" (click)="loadBoard()" [disabled]="boardLoading()">
                <lucide-icon [img]="icons.RefreshCw" [size]="14" [class.animate-spin]="boardLoading()" /> Refresh
              </button>
            </div>
          </div>

          <!-- Board Summary Counters -->
          @if (board(); as b) {
            <div class="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
              <div class="card p-3 text-center">
                <p class="text-xs font-medium text-slate-400">Total</p>
                <p class="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">{{ b.total }}</p>
              </div>
              <div class="card p-3 text-center">
                <p class="text-xs font-medium text-blue-700 dark:text-blue-400">Present</p>
                <p class="mt-1 text-2xl font-semibold text-green-700 dark:text-green-400">{{ b.summary['present'] ?? 0 }}</p>
              </div>
              <div class="card p-3 text-center">
                <p class="text-xs font-medium text-blue-600 dark:text-blue-400">Late</p>
                <p class="mt-1 text-2xl font-semibold text-blue-600 dark:text-blue-400">{{ b.summary['late'] ?? 0 }}</p>
              </div>
              <div class="card p-3 text-center">
                <p class="text-xs font-medium text-orange-600 dark:text-orange-400">Half day</p>
                <p class="mt-1 text-2xl font-semibold text-orange-600 dark:text-orange-400">{{ b.summary['half_day'] ?? 0 }}</p>
              </div>
              <div class="card p-3 text-center">
                <p class="text-xs font-medium text-amber-600 dark:text-amber-400">On leave</p>
                <p class="mt-1 text-2xl font-semibold text-amber-600 dark:text-amber-400">{{ b.summary['on_leave'] ?? 0 }}</p>
              </div>
              <div class="card p-3 text-center">
                <p class="text-xs font-medium text-rose-600 dark:text-rose-400">Absent</p>
                <p class="mt-1 text-2xl font-semibold text-rose-600 dark:text-rose-400">{{ b.summary['absent'] ?? 0 }}</p>
              </div>
              <div class="card p-3 text-center">
                <p class="text-xs font-medium text-slate-500">Not in yet</p>
                <p class="mt-1 text-2xl font-semibold text-slate-600 dark:text-slate-300">{{ b.summary['not_checked_in'] ?? 0 }}</p>
              </div>
            </div>

            <!-- Board Table -->
            <div class="card overflow-hidden">
              <div class="table-wrap">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Department & Role</th>
                      <th>Status</th>
                      <th>Check In</th>
                      <th>Check Out</th>
                      <th>Worked</th>
                      <th>Verification</th>
                      <th class="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    @if (filteredRows().length === 0) {
                      <tr>
                        <td colspan="8">
                          <app-empty-state
                            [compact]="true"
                            art="calendar"
                            title="No attendance records"
                            description="No records match this date or filter."
                          />
                        </td>
                      </tr>
                    }
                    @for (row of filteredRows(); track row.employeeId) {
                      <tr>
                        <td>
                          <div class="flex items-center gap-3">
                            <app-avatar [name]="row.fullName" size="sm" />
                            <div>
                              <p class="font-semibold text-slate-900 dark:text-white">{{ row.fullName }}</p>
                              <p class="text-xs text-slate-400">{{ row.code }}</p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <p class="text-sm font-medium">{{ row.department || '—' }}</p>
                          <p class="text-xs text-slate-400">{{ row.designation || '—' }}</p>
                        </td>
                        <td>
                          <app-status-badge [status]="row.status" />
                        </td>
                        <td class="num text-sm">
                          {{ row.checkIn ? (row.checkIn | clock) : '—' }}
                          @if (row.lateMinutes > 0) {
                            <span class="ml-1 text-xs text-blue-500">+{{ row.lateMinutes }}m</span>
                          }
                        </td>
                        <td class="num text-sm">
                          {{ row.checkOut ? (row.checkOut | clock) : '—' }}
                        </td>
                        <td class="num text-sm">
                          {{ row.workedMinutes !== null ? (row.workedMinutes | hm) : '—' }}
                        </td>
                        <td>
                          @if (row.source === 'camera') {
                            <span class="badge bg-white text-slate-700 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700">
                              <lucide-icon [img]="icons.ScanFace" [size]="12" class="text-blue-600 dark:text-blue-400" /> Face verified
                            </span>
                          } @else if (row.source === 'manual') {
                            <span class="inline-flex items-center gap-1 text-xs text-slate-400">
                              <lucide-icon [img]="icons.LogIn" [size]="12" /> Web punch
                            </span>
                          } @else if (row.source === 'correction') {
                            <span class="inline-flex items-center gap-1 text-xs text-blue-500">
                              <lucide-icon [img]="icons.Wrench" [size]="12" /> HR corrected
                            </span>
                          } @else {
                            <span class="text-xs text-slate-400">—</span>
                          }
                        </td>
                        <td class="text-right">
                          <a [routerLink]="['/employees', row.employeeId]" class="btn btn-ghost btn-sm">
                            <lucide-icon [img]="icons.Eye" [size]="14" /> 360
                          </a>
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

      <!-- Tab 2: Corrections Approval Queue -->
      @if (activeTab() === 'corrections') {
        <div class="space-y-6">
          <div class="card flex flex-wrap items-center justify-between gap-4 p-4">
            <div class="flex items-center gap-3">
              <span class="text-xs font-medium text-slate-500">Filter status:</span>
              <div class="flex gap-1">
                @for (s of ['ALL', 'PENDING', 'APPROVED', 'REJECTED']; track s) {
                  <button type="button" class="pill" [class.pill-active]="correctionFilter() === s" (click)="setCorrectionFilter(s)">
                    {{ s.charAt(0) + s.slice(1).toLowerCase() }}
                    @if (s === 'PENDING' && approvals.pendingCorrections() > 0) {
                      <span class="num rounded-full bg-amber-100 px-1.5 text-[11px] font-medium text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">{{ approvals.pendingCorrections() }}</span>
                    }
                  </button>
                }
              </div>
            </div>
            <button type="button" class="btn btn-ghost btn-sm" (click)="loadCorrections()">
              <lucide-icon [img]="icons.RefreshCw" [size]="14" /> Refresh
            </button>
          </div>

          @if (correctionsLoading()) {
            <div class="space-y-3">
              @for (i of [1, 2, 3]; track i) {
                <div class="skeleton h-20"></div>
              }
            </div>
          } @else if (corrections().length === 0) {
            <app-empty-state
              art="inbox"
              title="No correction requests"
              description="There are no attendance correction requests matching this filter."
            />
          } @else {
            <div class="card overflow-hidden">
              <div class="table-wrap">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Date</th>
                      <th>Requested Check In / Out</th>
                      <th>Reason</th>
                      <th>Status</th>
                      <th>Requested At</th>
                      <th class="text-right">Decision</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (c of corrections(); track c.id) {
                      <tr>
                        <td>
                          <div class="flex items-center gap-2.5">
                            <app-avatar [name]="getEmployeeName(c)" size="sm" />
                            <div>
                              <p class="font-semibold text-slate-900 dark:text-white">{{ getEmployeeName(c) }}</p>
                              <p class="text-xs text-slate-400">{{ getEmployeeCode(c) }}</p>
                            </div>
                          </div>
                        </td>
                        <td class="font-semibold">
                          {{ c.date | day }}
                        </td>
                        <td class="num text-sm">
                          <div>In: <span class="font-semibold">{{ c.requestedCheckIn || 'No change' }}</span></div>
                          <div>Out: <span class="font-semibold">{{ c.requestedCheckOut || 'No change' }}</span></div>
                        </td>
                        <td class="max-w-xs text-sm">
                          <p class="line-clamp-2 text-slate-600 dark:text-slate-300">{{ c.reason }}</p>
                          @if (c.reviewComment) {
                            <p class="mt-1 text-xs italic text-slate-400">Review: "{{ c.reviewComment }}"</p>
                          }
                        </td>
                        <td>
                          <app-status-badge [status]="c.status" />
                        </td>
                        <td class="text-xs text-slate-400">
                          {{ c.createdAt | ago }}
                        </td>
                        <td class="text-right">
                          @if (c.status === 'pending') {
                            @if (auth.isHr()) {
                              <div class="flex justify-end gap-1.5">
                                <button type="button" class="btn btn-primary btn-sm" (click)="openDecisionModal(c, 'approve')">
                                  <lucide-icon [img]="icons.Check" [size]="14" /> Approve
                                </button>
                                <button type="button" class="btn btn-ghost btn-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10" (click)="openDecisionModal(c, 'reject')">
                                  <lucide-icon [img]="icons.X" [size]="14" /> Reject
                                </button>
                              </div>
                            } @else {
                              <span class="badge bg-white text-slate-700 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700">
                                <span class="h-1.5 w-1.5 rounded-full bg-amber-500"></span> Pending HR review
                              </span>
                            }
                          } @else {
                            <span class="text-xs text-slate-400">{{ c.reviewedAt ? (c.reviewedAt | ago) : 'Decided' }}</span>
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

      <!-- Tab 3: Monthly Calendar (Employee Selector for Admin/HR) -->
      @if (activeTab() === 'calendar') {
        <div class="space-y-6">
          <div class="card flex flex-wrap items-center justify-between gap-4 p-4">
            <div class="flex items-center gap-3">
              <label for="cal-emp" class="text-xs font-medium text-slate-500">View Employee Calendar:</label>
              <select
                id="cal-emp"
                class="input input-sm min-w-[240px]"
                [ngModel]="selectedEmployeeId()"
                (ngModelChange)="onCalendarEmployeeChange($event)"
              >
                <option value="">-- Select an employee --</option>
                @for (e of employeesList(); track e.id) {
                  <option [value]="e.id">{{ e.fullName }} ({{ e.code }}) - {{ e.department.name }}</option>
                }
              </select>
            </div>
          </div>

          @if (!selectedEmployeeId()) {
            <app-empty-state
              art="calendar"
              title="Select an employee"
              description="Choose any employee above to view their interactive monthly attendance calendar."
            />
          } @else {
            <div class="card p-6">
              <app-attendance-calendar
                [month]="calendarMonth()"
                [records]="calendarRecords()"
                (monthChange)="onCalendarMonthChange($event)"
              />
            </div>
          }
        </div>
      }

      <!-- Tab 4: My Self-Service -->
      @if (activeTab() === 'self') {
        <div class="space-y-6">
          <app-check-in-hero />
          <div class="card p-6">
            <h3 class="section-title mb-4">My Monthly Attendance Calendar</h3>
            <app-attendance-calendar
              [month]="myMonth()"
              [records]="myRecords()"
              [allowCorrection]="true"
              (monthChange)="onMyMonthChange($event)"
              (correctionRequested)="onMyCorrectionRequested($event)"
            />
          </div>
          <div class="card p-5">
            <div class="mb-4 flex items-center justify-between">
              <h3 class="section-title">My Correction Requests</h3>
              <button type="button" class="btn btn-secondary btn-sm" (click)="checkInStore.openCorrection({ date: today() })">
                <lucide-icon [img]="icons.Plus" [size]="14" /> New request
              </button>
            </div>
            @if (myCorrections().length === 0) {
              <p class="text-sm text-slate-500">You haven't submitted any attendance correction requests yet.</p>
            } @else {
              <div class="table-wrap">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Requested In / Out</th>
                      <th>Reason</th>
                      <th>Status</th>
                      <th>Feedback</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (mc of myCorrections(); track mc.id) {
                      <tr>
                        <td class="font-semibold">{{ mc.date | day }}</td>
                        <td class="num text-sm">
                          In: {{ mc.requestedCheckIn || '—' }} · Out: {{ mc.requestedCheckOut || '—' }}
                        </td>
                        <td class="text-sm">{{ mc.reason }}</td>
                        <td><app-status-badge [status]="mc.status" /></td>
                        <td class="text-xs text-slate-400">{{ mc.reviewComment || '—' }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>
        </div>
      }
    } @else {
      <!-- Non-Manager (Employee Self-Service Only) -->
      <div class="space-y-6">
        <app-check-in-hero />

        <div class="card p-6">
          <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 class="section-title">My Attendance Calendar</h3>
              <p class="text-xs text-slate-500">Click any day to inspect details or request a correction</p>
            </div>
            <button type="button" class="btn btn-secondary btn-sm" (click)="checkInStore.openCorrection({ date: today() })">
              <lucide-icon [img]="icons.Wrench" [size]="14" /> Request correction
            </button>
          </div>
          <app-attendance-calendar
            [month]="myMonth()"
            [records]="myRecords()"
            [allowCorrection]="true"
            (monthChange)="onMyMonthChange($event)"
            (correctionRequested)="onMyCorrectionRequested($event)"
          />
        </div>

        <!-- My Correction Requests -->
        <div class="card p-5">
          <div class="mb-4 flex items-center justify-between">
            <h3 class="section-title">My Correction Requests</h3>
            <button type="button" class="btn btn-ghost btn-sm" (click)="loadMyCorrections()">
              <lucide-icon [img]="icons.RefreshCw" [size]="14" /> Refresh
            </button>
          </div>
          @if (myCorrections().length === 0) {
            <p class="text-sm text-slate-500">You have no correction requests submitted.</p>
          } @else {
            <div class="table-wrap">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Requested In / Out</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>HR Feedback</th>
                  </tr>
                </thead>
                <tbody>
                  @for (mc of myCorrections(); track mc.id) {
                    <tr>
                      <td class="font-semibold">{{ mc.date | day }}</td>
                      <td class="num text-sm">
                        In: {{ mc.requestedCheckIn || '—' }} · Out: {{ mc.requestedCheckOut || '—' }}
                      </td>
                      <td class="text-sm">{{ mc.reason }}</td>
                      <td><app-status-badge [status]="mc.status" /></td>
                      <td class="text-xs text-slate-400">{{ mc.reviewComment || '—' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      </div>
    }

    <!-- Shared Modals (Camera + Geofence HUD & Correction Modal) -->
    <app-camera-checkin />
    <app-correction-request />

    <!-- Decision Modal (HR / Admin Approve or Reject Correction) -->
    <app-modal
      [open]="decisionModalOpen()"
      [title]="decisionAction() === 'approve' ? 'Approve attendance correction' : 'Reject attendance correction'"
      [tone]="decisionAction() === 'approve' ? 'emerald' : 'rose'"
      [icon]="decisionAction() === 'approve' ? icons.CircleCheck : icons.CircleX"
      [subtitle]="selectedCorrection() ? 'For ' + getEmployeeName(selectedCorrection()!) + ' on ' + selectedCorrection()!.date : ''"
      (closed)="decisionModalOpen.set(false)"
    >
      <div class="space-y-4">
        <p class="text-sm text-slate-600 dark:text-slate-300">
          @if (decisionAction() === 'approve') {
            Approving this request will update the attendance record for {{ selectedCorrection()?.date }} with the requested check-in and check-out times.
          } @else {
            Please provide a reason for rejecting this correction request so the employee understands why.
          }
        </p>

        <div>
          <label class="label" for="decision-comment">
            {{ decisionAction() === 'approve' ? 'Optional comment' : 'Reason for rejection (required)' }}
          </label>
          <textarea
            id="decision-comment"
            rows="3"
            class="input resize-none"
            [placeholder]="decisionAction() === 'approve' ? 'e.g. Approved as per client meeting schedule' : 'e.g. Please verify with team lead first'"
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
export class AttendanceComponent implements OnInit {
  protected readonly auth = inject(AuthService);
  protected readonly checkInStore = inject(CheckInStore);
  private readonly attendanceService = inject(AttendanceService);
  private readonly employeeService = inject(EmployeeService);
  private readonly orgService = inject(OrgService);
  private readonly policies = inject(PolicyStore);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  protected readonly approvals = inject(ApprovalsStore);
  protected readonly icons = Icons;

  protected readonly today = computed(() => this.policies.today());
  protected readonly activeTab = signal('daily');

  // Daily Board State
  protected readonly selectedDate = signal('');
  protected readonly selectedDept = signal('');
  protected readonly searchQuery = signal('');
  protected readonly board = signal<AttendanceBoard | null>(null);
  protected readonly boardLoading = signal(false);
  protected readonly closingDays = signal(false);
  protected readonly departments = signal<Department[]>([]);

  // Approval Queue State
  protected readonly correctionFilter = signal<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  protected readonly corrections = signal<AttendanceCorrection[]>([]);
  protected readonly correctionsLoading = signal(false);

  // Calendar State
  protected readonly employeesList = signal<Employee[]>([]);
  protected readonly selectedEmployeeId = signal('');
  protected readonly calendarRecords = signal<AttendanceRecord[]>([]);
  protected readonly calendarMonth = signal(new Date().toISOString().slice(0, 7));

  // Self-Service State
  protected readonly myRecords = signal<AttendanceRecord[]>([]);
  protected readonly myCorrections = signal<AttendanceCorrection[]>([]);
  protected readonly myMonth = signal(new Date().toISOString().slice(0, 7));

  // Decision Modal State
  protected readonly decisionModalOpen = signal(false);
  protected readonly selectedCorrection = signal<AttendanceCorrection | null>(null);
  protected readonly decisionAction = signal<'approve' | 'reject'>('approve');
  protected readonly decisionComment = signal('');

  protected readonly managerTabs = computed<TabItem[]>(() => {
    const tabs: TabItem[] = [
      { id: 'daily', label: 'Daily Board', icon: Icons.Table2 },
      { id: 'corrections', label: 'Correction Requests', icon: Icons.ListChecks, badge: this.approvals.pendingCorrections() || null },
      { id: 'calendar', label: 'Monthly Calendar', icon: Icons.CalendarDays },
    ];
    if (this.auth.hasEmployeeProfile()) {
      tabs.push({ id: 'self', label: 'My Attendance', icon: Icons.ScanFace });
    }
    return tabs;
  });

  protected readonly filteredRows = computed<AttendanceBoardRow[]>(() => {
    const b = this.board();
    if (!b) return [];
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) return b.data;
    return b.data.filter(
      (r) => r.fullName.toLowerCase().includes(q) || r.code.toLowerCase().includes(q) || (r.department && r.department.toLowerCase().includes(q)),
    );
  });

  ngOnInit(): void {
    this.selectedDate.set(this.today());
    if (this.auth.isManager()) {
      this.loadDepartments();
      this.loadBoard();
      this.loadCorrections();
      this.loadEmployeesList();
    }
    if (this.auth.hasEmployeeProfile()) {
      this.loadMyAttendance();
      this.loadMyCorrections();
    }
  }

  protected loadDepartments(): void {
    this.orgService.departments().subscribe({
      next: (depts) => this.departments.set(depts),
      error: () => undefined,
    });
  }

  protected loadBoard(): void {
    this.boardLoading.set(true);
    this.attendanceService
      .board({ date: this.selectedDate(), departmentId: this.selectedDept() || undefined })
      .subscribe({
        next: (b) => {
          this.board.set(b);
          this.boardLoading.set(false);
        },
        error: (err) => {
          this.boardLoading.set(false);
          this.toast.error('Failed to load board', apiErrorMessage(err));
        },
      });
  }

  protected onDateChange(date: string): void {
    this.selectedDate.set(date);
    this.loadBoard();
  }

  protected onDeptChange(deptId: string): void {
    this.selectedDept.set(deptId);
    this.loadBoard();
  }

  protected setCorrectionFilter(f: string): void {
    this.correctionFilter.set(f as 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED');
    this.loadCorrections();
  }

  protected loadCorrections(): void {
    this.correctionsLoading.set(true);
    const statusParam = this.correctionFilter() === 'ALL' ? undefined : (this.correctionFilter().toLowerCase() as RequestStatus);
    this.attendanceService.corrections({ status: statusParam, limit: 100 }).subscribe({
      next: (res) => {
        this.corrections.set(res.data);
        this.correctionsLoading.set(false);
        this.approvals.refresh();
      },
      error: (err) => {
        this.correctionsLoading.set(false);
        this.toast.error('Failed to load corrections', apiErrorMessage(err));
      },
    });
  }

  protected loadEmployeesList(): void {
    this.employeeService.list({ limit: 200, status: 'active' }).subscribe({
      next: (res) => this.employeesList.set(res.data),
      error: () => undefined,
    });
  }

  protected onCalendarEmployeeChange(empId: string): void {
    this.selectedEmployeeId.set(empId);
    if (empId) {
      this.loadEmployeeCalendarRecords(empId);
    } else {
      this.calendarRecords.set([]);
    }
  }

  protected loadEmployeeCalendarRecords(empId: string, from?: string, to?: string): void {
    this.attendanceService.list({ employeeId: empId, from, to, limit: 366 }).subscribe({
      next: (res) => this.calendarRecords.set(res.data),
      error: () => undefined,
    });
  }

  protected onCalendarMonthChange(m: string): void {
    this.calendarMonth.set(m);
    if (this.selectedEmployeeId()) {
      const from = `${m}-01`;
      this.loadEmployeeCalendarRecords(this.selectedEmployeeId(), from);
    }
  }

  protected loadMyAttendance(from?: string, to?: string): void {
    this.attendanceService.mine(from, to).subscribe({
      next: (res) => this.myRecords.set(res.data),
      error: () => undefined,
    });
  }

  protected loadMyCorrections(): void {
    this.attendanceService.corrections({ limit: 50 }).subscribe({
      next: (res) => this.myCorrections.set(res.data),
      error: () => undefined,
    });
  }

  protected onMyMonthChange(m: string): void {
    this.myMonth.set(m);
    const from = `${m}-01`;
    this.loadMyAttendance(from);
  }

  protected onMyCorrectionRequested(date: string): void {
    this.checkInStore.openCorrection({ date });
  }

  protected async closePastDays(): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Close attendance up to selected date?',
      message: `This evaluates missing punches and marks unexcused absences up to ${this.selectedDate()}.`,
      confirmText: 'Close days',
      tone: 'warning',
    });
    if (!ok) return;

    this.closingDays.set(true);
    this.attendanceService.closeDays(this.selectedDate()).subscribe({
      next: () => {
        this.closingDays.set(false);
        this.toast.success('Days closed successfully');
        this.loadBoard();
      },
      error: (err) => {
        this.closingDays.set(false);
        this.toast.error('Failed to close days', apiErrorMessage(err));
      },
    });
  }

  protected getEmployeeName(c: AttendanceCorrection): string {
    if (typeof c.employeeId === 'object' && c.employeeId !== null) {
      return c.employeeId.fullName;
    }
    return 'Employee';
  }

  protected getEmployeeCode(c: AttendanceCorrection): string {
    if (typeof c.employeeId === 'object' && c.employeeId !== null) {
      return c.employeeId.code;
    }
    return '';
  }

  protected openDecisionModal(c: AttendanceCorrection, action: 'approve' | 'reject'): void {
    this.selectedCorrection.set(c);
    this.decisionAction.set(action);
    this.decisionComment.set('');
    this.decisionModalOpen.set(true);
  }

  protected confirmDecision(): void {
    if (!this.auth.isHr()) return;
    const c = this.selectedCorrection();
    if (!c) return;

    const action = this.decisionAction();
    const comment = this.decisionComment().trim();

    if (action === 'approve') {
      this.attendanceService.approveCorrection(c.id, comment || undefined).subscribe({
        next: () => {
          this.decisionModalOpen.set(false);
          this.toast.success('Correction approved');
          this.loadCorrections();
          this.approvals.refresh();
        },
        error: (err) => this.toast.error('Approval failed', apiErrorMessage(err)),
      });
    } else {
      if (!comment) return;
      this.attendanceService.rejectCorrection(c.id, comment).subscribe({
        next: () => {
          this.decisionModalOpen.set(false);
          this.toast.info('Correction rejected');
          this.loadCorrections();
          this.approvals.refresh();
        },
        error: (err) => this.toast.error('Rejection failed', apiErrorMessage(err)),
      });
    }
  }
}
