import { ChangeDetectionStrategy, Component, ElementRef, HostListener, effect, inject, signal, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { LucideAngularModule, LucideIconData } from 'lucide-angular';
import { AppNotification, NotificationType } from '../core/models/api.models';
import { CommsService } from '../core/services/comms.service';
import { NotificationStore } from '../core/services/notification.store';
import { dropdown } from '../shared/animations';
import { AgoPipe } from '../shared/pipes/format.pipes';
import { EmptyStateComponent } from '../shared/ui/empty-state.component';
import { Icons } from '../shared/ui/icons';

const TYPE_STYLE: Record<NotificationType, { icon: LucideIconData; chip: string }> = {
  leave: { icon: Icons.TreePalm, chip: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
  attendance: { icon: Icons.CalendarCheck, chip: 'bg-blue-500/15 text-blue-600 dark:text-blue-400' },
  payroll: { icon: Icons.Wallet, chip: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' },
  announcement: { icon: Icons.Megaphone, chip: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
  account: { icon: Icons.KeyRound, chip: 'bg-slate-500/15 text-slate-600 dark:text-slate-300' },
  system: { icon: Icons.Info, chip: 'bg-violet-500/15 text-violet-600 dark:text-violet-400' },
};

const ENTITY_ROUTES: Record<string, string> = {
  LeaveRequest: '/leave',
  AttendanceCorrection: '/attendance',
  Attendance: '/attendance',
  PayrollRun: '/payroll',
  Payslip: '/payroll',
  Announcement: '/announcements',
};

/** Navbar bell: unread badge + dropdown of leave decisions, corrections, payslips and announcements. */
@Component({
  selector: 'app-notification-bell',
  imports: [LucideAngularModule, EmptyStateComponent, AgoPipe],
  animations: [dropdown],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative">
      <button
        type="button"
        class="btn btn-ghost btn-icon relative"
        [class.animate-wiggle]="wiggle()"
        (click)="toggle()"
        [attr.aria-expanded]="open()"
        aria-label="Notifications"
      >
        <lucide-icon [img]="store.unread() ? icons.BellRing : icons.Bell" [size]="20" />
        @if (store.unread()) {
          <span class="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center">
            <span class="absolute inline-flex h-full w-full animate-ping-soft rounded-full bg-rose-400"></span>
            <span class="relative grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white ring-2 ring-white dark:ring-slate-950">{{ store.unread() > 9 ? '9+' : store.unread() }}</span>
          </span>
        }
      </button>

      @if (open()) {
        <div
          @dropdown
          class="fixed inset-x-3 top-16 z-50 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/15 dark:border-slate-800 dark:bg-slate-900 sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-[24rem]"
        >
          <header class="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <div>
              <p class="font-semibold text-slate-900 dark:text-white">Notifications</p>
              <p class="text-xs text-slate-500 dark:text-slate-400">{{ store.unread() ? store.unread() + ' unread' : 'All caught up' }}</p>
            </div>
            <button type="button" class="btn btn-ghost btn-sm" [disabled]="!store.unread()" (click)="markAll()">
              <lucide-icon [img]="icons.CheckCheck" [size]="14" /> Mark all read
            </button>
          </header>
          <div class="scroll-thin max-h-[60vh] overflow-y-auto">
            @if (loading() && items().length === 0) {
              <div class="space-y-2 p-4">
                @for (i of [1, 2, 3]; track i) {
                  <div class="skeleton h-14"></div>
                }
              </div>
            } @else if (items().length === 0) {
              <app-empty-state [compact]="true" art="inbox" tone="emerald" title="You're all caught up" description="Leave decisions, corrections and payslips will appear here." />
            } @else {
              <ul>
                @for (n of items(); track n.id) {
                  <li>
                    <button
                      type="button"
                      class="flex w-full items-start gap-3 border-b border-slate-50 px-4 py-3 text-left transition hover:bg-slate-50 dark:border-slate-800/60 dark:hover:bg-slate-800/50"
                      (click)="openNotification(n)"
                    >
                      <span class="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl" [class]="style(n).chip">
                        <lucide-icon [img]="style(n).icon" [size]="16" />
                      </span>
                      <span class="min-w-0 flex-1">
                        <span class="flex items-center gap-2">
                          <span class="truncate text-sm font-semibold" [class]="n.isRead ? 'text-slate-600 dark:text-slate-300' : 'text-slate-900 dark:text-white'">{{ n.title }}</span>
                          @if (!n.isRead) {
                            <span class="h-2 w-2 shrink-0 rounded-full bg-emerald-500"></span>
                          }
                        </span>
                        <span class="mt-0.5 line-clamp-2 block text-xs leading-snug text-slate-500 dark:text-slate-400">{{ n.message }}</span>
                        <span class="mt-1 block text-[11px] text-slate-400">{{ n.createdAt | ago }}</span>
                      </span>
                    </button>
                  </li>
                }
              </ul>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class NotificationBellComponent {
  protected readonly store = inject(NotificationStore);
  private readonly comms = inject(CommsService);
  private readonly router = inject(Router);
  private readonly host = inject(ElementRef<HTMLElement>);
  protected readonly icons = Icons;

  protected readonly open = signal(false);
  protected readonly loading = signal(false);
  protected readonly items = signal<AppNotification[]>([]);
  protected readonly wiggle = signal(false);

  constructor() {
    effect(() => {
      if (this.store.pulse() === 0) return;
      untracked(() => {
        this.wiggle.set(true);
        setTimeout(() => this.wiggle.set(false), 950);
        if (this.open()) this.load();
      });
    });
  }

  protected style(n: AppNotification) {
    return TYPE_STYLE[n.type] ?? TYPE_STYLE.system;
  }

  protected toggle(): void {
    this.open.update((v) => !v);
    if (this.open()) this.load();
  }

  protected openNotification(n: AppNotification): void {
    if (!n.isRead) {
      this.comms.markRead(n.id).subscribe({ next: () => this.store.decrement(), error: () => undefined });
      this.items.update((list) => list.map((item) => (item.id === n.id ? { ...item, isRead: true } : item)));
    }
    this.open.set(false);
    const route = (n.entity && ENTITY_ROUTES[n.entity]) || null;
    if (route) void this.router.navigateByUrl(route);
  }

  protected markAll(): void {
    this.comms.markAllRead().subscribe({
      next: () => {
        this.store.clear();
        this.items.update((list) => list.map((n) => ({ ...n, isRead: true })));
      },
      error: () => undefined,
    });
  }

  private load(): void {
    this.loading.set(true);
    this.comms.notifications({ limit: 15 }).subscribe({
      next: (res) => {
        this.items.set(res.data);
        this.loading.set(false);
        this.store.refresh();
      },
      error: () => this.loading.set(false),
    });
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) this.open.set(false);
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.open.set(false);
  }
}
