import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { AUDIT_ACTIONS, AuditAction, AuditLog, PageMeta } from '../../core/models/api.models';
import { AuditService } from '../../core/services/audit.service';
import { copyToClipboard } from '../../core/utils/format';
import { apiErrorMessage } from '../../core/utils/http';
import { JsonDiffComponent } from '../../shared/domain/json-diff.component';
import { FORMAT_PIPES } from '../../shared/pipes/format.pipes';
import { AvatarComponent, RoleBadgeComponent } from '../../shared/ui/badges';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';
import { Icons } from '../../shared/ui/icons';
import { SlideOverComponent } from '../../shared/ui/modal.component';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { PaginationComponent } from '../../shared/ui/pagination.component';

@Component({
  selector: 'app-audit-logs',
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    PageHeaderComponent,
    EmptyStateComponent,
    AvatarComponent,
    RoleBadgeComponent,
    SlideOverComponent,
    JsonDiffComponent,
    PaginationComponent,
    FORMAT_PIPES,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header
      title="Audit Trail"
      subtitle="Immutable, append-only security log recording every administrative action, approval, and data modification."
    >
      <div header-actions class="flex items-center gap-2">
        <span class="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white shadow-sm dark:bg-slate-800 dark:ring-1 dark:ring-white/10">
          <lucide-icon [img]="icons.ShieldCheck" [size]="14" class="text-blue-400" /> Immutable Trail
        </span>
        <button type="button" class="btn btn-ghost btn-sm" (click)="loadLogs()" [disabled]="loading()">
          <lucide-icon [img]="icons.RefreshCw" [size]="14" [class.animate-spin]="loading()" /> Refresh
        </button>
      </div>
    </app-page-header>

    <div class="space-y-6">
      <!-- Filter Ribbon -->
      <div class="card flex flex-wrap items-center justify-between gap-4 p-4">
        <div class="flex flex-wrap items-center gap-3">
          <!-- Action Filter -->
          <div class="flex items-center gap-2">
            <label for="audit-action" class="text-xs font-medium text-slate-500">Action:</label>
            <select
              id="audit-action"
              class="input input-sm max-w-[170px]"
              [ngModel]="selectedAction()"
              (ngModelChange)="selectedAction.set($event); onFilterChange()"
            >
              <option value="">All actions</option>
              @for (act of auditActions; track act) {
                <option [value]="act">{{ act | title }}</option>
              }
            </select>
          </div>

          <!-- Entity Filter -->
          <div class="flex items-center gap-2">
            <label for="audit-entity" class="text-xs font-medium text-slate-500">Entity:</label>
            <select
              id="audit-entity"
              class="input input-sm max-w-[170px]"
              [ngModel]="selectedEntity()"
              (ngModelChange)="selectedEntity.set($event); onFilterChange()"
            >
              <option value="">All entities</option>
              <option value="Employee">Employee</option>
              <option value="User">User</option>
              <option value="PayrollRun">Payroll Run</option>
              <option value="LeaveRequest">Leave Request</option>
              <option value="AttendanceRecord">Attendance Record</option>
              <option value="AttendanceCorrection">Attendance Correction</option>
              <option value="Announcement">Announcement</option>
              <option value="CompanySettings">Company Settings</option>
              <option value="Department">Department</option>
              <option value="Designation">Designation</option>
              <option value="LeaveType">Leave Type</option>
              <option value="Holiday">Holiday</option>
            </select>
          </div>

          <!-- Date Range -->
          <div class="flex items-center gap-2">
            <label for="audit-from" class="text-xs font-medium text-slate-500">From:</label>
            <input
              id="audit-from"
              type="date"
              class="input input-sm max-w-[145px]"
              [ngModel]="selectedFrom()"
              (ngModelChange)="selectedFrom.set($event); onFilterChange()"
            />
          </div>

          <div class="flex items-center gap-2">
            <label for="audit-to" class="text-xs font-medium text-slate-500">To:</label>
            <input
              id="audit-to"
              type="date"
              class="input input-sm max-w-[145px]"
              [ngModel]="selectedTo()"
              (ngModelChange)="selectedTo.set($event); onFilterChange()"
            />
          </div>
        </div>

        @if (selectedAction() || selectedEntity() || selectedFrom() || selectedTo()) {
          <button type="button" class="btn btn-ghost btn-sm text-slate-500" (click)="resetFilters()">
            <lucide-icon [img]="icons.RotateCcw" [size]="14" /> Clear filters
          </button>
        }
      </div>

      <!-- Logs Table -->
      @if (loading()) {
        <div class="space-y-3">
          @for (i of [1, 2, 3, 4, 5]; track i) {
            <div class="skeleton h-14 rounded-lg"></div>
          }
        </div>
      } @else if (logs().length === 0) {
        <app-empty-state
          art="shield"
          title="No audit entries found"
          description="No security or system events match the selected filters."
        />
      } @else {
        <div class="card overflow-hidden">
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Entity ID</th>
                  <th>Diff Available</th>
                  <th class="text-right">Inspect</th>
                </tr>
              </thead>
              <tbody>
                @for (log of logs(); track log.id) {
                  <tr>
                    <td class="num text-xs whitespace-nowrap">
                      <div>{{ log.createdAt | stamp }}</div>
                      <span class="text-slate-400 text-[11px]">{{ log.createdAt | ago }}</span>
                    </td>
                    <td>
                      <div class="flex items-center gap-2">
                        <app-avatar [name]="log.actorEmail || log.actorRole" size="xs" />
                        <div>
                          <p class="font-medium text-xs text-slate-800 dark:text-slate-200">{{ log.actorEmail || 'System' }}</p>
                          <app-role-badge [role]="asRole(log.actorRole)" />
                        </div>
                      </div>
                    </td>
                    <td>
                      <span class="badge bg-white text-slate-700 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700">
                        <lucide-icon [img]="actionIcon(log.action)" [size]="12" class="text-slate-400" />
                        {{ log.action | title }}
                      </span>
                    </td>
                    <td>
                      <span class="font-semibold text-xs text-slate-700 dark:text-slate-300">
                        {{ log.entity }}
                      </span>
                    </td>
                    <td class="font-mono text-xs text-slate-400">
                      @if (log.entityId) {
                        <button
                          type="button"
                          class="hover:text-slate-700 dark:hover:text-slate-200 transition"
                          [title]="'Click to copy: ' + log.entityId"
                          (click)="copyId(log.entityId)"
                        >
                          {{ log.entityId.slice(-8) }}...
                        </button>
                      } @else {
                        —
                      }
                    </td>
                    <td>
                      @if (hasDiff(log)) {
                        <span class="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 font-medium">
                          <lucide-icon [img]="icons.GitCompareArrows" [size]="13" /> Before &amp; After
                        </span>
                      } @else {
                        <span class="text-xs text-slate-400">Initial snapshot</span>
                      }
                    </td>
                    <td class="text-right">
                      <button type="button" class="btn btn-ghost btn-sm" (click)="selectedLog.set(log)">
                        <lucide-icon [img]="icons.Eye" [size]="14" /> Diff Viewer
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        <div class="mt-6">
          <app-pagination [meta]="meta()" (pageChange)="onPageChange($event)" />
        </div>
      }
    </div>

    <!-- Slide-Over Before / After JSON Diff Viewer -->
    <app-slide-over
      [open]="!!selectedLog()"
      [title]="'Audit Record · ' + (selectedLog()?.action | title)"
      [subtitle]="(selectedLog()?.entity || '') + ' (' + (selectedLog()?.createdAt | stamp) + ')'"
      size="xl"
      (closed)="selectedLog.set(null)"
    >
      @if (selectedLog(); as log) {
        <div class="p-6 space-y-6">
          <!-- Metadata Card -->
          <div class="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs dark:border-slate-800 dark:bg-slate-800/50 space-y-2">
            <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <span class="text-slate-400">Actor:</span>
                <p class="font-semibold text-slate-900 dark:text-white">{{ log.actorEmail || 'System Actor' }}</p>
              </div>
              <div>
                <span class="text-slate-400">Role:</span>
                <div><app-role-badge [role]="asRole(log.actorRole)" /></div>
              </div>
              <div>
                <span class="text-slate-400">Target Entity:</span>
                <p class="font-semibold text-slate-900 dark:text-white">{{ log.entity }}</p>
              </div>
              <div>
                <span class="text-slate-400">Entity ID:</span>
                <p class="font-mono text-slate-700 dark:text-slate-300 truncate" [title]="log.entityId || ''">{{ log.entityId || '—' }}</p>
              </div>
            </div>
          </div>

          <!-- JSON Diff Viewer Component -->
          <div>
            <h4 class="eyebrow mb-3">State Changes (Before &rarr; After)</h4>
            <div class="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <app-json-diff [before]="log.before" [after]="log.after" />
            </div>
          </div>
        </div>
      }
    </app-slide-over>
  `,
})
export class AuditLogsComponent implements OnInit {
  private readonly auditService = inject(AuditService);
  protected readonly icons = Icons;
  protected readonly auditActions = AUDIT_ACTIONS;

  protected readonly logs = signal<AuditLog[]>([]);
  protected readonly meta = signal<PageMeta | null>(null);
  protected readonly loading = signal(false);
  protected readonly currentPage = signal(1);

  // Filters
  protected readonly selectedAction = signal<AuditAction | ''>('');
  protected readonly selectedEntity = signal('');
  protected readonly selectedFrom = signal('');
  protected readonly selectedTo = signal('');

  // Selected Log for Slide-over
  protected readonly selectedLog = signal<AuditLog | null>(null);

  ngOnInit(): void {
    this.loadLogs();
  }

  protected loadLogs(page = this.currentPage()): void {
    this.loading.set(true);
    this.auditService
      .list({
        action: this.selectedAction() || undefined,
        entity: this.selectedEntity() || undefined,
        from: this.selectedFrom() || undefined,
        to: this.selectedTo() || undefined,
        page,
        limit: 15,
      })
      .subscribe({
        next: (res) => {
          this.logs.set(res.data);
          this.meta.set(res.meta);
          this.currentPage.set(res.meta.page);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  protected onFilterChange(): void {
    this.currentPage.set(1);
    this.loadLogs(1);
  }

  protected resetFilters(): void {
    this.selectedAction.set('');
    this.selectedEntity.set('');
    this.selectedFrom.set('');
    this.selectedTo.set('');
    this.onFilterChange();
  }

  protected onPageChange(page: number): void {
    this.loadLogs(page);
  }

  protected hasDiff(log: AuditLog): boolean {
    return log.before !== null && log.before !== undefined && log.after !== null && log.after !== undefined;
  }

  protected copyId(id: string): void {
    void copyToClipboard(id);
  }

  protected asRole(roleStr: string): 'Admin' | 'HR' | 'Employee' {
    if (roleStr === 'Admin' || roleStr === 'HR' || roleStr === 'Employee') return roleStr;
    return 'Admin';
  }

  protected actionIcon(action: AuditAction) {
    switch (action) {
      case 'create':
      case 'initialize':
        return Icons.Plus;
      case 'approve':
        return Icons.CircleCheck;
      case 'finalize':
        return Icons.Lock;
      case 'update':
      case 'change_password':
        return Icons.Pencil;
      case 'import':
        return Icons.Upload;
      case 'reset_password':
        return Icons.KeyRound;
      case 'delete':
      case 'reject':
        return Icons.CircleX;
      case 'activate':
        return Icons.ShieldCheck;
      case 'deactivate':
        return Icons.ShieldAlert;
      default:
        return Icons.Activity;
    }
  }
}
