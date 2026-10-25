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
    <section class="relative overflow-hidden rounded-3xl bg-[#0B1222] p-6 text-white shadow-2xl shadow-slate-900/20 sm:p-8">
      <div class="pointer-events-none absolute -left-20 -top-24 h-72 w-72 animate-blob rounded-full bg-emerald-500/25 blur-3xl"></div>
      <div class="pointer-events-none absolute -bottom-24 right-0 h-72 w-72 animate-blob rounded-full bg-amber-400/15 blur-3xl [animation-delay:-8s]"></div>
      <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.06)_1px,transparent_0)] [background-size:26px_26px]"></div>

      <div class="relative grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <span class="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200 ring-1 ring-white/15">
              <lucide-icon [img]="icons.CalendarDays" [size]="13" /> {{ dateLabel() }}
            </span>
            <span class="inline-flex items-center gap-2 rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-semibold text-emerald-200 ring-1 ring-emerald-400/30">
              <lucide-icon [img]="icons.Clock" [size]="13" /> {{ shiftLabel() }}
            </span>
            @if (store.today() && !store.today()!.isWorkingDay) {
              <span class="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 px-3 py-1 text-xs font-semibold text-amber-200 ring-1 ring-amber-400/30">
                <lucide-icon [img]="icons.PartyPopper" [size]="13" /> Non-working day
              </span>
            }
          </div>

          <p class="mt-5 font-mono text-5xl font-bold tracking-tight sm:text-6xl">
            {{ time().hm }}<span class="text-2xl text-slate-400 sm:text-3xl">:{{ time().s }}</span>
            <span class="ml-2 text-lg font-semibold text-slate-400">{{ time().ampm }}</span>
          </p>
          <div class="mt-3 flex flex-wrap items-center gap-2">
            @if (store.record(); as r) {
              <app-status-badge [status]="r.status" size="md" />
              @if (r.lateMinutes > 0) {
                <span class="text-sm text-blue-300">{{ r.lateMinutes }} min after office start</span>
              }
            } @else {
              <app-status-badge [status]="graceState().status" [label]="graceState().label" size="md" />
              <span class="text-sm text-slate-400">{{ graceState().hint }}</span>
            }
          </div>

          <div class="mt-7 flex flex-wrap gap-3">
            @if (store.loading() && !store.today()) {
              <div class="h-12 w-48 animate-pulse rounded-2xl bg-white/10"></div>
            } @else if (store.canCheckIn()) {
              <button type="button" class="btn btn-primary btn-lg" [disabled]="!!store.busy()" (click)="store.quickPunch('in')">
                <lucide-icon [img]="store.busy() === 'in' ? icons.LoaderCircle : icons.LogIn" [size]="19" [class.animate-spin]="store.busy() === 'in'" /> Check in now
              </button>
              <button type="button" class="btn btn-lg border border-white/20 bg-white/10 text-white backdrop-blur hover:bg-white/20" (click)="store.openCamera('in')">
                <lucide-icon [img]="icons.ScanFace" [size]="19" /> Camera + GPS check-in
              </button>
            } @else if (store.canCheckOut()) {
              <button type="button" class="btn btn-amber btn-lg" [disabled]="!!store.busy()" (click)="checkOut()">
                <lucide-icon [img]="store.busy() === 'out' ? icons.LoaderCircle : icons.LogOut" [size]="19" [class.animate-spin]="store.busy() === 'out'" /> Check out
              </button>
              <button type="button" class="btn btn-lg border border-white/20 bg-white/10 text-white backdrop-blur hover:bg-white/20" (click)="store.openCamera('out')">
                <lucide-icon [img]="icons.ScanFace" [size]="19" /> Camera check-out
              </button>
            } @else if (store.finishedForDay()) {
              <div class="flex items-center gap-3 rounded-2xl bg-emerald-400/15 px-5 py-3 ring-1 ring-emerald-400/30">
                <lucide-icon [img]="icons.CircleCheck" [size]="22" class="text-emerald-300" />
                <div>
                  <p class="font-semibold">You're done for today</p>
                  <p class="text-xs text-slate-300">Worked {{ store.record()?.workedMinutes | hm }} · see you tomorrow</p>
                </div>
              </div>
            }
            <button type="button" class="btn btn-lg text-slate-300 hover:bg-white/10 hover:text-white" (click)="store.openCorrection({ date: today() })">
              <lucide-icon [img]="icons.Wrench" [size]="17" /> Request correction
            </button>
          </div>
        </div>

        <div class="mx-auto flex flex-col items-center">
          <app-progress-ring [value]="progress()" [size]="210" [stroke]="15" [tone]="store.canCheckOut() ? 'emerald' : 'teal'" [marker]="halfDayMarker()">
            <div>
              <p class="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Worked</p>
              <p class="mt-1 font-mono text-3xl font-bold">{{ workedLabel() }}</p>
              <p class="mt-1 text-xs text-slate-400">of 8h day</p>
            </div>
          </app-progress-ring>
          <div class="mt-4 grid w-full grid-cols-2 gap-2 text-center text-xs">
            <div class="rounded-2xl bg-white/5 px-3 py-2 ring-1 ring-white/10">
              <p class="text-slate-400">In</p>
              <p class="mt-0.5 font-semibold">{{ store.record()?.checkInAt | clock }}</p>
            </div>
            <div class="rounded-2xl bg-white/5 px-3 py-2 ring-1 ring-white/10">
              <p class="text-slate-400">Out</p>
              <p class="mt-0.5 font-semibold">{{ store.record()?.checkOutAt | clock }}</p>
            </div>
          </div>
          @if (store.record()?.checkInVerification; as v) {
            <p class="mt-3 flex items-center gap-1.5 text-xs text-emerald-300">
              <lucide-icon [img]="icons.ScanFace" [size]="13" /> Camera verified · {{ meters(v.distanceMeters) }} from office
            </p>
          }
          <p class="mt-2 text-[11px] text-slate-500">Tick marks the {{ halfDayHours() }}h half-day threshold</p>
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
