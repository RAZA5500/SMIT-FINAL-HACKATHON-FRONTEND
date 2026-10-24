import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { LucideAngularModule, LucideIconData } from 'lucide-angular';
import { Role } from '../../core/models/api.models';
import { avatarGradient, initials } from '../../core/utils/format';
import { Icons } from './icons';

interface BadgeStyle {
  label: string;
  classes: string;
  icon: LucideIconData;
}

/** Colour system from the brief: emerald = present/approved, blue = late, amber = leave/pending, rose = absent/rejected, navy = locked. */
const STATUS_STYLES: Record<string, BadgeStyle> = {
  present: { label: 'Present', classes: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/25', icon: Icons.CircleCheck },
  late: { label: 'Late', classes: 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-400/25', icon: Icons.Clock },
  half_day: { label: 'Half day', classes: 'bg-orange-50 text-orange-700 ring-orange-600/20 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-400/25', icon: Icons.Timer },
  missing_checkout: { label: 'Missing check-out', classes: 'bg-slate-100 text-slate-700 ring-slate-500/25 dark:bg-slate-500/15 dark:text-slate-300 dark:ring-slate-400/25', icon: Icons.CircleAlert },
  absent: { label: 'Absent', classes: 'bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-400/25', icon: Icons.CircleX },
  on_leave: { label: 'On leave', classes: 'bg-amber-50 text-amber-800 ring-amber-600/25 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/25', icon: Icons.TreePalm },
  not_checked_in: { label: 'Not checked in', classes: 'bg-slate-50 text-slate-500 ring-slate-400/25 dark:bg-slate-800/60 dark:text-slate-400 dark:ring-slate-600/40', icon: Icons.CircleDashed },
  weekend: { label: 'Weekend', classes: 'bg-slate-50 text-slate-500 ring-slate-300/50 dark:bg-slate-800/60 dark:text-slate-400 dark:ring-slate-600/40', icon: Icons.CalendarDays },
  holiday: { label: 'Holiday', classes: 'bg-teal-50 text-teal-700 ring-teal-600/20 dark:bg-teal-500/10 dark:text-teal-300 dark:ring-teal-400/25', icon: Icons.PartyPopper },
  pending: { label: 'Pending', classes: 'bg-amber-50 text-amber-800 ring-amber-600/25 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/25', icon: Icons.Hourglass },
  approved: { label: 'Approved', classes: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/25', icon: Icons.CircleCheck },
  rejected: { label: 'Rejected', classes: 'bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-400/25', icon: Icons.CircleX },
  cancelled: { label: 'Cancelled', classes: 'bg-slate-100 text-slate-600 ring-slate-400/30 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-600/40', icon: Icons.Ban },
  draft: { label: 'Draft', classes: 'bg-amber-50 text-amber-800 ring-amber-600/25 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/25', icon: Icons.Pencil },
  finalized: { label: 'Locked', classes: 'bg-slate-900 text-white ring-slate-900 dark:bg-white dark:text-slate-900 dark:ring-white', icon: Icons.Lock },
  active: { label: 'Active', classes: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/25', icon: Icons.CircleCheck },
  probation: { label: 'Probation', classes: 'bg-amber-50 text-amber-800 ring-amber-600/25 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/25', icon: Icons.Hourglass },
  exited: { label: 'Exited', classes: 'bg-slate-100 text-slate-600 ring-slate-400/30 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-600/40', icon: Icons.UserX },
  inactive: { label: 'Inactive', classes: 'bg-slate-100 text-slate-600 ring-slate-400/30 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-600/40', icon: Icons.Ban },
  high: { label: 'High risk', classes: 'bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-400/25', icon: Icons.TriangleAlert },
  medium: { label: 'Medium risk', classes: 'bg-amber-50 text-amber-800 ring-amber-600/25 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/25', icon: Icons.CircleAlert },
  low: { label: 'Low risk', classes: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/25', icon: Icons.ShieldCheck },
};

export function statusLabel(status: string | null | undefined): string {
  if (!status) return '—';
  return STATUS_STYLES[status]?.label ?? status.replace(/_/g, ' ');
}

/** Status pill with icon + label — colour never carries meaning alone. */
@Component({
  selector: 'app-status-badge',
  imports: [LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="badge" [class]="style().classes" [class.text-xs]="size() === 'md'" [class.px-3]="size() === 'md'" [class.py-1]="size() === 'md'">
      <lucide-icon [img]="style().icon" [size]="size() === 'md' ? 14 : 12" [strokeWidth]="2.4" />
      {{ label() || style().label }}
    </span>
  `,
})
export class StatusBadgeComponent {
  readonly status = input.required<string>();
  readonly label = input<string>('');
  readonly size = input<'sm' | 'md'>('sm');

  protected readonly style = computed<BadgeStyle>(
    () => STATUS_STYLES[this.status()] ?? { label: statusLabel(this.status()), classes: STATUS_STYLES['inactive'].classes, icon: Icons.Info },
  );
}

const ROLE_STYLES: Record<Role, { classes: string; icon: LucideIconData }> = {
  Admin: { classes: 'bg-slate-900 text-white ring-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:ring-slate-100', icon: Icons.ShieldCheck },
  HR: { classes: 'bg-emerald-500 text-white ring-emerald-500 dark:bg-emerald-500/20 dark:text-emerald-300 dark:ring-emerald-400/40', icon: Icons.Users },
  Employee: { classes: 'bg-amber-400 text-slate-950 ring-amber-400 dark:bg-amber-400/20 dark:text-amber-300 dark:ring-amber-400/40', icon: Icons.UserRound },
};

/** Admin = navy, HR = emerald, Employee = amber. */
@Component({
  selector: 'app-role-badge',
  imports: [LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="badge" [class]="style().classes">
      <lucide-icon [img]="style().icon" [size]="11" [strokeWidth]="2.6" />
      {{ role() }}
    </span>
  `,
})
export class RoleBadgeComponent {
  readonly role = input.required<Role>();
  protected readonly style = computed(() => ROLE_STYLES[this.role()] ?? ROLE_STYLES.Employee);
}

/** The violet "AI-generated" tag carried by every AI output. */
@Component({
  selector: 'app-ai-badge',
  imports: [LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="badge bg-gradient-to-r from-violet-600 to-purple-500 text-white ring-violet-500/40 shadow-sm shadow-violet-500/30"
      [title]="title()"
    >
      <lucide-icon [img]="icons.Sparkles" [size]="11" [strokeWidth]="2.6" />
      {{ text() }}
    </span>
  `,
})
export class AiBadgeComponent {
  readonly text = input('AI-generated');
  readonly title = input('Produced by the HCM Lite AI assistant from live HR data');
  protected readonly icons = Icons;
}

/** Initials avatar with a stable per-name gradient. */
@Component({
  selector: 'app-avatar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="inline-flex shrink-0 select-none items-center justify-center rounded-2xl bg-gradient-to-br font-bold text-white shadow-sm ring-2 ring-white dark:ring-slate-900"
      [class]="gradient() + ' ' + sizeClass()"
      [attr.aria-label]="name()"
      >{{ letters() }}</span
    >
  `,
})
export class AvatarComponent {
  readonly name = input<string | null | undefined>('');
  readonly size = input<'xs' | 'sm' | 'md' | 'lg' | 'xl'>('md');

  protected readonly letters = computed(() => initials(this.name()));
  protected readonly gradient = computed(() => avatarGradient(this.name()));
  protected readonly sizeClass = computed(
    () =>
      ({
        xs: 'h-7 w-7 rounded-lg text-[10px]',
        sm: 'h-9 w-9 rounded-xl text-xs',
        md: 'h-11 w-11 text-sm',
        lg: 'h-14 w-14 text-lg',
        xl: 'h-20 w-20 rounded-3xl text-2xl',
      })[this.size()],
  );
}
