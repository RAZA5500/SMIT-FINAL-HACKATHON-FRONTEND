import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { AttendanceRecord, AttendanceStatus } from '../../core/models/api.models';
import { PolicyStore } from '../../core/services/policy.store';
import { addMonths, eachDay, endOfMonth, formatDate, formatMonth, parseIsoDate } from '../../core/utils/dates';
import { formatMeters } from '../../core/utils/geo';
import { expand } from '../animations';
import { ClockPipe, HoursMinutesPipe, TitleCasePipe } from '../pipes/format.pipes';
import { StatusBadgeComponent, statusLabel } from '../ui/badges';
import { Icons } from '../ui/icons';

const CELL: Record<AttendanceStatus, { cell: string; dot: string }> = {
  present: { cell: 'bg-green-500/15 text-green-800 ring-green-500/30 dark:text-green-200', dot: 'bg-green-500' },
  late: { cell: 'bg-blue-500/15 text-blue-800 ring-blue-500/30 dark:text-blue-200', dot: 'bg-blue-500' },
  half_day: { cell: 'bg-orange-500/15 text-orange-800 ring-orange-500/30 dark:text-orange-200', dot: 'bg-orange-500' },
  missing_checkout: { cell: 'bg-slate-500/15 text-slate-700 ring-slate-500/30 dark:text-slate-200', dot: 'bg-slate-500' },
  absent: { cell: 'bg-rose-500/15 text-rose-800 ring-rose-500/30 dark:text-rose-200', dot: 'bg-rose-500' },
  on_leave: { cell: 'bg-amber-400/20 text-amber-900 ring-amber-500/35 dark:text-amber-200', dot: 'bg-amber-400' },
};

const LEGEND: AttendanceStatus[] = ['present', 'late', 'half_day', 'missing_checkout', 'absent', 'on_leave'];

interface DayCell {
  date: string;
  day: number;
  inMonth: boolean;
  record: AttendanceRecord | null;
  weekend: boolean;
  holiday: string | null;
  future: boolean;
  today: boolean;
  beforeJoin: boolean;
}

