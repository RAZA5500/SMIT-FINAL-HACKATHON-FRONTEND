import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuditLog } from '../../core/models/api.models';
import { AuditService } from '../../core/services/audit.service';
import { listStagger } from '../../shared/animations';
import { AgoPipe } from '../../shared/pipes/format.pipes';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';
import { Icons } from '../../shared/ui/icons';

/** Live audit-log feed for the Admin dashboard (auto-refreshes every 20 s). */
@Component({
  selector: 'app-audit-feed',
  imports: [LucideAngularModule, RouterLink, EmptyStateComponent, AgoPipe],
  animations: [listStagger],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="card flex h-full flex-col p-5">
      <header class="mb-4 flex items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <div>
            <h3 class="section-title">Audit log feed</h3>
            <p class="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <span class="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
              Live · immutable
            </p>
          </div>
        </div>
        <a routerLink="/audit-logs" class="btn btn-ghost btn-sm">Open <lucide-icon [img]="icons.ArrowRight" [size]="14" /></a>
      </header>
      @if (loading() && logs().length === 0) {
        <div class="space-y-2.5">
          @for (i of [1, 2, 3, 4]; track i) {
            <div class="skeleton h-11"></div>
          }
        </div>
      } @else if (logs().length === 0) {
        <app-empty-state [compact]="true" art="shield" title="No activity yet" description="Every create, update, approval and payroll lock will be recorded here." />
      } @else {
        <ol class="relative space-y-1 before:absolute before:bottom-2 before:left-[15px] before:top-2 before:w-px before:bg-slate-200 dark:before:bg-slate-800" [@listStagger]="logs().length">
          @for (log of logs(); track log.id) {
            <li class="relative flex items-start gap-3 rounded-lg py-2 pl-0 pr-1">
              <span class="relative z-[1] mt-1 grid h-[31px] w-[31px] shrink-0 place-items-center rounded-full bg-white ring-4 ring-white dark:bg-slate-900 dark:ring-slate-900">
                <span class="h-2 w-2 rounded-full" [class]="dotClass(log.action)"></span>
              </span>
              <div class="min-w-0 flex-1">
                <p class="flex flex-wrap items-center gap-1.5 text-sm">
                  <span class="badge bg-white text-slate-700 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700">{{ log.action.replace('_', ' ') }}</span>
                  <span class="font-medium text-slate-800 dark:text-slate-100">{{ log.entity }}</span>
                </p>
                <p class="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{{ log.actorEmail || 'System' }} · {{ log.actorRole }} · {{ log.createdAt | ago }}</p>
              </div>
            </li>
          }
        </ol>
      }
    </section>
  `,
})
export class AuditFeedComponent implements OnInit {
  private readonly audit = inject(AuditService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly icons = Icons;
  protected readonly logs = signal<AuditLog[]>([]);
  protected readonly loading = signal(true);

  ngOnInit(): void {
    this.load();
    const timer = setInterval(() => document.visibilityState === 'visible' && this.load(), 20_000);
    this.destroyRef.onDestroy(() => clearInterval(timer));
  }

  protected dotClass(action: string): string {
    if (['create', 'initialize', 'activate'].includes(action)) return 'bg-blue-500';
    if (['reject', 'delete', 'deactivate'].includes(action)) return 'bg-rose-500';
    if (['approve', 'finalize'].includes(action)) return 'bg-slate-900 dark:bg-white';
    if (action === 'import') return 'bg-violet-500';
    return 'bg-blue-500';
  }

  private load(): void {
    this.audit.list({ limit: 7 }, true).subscribe({
      next: (res) => {
        this.logs.set(res.data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
