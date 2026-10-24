import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LucideAngularModule, LucideIconData } from 'lucide-angular';
import { Role } from '../core/models/api.models';
import { ApprovalsStore } from '../core/services/approvals.store';
import { AuthService } from '../core/services/auth.service';
import { ConfirmService } from '../core/services/confirm.service';
import { PolicyStore } from '../core/services/policy.store';
import { AvatarComponent, RoleBadgeComponent } from '../shared/ui/badges';
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

/** Role-adaptive navigation on a deep navy surface. */
@Component({
  selector: 'app-sidebar',
  imports: [LucideAngularModule, RouterLink, RouterLinkActive, AvatarComponent, RoleBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside
      class="relative flex h-full flex-col overflow-hidden bg-[#0B1222] text-slate-300 transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
      [class]="collapsed() ? 'w-[84px]' : 'w-[272px]'"
    >
      <div class="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-emerald-500/15 blur-3xl"></div>
      <div class="pointer-events-none absolute -bottom-24 -right-20 h-56 w-56 rounded-full bg-violet-600/10 blur-3xl"></div>

      <!-- Brand -->
      <div class="relative flex h-16 shrink-0 items-center gap-3 px-5" [class.justify-center]="collapsed()" [class.px-0]="collapsed()">
        <a routerLink="/dashboard" class="group flex min-w-0 items-center gap-3" (click)="navigate.emit()">
          <span class="relative grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-lg font-black text-white shadow-lg shadow-emerald-500/30 transition-transform duration-300 group-hover:rotate-6 group-hover:scale-105">
            H
            <span class="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-[#0B1222] bg-violet-400"></span>
          </span>
          @if (!collapsed()) {
            <span class="min-w-0">
              <span class="block truncate text-[15px] font-extrabold leading-tight text-white">HCM <span class="text-emerald-400">Lite</span></span>
              <span class="block truncate text-[11px] font-medium text-slate-400">{{ policies.companyName() }}</span>
            </span>
          }
        </a>
        @if (mobile()) {
          <button type="button" class="ml-auto rounded-xl p-2 text-slate-400 transition hover:bg-white/5 hover:text-white" (click)="navigate.emit()" aria-label="Close menu">
            <lucide-icon [img]="icons.X" [size]="18" />
          </button>
        }
      </div>

      <!-- Navigation -->
      <nav class="scroll-thin relative flex-1 overflow-y-auto px-3 pb-4 pt-2">
        @for (section of sections(); track section.title) {
          @if (!collapsed()) {
            <p class="px-3 pb-2 pt-4 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{{ section.title }}</p>
          } @else {
            <div class="mx-auto my-3 h-px w-8 bg-white/10"></div>
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
                  class="group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200"
                  [class]="rla.isActive ? 'bg-gradient-to-r from-emerald-500/20 to-emerald-500/5 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'"
                  [class.justify-center]="collapsed()"
                >
                  @if (rla.isActive) {
                    <span class="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]"></span>
                  }
                  <span class="inline-flex shrink-0 transition-transform duration-200 group-hover:scale-110" [class.text-emerald-400]="rla.isActive">
                    <lucide-icon [img]="item.icon" [size]="19" [strokeWidth]="2.1" />
                  </span>
                  @if (!collapsed()) {
                    <span class="truncate">{{ item.label }}</span>
                  }
                  @if (badgeFor(item); as count) {
                    <span
                      class="grid min-w-5 place-items-center rounded-full bg-amber-400 px-1.5 text-[10px] font-bold leading-5 text-slate-950"
                      [class]="collapsed() ? 'absolute right-1.5 top-1 h-4 min-w-4 text-[9px] leading-4' : 'ml-auto h-5'"
                      >{{ count }}</span
                    >
                  }
                </a>
              </li>
            }
          </ul>
        }
      </nav>

      <!-- Account -->
      @if (auth.user(); as user) {
        <div class="relative border-t border-white/5 p-3">
          <div class="flex items-center gap-3 rounded-2xl bg-white/[0.04] p-2.5" [class.justify-center]="collapsed()">
            <app-avatar [name]="user.fullName" size="sm" />
            @if (!collapsed()) {
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-semibold text-white">{{ user.fullName }}</p>
                <div class="mt-0.5"><app-role-badge [role]="user.role" /></div>
              </div>
              <button type="button" class="rounded-xl p-2 text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-400" (click)="logout()" title="Sign out" aria-label="Sign out">
                <lucide-icon [img]="icons.LogOut" [size]="17" />
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

  protected async logout(): Promise<void> {
    const ok = await this.confirm.confirm({ title: 'Sign out?', message: 'You will need to sign in again to continue.', confirmText: 'Sign out', tone: 'navy', icon: 'logout' });
    if (ok) this.auth.logout();
  }
}
