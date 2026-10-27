import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { CheckInStore } from '../../core/services/check-in.store';
import { ClockService } from '../../core/services/clock.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { PolicyStore } from '../../core/services/policy.store';
import { formatDate, hhmmTo12h, minutesNowIn, minutesToHm, hhmmToMinutes } from '../../core/utils/dates';
import { formatMeters } from '../../core/utils/geo';
import { ClockPipe, HoursMinutesPipe } from '../../shared/pipes/format.pipes';
import { StatusBadgeComponent } from '../../shared/ui/badges';
import { Icons } from '../../shared/ui/icons';
import { ProgressRingComponent } from '../../shared/ui/progress';

/** Live check-in HUD: ticking clock, shift window, status badge, web + camera punches and a worked-hours ring. */
@Component({
  selector: 'app-check-in-hero',
  imports: [LucideAngularModule, StatusBadgeComponent, ProgressRingComponent, ClockPipe, HoursMinutesPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="card p-6 sm:p-8">
      <div class="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <span class="badge bg-white text-slate-600 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700"><lucide-icon [img]="icons.CalendarDays" [size]="12" /> {{ dateLabel() }}</span>
            <span class="badge bg-white text-slate-600 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700"><lucide-icon [img]="icons.Clock" [size]="12" /> {{ shiftLabel() }}</span>
            @if (store.today() && !store.today()!.isWorkingDay) {
              <span class="badge bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/25"><lucide-icon [img]="icons.PartyPopper" [size]="12" /> Non-working day</span>
            }
          </div>

          <p class="num mt-5 text-5xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-6xl">
            {{ time().hm }}<span class="text-2xl text-slate-400 sm:text-3xl">:{{ time().s }}</span>
            <span class="ml-2 text-lg font-medium text-slate-400">{{ time().ampm }}</span>
          </p>
          <div class="mt-3 flex flex-wrap items-center gap-2">
            @if (store.record(); as r) {
              <app-status-badge [status]="r.status" size="md" />
              @if (r.lateMinutes > 0) {
                <span class="text-sm text-blue-700 dark:text-blue-300">{{ r.lateMinutes }} min after office start</span>
              }
            } @else {
              <app-status-badge [status]="graceState().status" [label]="graceState().label" size="md" />
              <span class="text-sm text-slate-500 dark:text-slate-400">{{ graceState().hint }}</span>
            }
          </div>

          <div class="mt-7 flex flex-wrap gap-2">
            @if (store.loading() && !store.today()) {
              <div class="skeleton h-11 w-48"></div>
            } @else if (store.canCheckIn()) {
              <button type="button" class="btn btn-primary btn-lg" [disabled]="!!store.busy()" (click)="store.quickPunch('in')">
                <lucide-icon [img]="store.busy() === 'in' ? icons.LoaderCircle : icons.LogIn" [size]="18" [class.animate-spin]="store.busy() === 'in'" /> Check in now
              </button>
              <button type="button" class="btn btn-secondary btn-lg" (click)="store.openCamera('in')">
                <lucide-icon [img]="icons.ScanFace" [size]="18" /> Camera + GPS check-in
              </button>
            } @else if (store.canCheckOut()) {
              <button type="button" class="btn btn-navy btn-lg" [disabled]="!!store.busy()" (click)="checkOut()">
                <lucide-icon [img]="store.busy() === 'out' ? icons.LoaderCircle : icons.LogOut" [size]="18" [class.animate-spin]="store.busy() === 'out'" /> Check out
              </button>
              <button type="button" class="btn btn-secondary btn-lg" (click)="store.openCamera('out')">
                <lucide-icon [img]="icons.ScanFace" [size]="18" /> Camera check-out
              </button>
            } @else if (store.finishedForDay()) {
              <div class="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/40">
                <lucide-icon [img]="icons.CircleCheck" [size]="20" class="text-blue-600 dark:text-blue-400" />
                <div>
                  <p class="text-sm font-medium text-slate-900 dark:text-white">You're done for today</p>
                  <p class="text-xs text-slate-500 dark:text-slate-400">Worked {{ store.record()?.workedMinutes | hm }} · see you tomorrow</p>
                </div>
              </div>
            }
            <button type="button" class="btn btn-ghost btn-lg" (click)="store.openCorrection({ date: today() })">
              <lucide-icon [img]="icons.Wrench" [size]="16" /> Request correction
            </button>
          </div>
        </div>

        <div class="mx-auto flex flex-col items-center">
          <app-progress-ring [value]="progress()" [size]="200" [stroke]="12" [tone]="store.canCheckOut() ? 'emerald' : 'teal'" [marker]="halfDayMarker()">
            <div>
              <p class="text-xs text-slate-500 dark:text-slate-400">Worked</p>
              <p class="num mt-1 text-3xl font-semibold text-slate-900 dark:text-white">{{ workedLabel() }}</p>
              <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">of 8h day</p>
            </div>
          </app-progress-ring>
          <div class="mt-4 grid w-full grid-cols-2 gap-2 text-center text-xs">
            <div class="rounded-md border border-slate-200 px-3 py-2 dark:border-slate-800">
              <p class="text-slate-500 dark:text-slate-400">In</p>
              <p class="num mt-0.5 font-medium text-slate-900 dark:text-white">{{ store.record()?.checkInAt | clock }}</p>
            </div>
            <div class="rounded-md border border-slate-200 px-3 py-2 dark:border-slate-800">
              <p class="text-slate-500 dark:text-slate-400">Out</p>
              <p class="num mt-0.5 font-medium text-slate-900 dark:text-white">{{ store.record()?.checkOutAt | clock }}</p>
            </div>
          </div>
          @if (store.record()?.checkInVerification; as v) {
            <p class="mt-3 flex items-center gap-1.5 text-xs text-blue-700 dark:text-blue-400">
              <lucide-icon [img]="icons.ScanFace" [size]="13" /> Camera verified · {{ meters(v.distanceMeters) }} from office
            </p>
          }
          <p class="mt-2 text-xs text-slate-500 dark:text-slate-400">Tick marks the {{ halfDayHours() }}h half-day threshold</p>
        </div>
      </div>
    </section>
  `,
})
export class CheckInHeroComponent implements OnInit {
  protected readonly store = inject(CheckInStore);
  private readonly clock = inject(ClockService);
  private readonly policies = inject(PolicyStore);
  private readonly confirm = inject(ConfirmService);
  protected readonly icons = Icons;

  protected readonly today = computed(() => {
    this.clock.now();
    return this.policies.today();
  });
  protected readonly dateLabel = computed(() => formatDate(this.today(), 'long'));
  protected readonly shiftLabel = computed(() => `${hhmmTo12h(this.policies.officeStart())} – Grace ${hhmmTo12h(this.policies.graceEnd())}`);
  protected readonly halfDayHours = computed(() => this.policies.attendance()?.halfDayThresholdHours ?? 5);

  /** Live ticking clock in the company timezone. */
  protected readonly time = computed(() => {
    const parts = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true, timeZone: this.policies.timezone() }).formatToParts(this.clock.now());
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
    return { hm: `${get('hour')}:${get('minute')}`, s: get('second'), ampm: get('dayPeriod') };
  });

  /** Before check-in: are we still inside the grace window? */
  protected readonly graceState = computed(() => {
    const now = minutesNowIn(this.policies.timezone(), this.clock.now());
    const start = hhmmToMinutes(this.policies.officeStart());
    const grace = hhmmToMinutes(this.policies.graceEnd());
    if (now < start) return { status: 'not_checked_in', label: 'Not checked in', hint: `Office opens in ${minutesToHm(start - now)}` };
    if (now <= grace) return { status: 'present', label: 'On time window', hint: `Check in within ${minutesToHm(grace - now)} to be on time` };
    return { status: 'late', label: 'Grace period passed', hint: 'Checking in now will be marked late' };
  });

  protected readonly workedMinutes = computed(() => {
    const record = this.store.record();
    if (!record?.checkInAt) return 0;
    if (record.checkOutAt && record.workedMinutes !== null) return record.workedMinutes;
    return Math.max(0, Math.floor((this.clock.now().getTime() - new Date(record.checkInAt).getTime()) / 60_000));
  });
  protected readonly workedLabel = computed(() => {
    const m = this.workedMinutes();
    return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
  });
  protected readonly progress = computed(() => this.workedMinutes() / 480);
  protected readonly halfDayMarker = computed(() => this.halfDayHours() / 8);

  ngOnInit(): void {
    this.store.load();
  }

  protected meters(value: number): string {
    return formatMeters(value);
  }

  /** Warn before a check-out that would turn the day into a half day. */
  protected async checkOut(): Promise<void> {
    const worked = this.workedMinutes();
    const threshold = this.halfDayHours() * 60;
    if (worked < threshold) {
      const ok = await this.confirm.confirm({
        title: 'Check out early?',
        message: `You've worked ${minutesToHm(worked)}. Checking out before ${this.halfDayHours()} hours marks today as a half day.`,
        confirmText: 'Check out anyway',
        tone: 'warning',
      });
      if (!ok) return;
    }
    this.store.quickPunch('out');
  }
}