/** Interactive monthly attendance calendar with a day-detail drawer. */
@Component({
  selector: 'app-attendance-calendar',
  imports: [LucideAngularModule, StatusBadgeComponent, ClockPipe, HoursMinutesPipe, TitleCasePipe],
  animations: [expand],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-1">
        <button type="button" class="btn btn-ghost btn-icon" (click)="go(-1)" aria-label="Previous month"><lucide-icon [img]="icons.ChevronLeft" [size]="18" /></button>
        <h3 class="min-w-[9.5rem] text-center text-base font-semibold text-slate-900 dark:text-white">{{ monthLabel() }}</h3>
        <button type="button" class="btn btn-ghost btn-icon" (click)="go(1)" [disabled]="isCurrentMonth()" aria-label="Next month"><lucide-icon [img]="icons.ChevronRight" [size]="18" /></button>
      </div>
      <div class="flex flex-wrap gap-1.5">
        @for (s of summary(); track s.status) {
          <span class="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <span class="h-2 w-2 rounded-full" [class]="s.dot"></span>{{ s.count }} {{ s.label }}
          </span>
        }
      </div>
    </div>

    <div class="mt-4 grid grid-cols-7 gap-1.5 text-center text-xs font-medium text-slate-400">
      @for (d of weekdays; track d) {
        <span class="py-1">{{ d }}</span>
      }
    </div>
    <div class="mt-1 grid grid-cols-7 gap-1.5" [class.opacity-50]="loading()">
      @for (c of cells(); track c.date) {
        @if (!c.inMonth) {
          <span class="aspect-square"></span>
        } @else {
          <button
            type="button"
            class="group relative flex aspect-square flex-col items-center justify-center rounded-lg text-sm font-semibold ring-1 ring-inset transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:rounded-lg"
            [class]="cellClass(c) + (selected() === c.date ? ' ring-2 !ring-slate-900 dark:!ring-white' : '')"
            [attr.aria-label]="ariaFor(c)"
            (click)="select(c)"
          >
            <span>{{ c.day }}</span>
            @if (c.record) {
              <span class="mt-0.5 h-1.5 w-1.5 rounded-full sm:h-2 sm:w-2" [class]="dotFor(c.record.status)"></span>
            } @else if (c.holiday) {
              <lucide-icon [img]="icons.PartyPopper" [size]="11" class="mt-0.5 text-indigo-500" />
            }
            @if (c.today) {
              <span class="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-blue-500 ring-2 ring-white dark:ring-slate-900"></span>
            }
          </button>
        }
      }
    </div>

    <div class="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-slate-500 dark:text-slate-400">
      @for (s of legend; track s) {
        <span class="inline-flex items-center gap-1.5"><span class="h-2 w-2 rounded-full" [class]="dotFor(s)"></span>{{ labelFor(s) }}</span>
      }
      <span class="inline-flex items-center gap-1.5"><span class="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-600"></span>Weekend</span>
      <span class="inline-flex items-center gap-1.5"><lucide-icon [img]="icons.PartyPopper" [size]="11" class="text-indigo-500" />Holiday</span>
    </div>

    @if (selectedCell(); as c) {
      <div @expand class="mt-4">
        <div class="rounded-lg border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <p class="font-semibold text-slate-900 dark:text-white">{{ longDate(c.date) }}</p>
            @if (c.record) {
              <app-status-badge [status]="c.record.status" size="md" />
            } @else if (c.holiday) {
              <app-status-badge status="holiday" [label]="c.holiday" size="md" />
            } @else if (c.weekend) {
              <app-status-badge status="weekend" size="md" />
            }
          </div>
          @if (c.record; as r) {
            <dl class="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div><dt class="text-xs muted">Check-in</dt><dd class="font-semibold">{{ r.checkInAt | clock }}</dd></div>
              <div><dt class="text-xs muted">Check-out</dt><dd class="font-semibold">{{ r.checkOutAt | clock }}</dd></div>
              <div><dt class="text-xs muted">Worked</dt><dd class="font-semibold">{{ r.workedMinutes | hm }}</dd></div>
              <div><dt class="text-xs muted">Source</dt><dd class="font-semibold">{{ r.source | title }}@if (r.corrected) {<span class="text-xs font-normal text-violet-600"> · corrected</span>}</dd></div>
            </dl>
            @if (r.lateMinutes > 0) {
              <p class="mt-2 text-xs text-blue-700 dark:text-blue-300">Arrived {{ r.lateMinutes }} min after office start.</p>
            }
            @if (r.leaveTypeName) {
              <p class="mt-2 text-xs text-amber-700 dark:text-amber-300">{{ r.leaveTypeName }} leave</p>
            }
            @if (r.checkInVerification; as v) {
              <p class="mt-2 flex items-center gap-1.5 text-xs text-blue-700 dark:text-blue-300">
                <lucide-icon [img]="icons.ScanFace" [size]="13" /> Camera verified · {{ meters(v.distanceMeters) }} from office (±{{ v.gpsAccuracy }} m)
              </p>
            }
          } @else if (!c.weekend && !c.holiday) {
            <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">{{ c.future ? 'Upcoming working day.' : c.beforeJoin ? 'Before the joining date.' : 'No attendance recorded for this day.' }}</p>
          }
          @if (allowCorrection() && !c.future && !c.beforeJoin) {
            <button type="button" class="btn btn-secondary btn-sm mt-3" (click)="correctionRequested.emit(c.date)">
              <lucide-icon [img]="icons.Wrench" [size]="14" /> Request correction
            </button>
          }
        </div>
      </div>
    }
  `,
})
export class AttendanceCalendarComponent {
  private readonly policies = inject(PolicyStore);

  /** `YYYY-MM` */
  readonly month = input.required<string>();
  readonly records = input<AttendanceRecord[]>([]);
  readonly loading = input(false);
  readonly joinDate = input<string | null>(null);
  readonly allowCorrection = input(false);

  readonly monthChange = output<string>();
  readonly correctionRequested = output<string>();

  protected readonly icons = Icons;
  protected readonly legend = LEGEND;
  protected readonly weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  protected readonly selected = signal<string | null>(null);

  constructor() {
    effect(() => {
      this.month();
      this.selected.set(null);
    });
  }

  protected readonly today = computed(() => {
    this.policies.policies();
    return this.policies.today();
  });

  protected readonly monthLabel = computed(() => formatMonth(this.month()));
  protected readonly isCurrentMonth = computed(() => this.month() >= this.today().slice(0, 7));

  private readonly byDate = computed(() => new Map(this.records().map((r) => [r.date, r])));

  protected readonly cells = computed<DayCell[]>(() => {
    const first = `${this.month()}-01`;
    const days = eachDay(first, endOfMonth(first));
    const offset = (parseIsoDate(first).getDay() + 6) % 7;
    const today = this.today();
    const join = this.joinDate();
    const blanks: DayCell[] = Array.from({ length: offset }, (_, i) => ({
      date: `blank-${i}`,
      day: 0,
      inMonth: false,
      record: null,
      weekend: false,
      holiday: null,
      future: false,
      today: false,
      beforeJoin: false,
    }));
    return [
      ...blanks,
      ...days.map((date) => ({
        date,
        day: Number(date.slice(8)),
        inMonth: true,
        record: this.byDate().get(date) ?? null,
        weekend: this.policies.isWeekend(date),
        holiday: this.policies.holidayOn(date)?.name ?? null,
        future: date > today,
        today: date === today,
        beforeJoin: !!join && date < join,
      })),
    ];
  });

  protected readonly summary = computed(() => {
    const counts = new Map<AttendanceStatus, number>();
    for (const r of this.records()) {
      if (r.date.startsWith(this.month())) counts.set(r.status, (counts.get(r.status) ?? 0) + 1);
    }
    return LEGEND.filter((s) => counts.get(s)).map((s) => ({ status: s, count: counts.get(s)!, label: statusLabel(s).toLowerCase(), dot: CELL[s].dot }));
  });

  protected readonly selectedCell = computed(() => this.cells().find((c) => c.date === this.selected()) ?? null);

  protected go(delta: number): void {
    this.monthChange.emit(addMonths(this.month(), delta));
  }

  protected select(c: DayCell): void {
    this.selected.set(this.selected() === c.date ? null : c.date);
  }

  protected cellClass(c: DayCell): string {
    if (c.record) return CELL[c.record.status].cell;
    if (c.holiday) return 'bg-indigo-50 text-indigo-700 ring-indigo-300/60 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-500/30';
    if (c.weekend) return 'bg-slate-100/80 text-slate-400 ring-transparent dark:bg-slate-800/50 dark:text-slate-500';
    if (c.future || c.beforeJoin) return 'bg-transparent text-slate-300 ring-slate-100 dark:text-slate-600 dark:ring-slate-800';
    return 'bg-white text-slate-600 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700';
  }

  protected dotFor(status: AttendanceStatus): string {
    return CELL[status].dot;
  }

  protected labelFor(status: AttendanceStatus): string {
    return statusLabel(status);
  }

  protected ariaFor(c: DayCell): string {
    const state = c.record ? statusLabel(c.record.status) : c.holiday ? `Holiday: ${c.holiday}` : c.weekend ? 'Weekend' : c.future ? 'Upcoming' : 'No record';
    return `${formatDate(c.date, 'long')} — ${state}`;
  }

  protected longDate(iso: string): string {
    return formatDate(iso, 'long');
  }

  protected meters(value: number): string {
    return formatMeters(value);
  }
}
