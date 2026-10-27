import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { LucideAngularModule, LucideIconData } from 'lucide-angular';
import { Role } from '../../core/models/api.models';
import { initials } from '../../core/utils/format';
import { Icons } from './icons';

interface BadgeStyle {
  label: string;
  /** Dot colour; colour never carries meaning alone (the label is always shown). */
  dot: string;
  /** Replaces the dot where a shape says more (the payroll "Locked" badge). */
  icon?: LucideIconData;
}

/** Status colours: green = present/approved (the only green left in the UI), blue = late, amber = leave/pending, rose = absent/rejected. */
const STATUS_STYLES: Record<string, BadgeStyle> = {
  present: { label: 'Present', dot: 'bg-green-500' },
  late: { label: 'Late', dot: 'bg-blue-500' },
  half_day: { label: 'Half day', dot: 'bg-orange-500' },
  missing_checkout: { label: 'Missing check-out', dot: 'bg-slate-400' },
  absent: { label: 'Absent', dot: 'bg-rose-500' },
  on_leave: { label: 'On leave', dot: 'bg-amber-500' },
  not_checked_in: { label: 'Not checked in', dot: 'bg-slate-300 dark:bg-slate-600' },
  weekend: { label: 'Weekend', dot: 'bg-slate-300 dark:bg-slate-600' },
  holiday: { label: 'Holiday', dot: 'bg-indigo-500' },
  pending: { label: 'Pending', dot: 'bg-amber-500' },
  approved: { label: 'Approved', dot: 'bg-green-500' },
  rejected: { label: 'Rejected', dot: 'bg-rose-500' },
  cancelled: { label: 'Cancelled', dot: 'bg-slate-400' },
  draft: { label: 'Draft', dot: 'bg-amber-500' },
  finalized: { label: 'Locked', dot: '', icon: Icons.Lock },
  active: { label: 'Active', dot: 'bg-green-500' },
  probation: { label: 'Probation', dot: 'bg-amber-500' },
  exited: { label: 'Exited', dot: 'bg-slate-400' },
  inactive: { label: 'Inactive', dot: 'bg-slate-400' },
  high: { label: 'High risk', dot: 'bg-rose-500' },
  medium: { label: 'Medium risk', dot: 'bg-amber-500' },
  low: { label: 'Low risk', dot: 'bg-green-500' },
};

export function statusLabel(status: string | null | undefined): string {
  if (!status) return '—';
  return STATUS_STYLES[status]?.label ?? status.replace(/_/g, ' ');
}

const BADGE_SURFACE = 'bg-white text-slate-700 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700';

/** Status label with a small colour dot. */
@Component({
  selector: 'app-status-badge',
  imports: [LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="badge" [class]="classes()">
      @if (style().icon; as icon) {
        <lucide-icon [img]="icon" [size]="12" [strokeWidth]="2.4" />
      } @else {
        <span class="h-1.5 w-1.5 shrink-0 rounded-full" [class]="style().dot"></span>
      }
      {{ label() || style().label }}
    </span>
  `,
})
export class StatusBadgeComponent {
  readonly status = input.required<string>();
  readonly label = input<string>('');
  readonly size = input<'sm' | 'md'>('sm');

  protected readonly classes = computed(() => (this.size() === 'md' ? `${BADGE_SURFACE} px-2.5 py-1 text-[13px]` : BADGE_SURFACE));
  protected readonly style = computed<BadgeStyle>(() => STATUS_STYLES[this.status()] ?? { label: statusLabel(this.status()), dot: 'bg-slate-400' });
}

/** Admin = ink, HR = blue, Employee = amber (role dots). */
const ROLE_DOTS: Record<Role, string> = {
  Admin: 'bg-slate-900 dark:bg-white',
  HR: 'bg-blue-500',
  Employee: 'bg-amber-500',
};

@Component({
  selector: 'app-role-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="badge" [class]="surface">
      <span class="h-1.5 w-1.5 shrink-0 rounded-full" [class]="dot()"></span>
      {{ role() }}
    </span>
  `,
})
export class RoleBadgeComponent {
  readonly role = input.required<Role>();
  protected readonly surface = BADGE_SURFACE;
  protected readonly dot = computed(() => ROLE_DOTS[this.role()] ?? ROLE_DOTS.Employee);
}

/** The violet "AI-generated" tag carried by every AI output. */
@Component({
  selector: 'app-ai-badge',
  imports: [LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="badge bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-500/25" [title]="title()">
      <lucide-icon [img]="icons.Sparkles" [size]="11" [strokeWidth]="2.4" />
      {{ text() }}
    </span>
  `,
})
export class AiBadgeComponent {
  readonly text = input('AI-generated');
  readonly title = input('Produced by the HCM Lite AI assistant from live HR data');
  protected readonly icons = Icons;
}

/** Gradient pairs for initials avatars; a person always gets the same one. */
const AVATAR_GRADIENTS = [
  'from-blue-400 to-indigo-600',
  'from-violet-400 to-purple-600',
  'from-amber-300 to-orange-500',
  'from-sky-400 to-blue-600',
  'from-rose-400 to-pink-600',
  'from-indigo-300 to-cyan-600',
  'from-indigo-400 to-violet-600',
  'from-lime-400 to-blue-600',
];

/** Initials avatar on a name-seeded gradient. */
@Component({
  selector: 'app-avatar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="inline-flex shrink-0 select-none items-center justify-center rounded-full bg-gradient-to-br font-semibold text-white shadow-xs"
      [class]="sizeClass() + ' ' + gradient()"
      [attr.aria-label]="name()"
      >{{ letters() }}</span
    >
  `,
})
export class AvatarComponent {
  readonly name = input<string | null | undefined>('');
  readonly size = input<'xs' | 'sm' | 'md' | 'lg' | 'xl'>('md');

  protected readonly letters = computed(() => initials(this.name()));
  protected readonly gradient = computed(() => {
    const name = this.name() ?? '';
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
    return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
  });
  protected readonly sizeClass = computed(
    () =>
      ({
        xs: 'h-6 w-6 text-[10px]',
        sm: 'h-8 w-8 text-xs',
        md: 'h-10 w-10 text-sm',
        lg: 'h-12 w-12 text-base',
        xl: 'h-16 w-16 text-xl',
      })[this.size()],
  );
}
