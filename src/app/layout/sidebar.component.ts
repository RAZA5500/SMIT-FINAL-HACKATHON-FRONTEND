import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LucideAngularModule, LucideIconData } from 'lucide-angular';
import { Role } from '../core/models/api.models';
import { ApprovalsStore } from '../core/services/approvals.store';
import { AssistantStore } from '../core/services/assistant.store';
import { AuthService } from '../core/services/auth.service';
import { ConfirmService } from '../core/services/confirm.service';
import { PolicyStore } from '../core/services/policy.store';
import { AvatarComponent } from '../shared/ui/badges';
import { LogoComponent } from '../shared/ui/logo.component';
import { Icons } from '../shared/ui/icons';

interface NavItem {
  label: string;
  route: string;
  icon: LucideIconData;
  roles: Role[];
  requiresProfile?: boolean;
  badge?: 'leave' | 'corrections';
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const ALL: Role[] = ['Admin', 'HR', 'Employee'];

const SECTIONS: NavSection[] = [
  {
    title: 'Workspace',
    items: [
      { label: 'Dashboard', route: '/dashboard', icon: Icons.LayoutDashboard, roles: ALL },
      { label: 'My Profile', route: '/profile', icon: Icons.UserRound, roles: ['HR', 'Employee'], requiresProfile: true },
      { label: 'Employees', route: '/employees', icon: Icons.Users, roles: ['Admin', 'HR'] },
      { label: 'Attendance', route: '/attendance', icon: Icons.CalendarCheck, roles: ALL, badge: 'corrections' },
      { label: 'Leave', route: '/leave', icon: Icons.TreePalm, roles: ALL, badge: 'leave' },
      { label: 'Payroll', route: '/payroll', icon: Icons.Wallet, roles: ['Admin', 'HR'] },
      { label: 'My Payslips', route: '/payroll', icon: Icons.Wallet, roles: ['Employee'] },
      { label: 'Announcements', route: '/announcements', icon: Icons.Megaphone, roles: ALL },
    ],
  },
  {
    title: 'Company',
    items: [
      { label: 'Organization', route: '/organization', icon: Icons.Building2, roles: ['Admin', 'HR'] },
      { label: 'Logins & Access', route: '/users', icon: Icons.KeyRound, roles: ['Admin'] },
      { label: 'Audit Log', route: '/audit-logs', icon: Icons.ShieldCheck, roles: ['Admin'] },
    ],
  },
];

/** Role-adaptive navigation on a deep-navy rail with a blue aurora and an AI assistant card. */
@Component({
  selector: 'app-sidebar',
  imports: [LucideAngularModule, RouterLink, RouterLinkActive, AvatarComponent, LogoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside
      class="relative isolate flex h-full flex-col overflow-hidden border-r border-white/[0.06] bg-slate-950 text-slate-400 transition-[width] duration-300 ease-spring"
      [class]="collapsed() ? 'w-[76px]' : 'w-[260px]'"
    >
      <!-- ambient glow + grid -->
      <div aria-hidden="true" class="pointer-events-none absolute inset-0 -z-10">
        <div class="absolute -left-24 -top-24 h-64 w-64 animate-aurora rounded-full bg-blue-500/20 blur-3xl"></div>
        <div class="absolute -bottom-32 -right-24 h-72 w-72 animate-aurora rounded-full bg-violet-600/15 blur-3xl [animation-delay:-11s]"></div>
        <div class="mask-radial absolute inset-0 bg-grid-dark bg-[size:28px_28px] opacity-60"></div>
      </div>

      <!-- Brand -->
      <div class="flex h-16 shrink-0 items-center gap-2 px-4" [class.justify-center]="collapsed()" [class.px-0]="collapsed()">
        <a routerLink="/dashboard" class="group flex min-w-0 items-center gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50" (click)="navigate.emit()">
          <app-logo [size]="36" class="transition-transform duration-300 ease-spring group-hover:-rotate-6 group-hover:scale-105" />
          @if (!collapsed()) {
            <span class="min-w-0">
              <span class="block truncate text-[15px] font-semibold leading-tight tracking-tight text-white">HCM Lite</span>
              <span class="block truncate text-xs text-slate-500">{{ policies.companyName() }}</span>
            </span>
          }
        </a>
        @if (mobile()) {
          <button type="button" class="btn btn-icon ml-auto text-slate-400 hover:bg-white/[0.06] hover:text-white" (click)="navigate.emit()" aria-label="Close menu">
            <lucide-icon [img]="icons.X" [size]="18" />
          </button>
        }
      </div>

      <!-- Navigation -->
      <nav class="no-scrollbar flex-1 overflow-y-auto px-3 pb-4">
        @for (section of sections(); track section.title) {
          @if (!collapsed()) {
            <p class="px-3 pb-2 pt-5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">{{ section.title }}</p>
          } @else {
            <div class="mx-auto my-4 h-px w-8 bg-white/[0.08]"></div>
          }
          <ul class="space-y-1">
            @for (item of section.items; track item.label) {
              <li>
                <a
                  [routerLink]="item.route"
                  routerLinkActive="nav-active"
                  #rla="routerLinkActive"
                  (click)="navigate.emit()"
                  [title]="collapsed() ? item.label : ''"
                  class="group relative flex items-center gap-3 rounded-[10px] px-3 py-2 text-sm font-medium outline-none transition-all duration-200 ease-spring focus-visible:ring-2 focus-visible:ring-blue-400/50"
                  [class]="
                    rla.isActive
                      ? 'bg-gradient-to-r from-white/[0.10] to-white/[0.03] text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]'
                      : 'text-slate-400 hover:bg-white/[0.05] hover:text-white'
                  "
                  [class.justify-center]="collapsed()"
                >
                  @if (rla.isActive) {
                    <span aria-hidden="true" class="absolute -left-3 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-blue-300 to-indigo-500 shadow-[0_0_12px_rgb(96_165_250/0.8)]"></span>
                  }
                  <span
                    class="inline-flex shrink-0 transition-transform duration-200 ease-spring group-hover:scale-110"
                    [class]="rla.isActive ? 'text-blue-400 drop-shadow-[0_0_6px_rgb(96_165_250/0.6)]' : 'text-slate-500 group-hover:text-slate-200'"
                  >
                    <lucide-icon [img]="item.icon" [size]="18" [strokeWidth]="2" />
                  </span>
                  @if (!collapsed()) {
                    <span class="truncate transition-transform duration-200 ease-spring group-hover:translate-x-0.5">{{ item.label }}</span>
                  }
                  @if (badgeFor(item); as count) {
                    <span
                      class="num grid place-items-center rounded-full bg-amber-400 px-1.5 text-[11px] font-semibold text-slate-950 shadow-[0_0_12px_rgb(251_191_36/0.45)]"
                      [class]="collapsed() ? 'absolute right-1 top-1 h-4 min-w-4 text-[10px] leading-4' : 'ml-auto h-5 min-w-5 leading-5'"
                      >{{ count }}</span
                    >
                  }
                </a>
              </li>
            }
          </ul>
        }
      </nav>

      <!-- AI assistant -->
      <div class="px-3 pb-3">
        @if (!collapsed()) {
          <div class="relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-violet-600/30 via-violet-500/10 to-blue-500/10 p-3.5">
            <div aria-hidden="true" class="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-violet-500/40 blur-2xl"></div>
            <div class="relative flex items-center gap-2 text-sm font-semibold text-white">
              <span class="grid h-7 w-7 place-items-center rounded-lg bg-ai-gradient shadow-glow-violet"><lucide-icon [img]="icons.Sparkles" [size]="14" /></span>
              AI assistant
            </div>
            <p class="relative mt-2 text-xs leading-relaxed text-slate-400">Ask about attendance, leave or payroll, in English or Roman Urdu.</p>
            <button type="button" class="relative mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-white/10 py-1.5 text-xs font-medium text-white ring-1 ring-inset ring-white/15 transition hover:bg-white/15" (click)="openAssistant()">
              Ask a question <lucide-icon [img]="icons.ArrowRight" [size]="13" />
            </button>
          </div>
        } @else {
          <button type="button" class="mx-auto grid h-10 w-10 place-items-center rounded-[10px] bg-ai-gradient text-white shadow-glow-violet transition hover:scale-105" (click)="openAssistant()" title="Ask the AI assistant" aria-label="Ask the AI assistant">
            <lucide-icon [img]="icons.Sparkles" [size]="17" />
          </button>
        }
      </div>

      <!-- Account -->
      @if (auth.user(); as user) {
        <div class="border-t border-white/[0.06] p-3">
          <div class="flex items-center gap-3 rounded-[10px] p-1.5 transition-colors hover:bg-white/[0.04]" [class.justify-center]="collapsed()">
            <app-avatar [name]="user.fullName" size="sm" />
            @if (!collapsed()) {
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium text-white">{{ user.fullName }}</p>
                <p class="truncate text-xs text-slate-500">{{ user.role }}</p>
              </div>
              <button type="button" class="btn btn-icon text-slate-500 hover:bg-white/[0.06] hover:text-rose-400" (click)="logout()" title="Sign out" aria-label="Sign out">
                <lucide-icon [img]="icons.LogOut" [size]="16" />
              </button>
            }
          </div>
        </div>
      }
    </aside>
  `,
})
export class SidebarComponent {
  protected readonly auth = inject(AuthService);
  protected readonly policies = inject(PolicyStore);
  private readonly approvals = inject(ApprovalsStore);
  private readonly assistant = inject(AssistantStore);
  private readonly confirm = inject(ConfirmService);
  protected readonly icons = Icons;

  readonly collapsed = input(false);
  readonly mobile = input(false);
  readonly navigate = output<void>();

  protected readonly sections = computed(() => {
    const role = this.auth.role();
    const hasProfile = this.auth.hasEmployeeProfile();
    return SECTIONS.map((section) => ({
      ...section,
      items: section.items.filter((item) => !!role && item.roles.includes(role) && (!item.requiresProfile || hasProfile)),
    })).filter((section) => section.items.length > 0);
  });

  protected badgeFor(item: NavItem): number {
    if (!item.badge || !this.auth.isManager()) return 0;
    return item.badge === 'leave' ? this.approvals.pendingLeave() : this.approvals.pendingCorrections();
  }

  protected openAssistant(): void {
    this.navigate.emit();
    this.assistant.openDrawer();
  }

  protected async logout(): Promise<void> {
    const ok = await this.confirm.confirm({ title: 'Sign out?', message: 'You will need to sign in again to continue.', confirmText: 'Sign out', tone: 'navy', icon: 'logout' });
    if (ok) this.auth.logout();
  }
}
