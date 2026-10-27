import { ChangeDetectionStrategy, Component, ElementRef, HostListener, computed, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRouteSnapshot, NavigationEnd, Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { filter } from 'rxjs';
import { AssistantStore } from '../core/services/assistant.store';
import { AuthService } from '../core/services/auth.service';
import { ClockService } from '../core/services/clock.service';
import { ConfirmService } from '../core/services/confirm.service';
import { PolicyStore } from '../core/services/policy.store';
import { ThemeService } from '../core/services/theme.service';
import { formatTime } from '../core/utils/dates';
import { dropdown } from '../shared/animations';
import { AvatarComponent, RoleBadgeComponent } from '../shared/ui/badges';
import { Icons } from '../shared/ui/icons';
import { NotificationBellComponent } from './notification-bell.component';

/** Topbar: breadcrumb title, company clock, AI, theme switch, notifications and account menu. */
@Component({
  selector: 'app-topbar',
  imports: [LucideAngularModule, RouterLink, AvatarComponent, RoleBadgeComponent, NotificationBellComponent],
  animations: [dropdown],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="border-b border-slate-200/70 bg-white/70 backdrop-blur-xl backdrop-saturate-150 dark:border-white/[0.06] dark:bg-slate-950/70">
      <div class="flex h-16 items-center gap-1.5 px-3 sm:gap-2 sm:px-6 lg:px-8">
        <button type="button" class="btn btn-ghost btn-icon lg:hidden" (click)="menu.emit()" aria-label="Open navigation">
          <lucide-icon [img]="icons.Menu" [size]="18" />
        </button>
        <button type="button" class="btn btn-ghost btn-icon hidden lg:inline-flex" (click)="toggleCollapse.emit()" [attr.aria-label]="collapsed() ? 'Expand sidebar' : 'Collapse sidebar'">
          <lucide-icon [img]="collapsed() ? icons.PanelLeftOpen : icons.PanelLeftClose" [size]="18" />
        </button>

        <p class="flex min-w-0 flex-1 items-center gap-2 text-sm">
          <span class="hidden truncate text-slate-500 dark:text-slate-400 sm:inline">{{ policies.companyName() }}</span>
          <span class="hidden text-slate-300 dark:text-slate-600 sm:inline" aria-hidden="true">/</span>
          <span class="truncate font-medium text-slate-900 dark:text-white">{{ title() }}</span>
        </p>

        <span
          class="hidden items-center gap-2 rounded-full border border-slate-200/80 bg-white/70 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-xs dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300 md:inline-flex"
          [title]="'Company time (' + policies.timezone() + ')'"
        >
          <span class="relative flex h-2 w-2">
            <span class="absolute inline-flex h-full w-full animate-ping-soft rounded-full bg-blue-400"></span>
            <span class="relative inline-flex h-2 w-2 rounded-full bg-blue-500"></span>
          </span>
          <span class="num">{{ liveTime() }}</span>
        </span>
        <span class="mx-1 hidden h-6 w-px bg-slate-200 dark:bg-white/10 md:block" aria-hidden="true"></span>

        <button type="button" class="btn btn-ai btn-sm hidden rounded-full px-3.5 sm:inline-flex" (click)="assistant.openDrawer()">
          <lucide-icon [img]="icons.Sparkles" [size]="14" /> Ask AI
        </button>
        <button type="button" class="btn btn-ghost btn-icon text-violet-600 dark:text-violet-300 sm:hidden" (click)="assistant.openDrawer()" aria-label="Ask the AI assistant">
          <lucide-icon [img]="icons.Sparkles" [size]="18" />
        </button>

        <button type="button" class="btn btn-ghost btn-icon group" (click)="theme.toggle()" [attr.aria-label]="theme.isDark() ? 'Switch to light mode' : 'Switch to dark mode'" [title]="theme.isDark() ? 'Light mode' : 'Dark mode'">
          <lucide-icon [img]="theme.isDark() ? icons.Sun : icons.Moon" [size]="18" class="transition-transform duration-500 ease-spring group-hover:rotate-[24deg] group-active:rotate-[180deg]" />
        </button>

        <app-notification-bell />

        @if (auth.user(); as user) {
          <div class="relative">
            <button type="button" class="ml-1 flex items-center gap-1.5 rounded-full p-0.5 outline-none ring-2 ring-transparent transition duration-200 hover:scale-105 hover:ring-blue-400/40 focus-visible:ring-blue-500/50" (click)="menuOpen.set(!menuOpen())" [attr.aria-expanded]="menuOpen()" aria-label="Account menu">
              <app-avatar [name]="user.fullName" size="sm" />
            </button>
            @if (menuOpen()) {
              <div @dropdown class="absolute right-0 top-12 z-50 w-72 overflow-hidden rounded-xl border border-slate-200/80 bg-white/95 p-1.5 shadow-lift backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/95">
                <div class="relative mb-1 flex items-center gap-3 overflow-hidden rounded-lg bg-gradient-to-br from-blue-50 via-white to-violet-50 px-3 py-3 dark:from-blue-500/10 dark:via-slate-900 dark:to-violet-500/10">
                  <app-avatar [name]="user.fullName" size="md" />
                  <div class="min-w-0">
                    <p class="truncate text-sm font-semibold text-slate-900 dark:text-white">{{ user.fullName }}</p>
                    <p class="truncate text-xs text-slate-500 dark:text-slate-400">{{ user.email }}</p>
                    <div class="mt-1.5"><app-role-badge [role]="user.role" /></div>
                  </div>
                </div>
                @if (auth.hasEmployeeProfile()) {
                  <a routerLink="/profile" class="menu-item" (click)="menuOpen.set(false)"><lucide-icon [img]="icons.UserRound" [size]="16" /> My profile</a>
                }
                <a routerLink="/change-password" class="menu-item" (click)="menuOpen.set(false)"><lucide-icon [img]="icons.KeyRound" [size]="16" /> Change password</a>
                <button type="button" class="menu-item w-full text-rose-600 dark:text-rose-400" (click)="logout()"><lucide-icon [img]="icons.LogOut" [size]="16" /> Sign out</button>
              </div>
            }
          </div>
        }
      </div>
    </header>
  `,
  styles: `
    .menu-item {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      border-radius: 0.5rem;
      padding: 0.55rem 0.75rem;
      font-size: 0.875rem;
      transition:
        background-color 0.15s,
        padding-left 0.2s cubic-bezier(0.22, 1, 0.36, 1);
    }
    .menu-item:hover {
      background: rgb(160 163 171 / 0.14);
      padding-left: 0.95rem;
    }
  `,
})
export class TopbarComponent {
  protected readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);
  protected readonly assistant = inject(AssistantStore);
  protected readonly policies = inject(PolicyStore);
  private readonly clock = inject(ClockService);
  private readonly confirm = inject(ConfirmService);
  private readonly router = inject(Router);
  private readonly host = inject(ElementRef<HTMLElement>);
  protected readonly icons = Icons;

  readonly collapsed = input(false);
  readonly menu = output<void>();
  readonly toggleCollapse = output<void>();

  protected readonly menuOpen = signal(false);
  protected readonly title = signal('Dashboard');
  protected readonly liveTime = computed(() => formatTime(this.clock.now(), this.policies.timezone()));

  constructor() {
    this.title.set(this.titleFrom(this.router.routerState.snapshot.root));
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.menuOpen.set(false);
        this.title.set(this.titleFrom(this.router.routerState.snapshot.root));
      });
  }

  protected async logout(): Promise<void> {
    this.menuOpen.set(false);
    const ok = await this.confirm.confirm({ title: 'Sign out?', message: 'You will need to sign in again to continue.', confirmText: 'Sign out', tone: 'navy', icon: 'logout' });
    if (ok) this.auth.logout();
  }

  private titleFrom(route: ActivatedRouteSnapshot): string {
    let current: ActivatedRouteSnapshot | null = route;
    let title = 'HCM Lite';
    while (current) {
      const value = current.title ?? current.data?.['title'];
      if (typeof value === 'string') title = value;
      current = current.firstChild;
    }
    return title;
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (this.menuOpen() && !this.host.nativeElement.contains(event.target as Node)) this.menuOpen.set(false);
  }
}
