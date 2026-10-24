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

/** Glass topbar: page title, live company clock, theme switch, AI, notifications and account menu. */
@Component({
  selector: 'app-topbar',
  imports: [LucideAngularModule, RouterLink, AvatarComponent, RoleBadgeComponent, NotificationBellComponent],
  animations: [dropdown],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="sticky top-0 z-40 border-b border-slate-200/70 bg-white/70 backdrop-blur-md dark:border-slate-800/70 dark:bg-slate-950/60">
      <div class="flex h-16 items-center gap-2 px-3 sm:gap-3 sm:px-6 lg:px-8">
        <button type="button" class="btn btn-ghost btn-icon lg:hidden" (click)="menu.emit()" aria-label="Open navigation">
          <lucide-icon [img]="icons.Menu" [size]="20" />
        </button>
        <button type="button" class="btn btn-ghost btn-icon hidden lg:inline-flex" (click)="toggleCollapse.emit()" [attr.aria-label]="collapsed() ? 'Expand sidebar' : 'Collapse sidebar'">
          <lucide-icon [img]="collapsed() ? icons.PanelLeftOpen : icons.PanelLeftClose" [size]="19" />
        </button>

        <div class="min-w-0 flex-1">
          <p class="truncate text-[15px] font-bold text-slate-900 dark:text-white sm:text-base">{{ title() }}</p>
          <p class="hidden truncate text-xs text-slate-500 dark:text-slate-400 sm:block">{{ policies.companyName() }}</p>
        </div>

        <span class="hidden items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1.5 font-mono text-xs font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300 md:inline-flex" [title]="'Company time (' + policies.timezone() + ')'">
          <span class="relative flex h-2 w-2"><span class="absolute inline-flex h-full w-full animate-ping-soft rounded-full bg-emerald-400"></span><span class="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span></span>
          {{ liveTime() }}
        </span>

        <button type="button" class="btn btn-ai hidden px-3.5 py-2 sm:inline-flex" (click)="assistant.openDrawer()">
          <lucide-icon [img]="icons.Sparkles" [size]="16" /> Ask AI
        </button>

        <button type="button" class="btn btn-ghost btn-icon" (click)="theme.toggle()" [attr.aria-label]="theme.isDark() ? 'Switch to light mode' : 'Switch to dark mode'">
          <span class="relative grid h-5 w-5 place-items-center">
            <span class="absolute transition-all duration-500" [class]="theme.isDark() ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'">
              <lucide-icon [img]="icons.Moon" [size]="19" />
            </span>
            <span class="absolute text-amber-400 transition-all duration-500" [class]="theme.isDark() ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'">
              <lucide-icon [img]="icons.Sun" [size]="19" />
            </span>
          </span>
        </button>

        <app-notification-bell />

        @if (auth.user(); as user) {
          <div class="relative">
            <button type="button" class="flex items-center gap-2 rounded-2xl p-1 pr-2 transition hover:bg-slate-100 dark:hover:bg-slate-800" (click)="menuOpen.set(!menuOpen())" [attr.aria-expanded]="menuOpen()" aria-label="Account menu">
              <app-avatar [name]="user.fullName" size="sm" />
              <lucide-icon [img]="icons.ChevronDown" [size]="15" class="hidden text-slate-400 sm:block" />
            </button>
            @if (menuOpen()) {
              <div @dropdown class="absolute right-0 top-12 z-50 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl shadow-slate-900/15 dark:border-slate-800 dark:bg-slate-900">
                <div class="px-3 py-2.5">
                  <p class="truncate text-sm font-semibold text-slate-900 dark:text-white">{{ user.fullName }}</p>
                  <p class="truncate text-xs text-slate-500 dark:text-slate-400">{{ user.email }}</p>
                  <div class="mt-1.5"><app-role-badge [role]="user.role" /></div>
                </div>
                <div class="my-1 h-px bg-slate-100 dark:bg-slate-800"></div>
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
      gap: 0.6rem;
      border-radius: 0.75rem;
      padding: 0.55rem 0.75rem;
      font-size: 0.875rem;
      font-weight: 500;
      transition: background-color 0.15s;
    }
    .menu-item:hover {
      background: rgb(148 163 184 / 0.14);
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
