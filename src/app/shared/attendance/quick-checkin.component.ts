import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { CheckInStore } from '../../core/services/check-in.store';
import { ClockService } from '../../core/services/clock.service';
import { PolicyStore } from '../../core/services/policy.store';
import { formatTime, hhmmTo12h } from '../../core/utils/dates';
import { ClockPipe, HoursMinutesPipe } from '../pipes/format.pipes';
import { StatusBadgeComponent } from '../ui/badges';
import { Icons } from '../ui/icons';
import { ProgressRingComponent } from '../ui/progress';

/** Compact check-in widget for dashboards (shares state with the attendance HUD). */
@Component({
  selector: 'app-quick-checkin',
  imports: [LucideAngularModule, RouterLink, StatusBadgeComponent, ProgressRingComponent, ClockPipe, HoursMinutesPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="card h-full p-5">
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="eyebrow">Today · {{ shift() }}</p>
          <p class="num mt-1 text-[1.625rem] font-semibold tracking-tight text-slate-900 dark:text-white">{{ liveTime() }}</p>
        </div>
        @if (store.record(); as r) {
          <app-status-badge [status]="r.status" size="md" />
        } @else if (store.today() && !store.today()!.isWorkingDay) {
          <app-status-badge status="weekend" label="Day off" size="md" />
        } @else {
          <app-status-badge status="not_checked_in" size="md" />
        }
      </div>

      <div class="mt-5 flex items-center gap-5">
        <app-progress-ring [value]="progress()" [size]="88" [stroke]="7" [tone]="store.canCheckOut() ? 'emerald' : 'teal'" [marker]="halfDayMarker()">
          <div>
            <p class="num text-sm font-semibold text-slate-900 dark:text-white">{{ workedMinutes() | hm }}</p>
            <p class="text-[11px] text-slate-500 dark:text-slate-400">worked</p>
          </div>
        </app-progress-ring>
        <div class="min-w-0 flex-1 space-y-1.5 text-sm">
          <p class="flex justify-between gap-2"><span class="muted">Check-in</span><span class="num font-medium">{{ store.record()?.checkInAt | clock }}</span></p>
          <p class="flex justify-between gap-2"><span class="muted">Check-out</span><span class="num font-medium">{{ store.record()?.checkOutAt | clock }}</span></p>
        </div>
      </div>

      <div class="mt-5 flex flex-wrap gap-2">
        @if (store.loading() && !store.today()) {
          <div class="skeleton h-11 w-full"></div>
        } @else if (store.canCheckIn()) {
          <button type="button" class="btn btn-primary flex-1" [disabled]="!!store.busy()" (click)="store.quickPunch('in')">
            <lucide-icon [img]="store.busy() === 'in' ? icons.LoaderCircle : icons.LogIn" [size]="16" [class.animate-spin]="store.busy() === 'in'" /> Check in
          </button>
          <button type="button" class="btn btn-secondary" (click)="store.openCamera('in')" title="Camera + GPS check-in">
            <lucide-icon [img]="icons.ScanFace" [size]="16" /> Camera
          </button>
        } @else if (store.canCheckOut()) {
          <button type="button" class="btn btn-navy flex-1" [disabled]="!!store.busy()" (click)="store.quickPunch('out')">
            <lucide-icon [img]="store.busy() === 'out' ? icons.LoaderCircle : icons.LogOut" [size]="16" [class.animate-spin]="store.busy() === 'out'" /> Check out
          </button>
          <button type="button" class="btn btn-secondary" (click)="store.openCamera('out')" title="Camera + GPS check-out">
            <lucide-icon [img]="icons.ScanFace" [size]="16" />
          </button>
        } @else if (store.finishedForDay()) {
          <p class="flex w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-slate-50 py-2 text-sm font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-200">
            <lucide-icon [img]="icons.CircleCheck" [size]="16" class="text-blue-600 dark:text-blue-400" /> Done for today
          </p>
        }
        <a routerLink="/attendance" class="btn btn-ghost btn-sm w-full">Open attendance <lucide-icon [img]="icons.ArrowRight" [size]="14" /></a>
      </div>
    </section>
  `,
})
export class QuickCheckinComponent implements OnInit {
  protected readonly store = inject(CheckInStore);
  private readonly clock = inject(ClockService);
  private readonly policies = inject(PolicyStore);
  protected readonly icons = Icons;

  protected readonly liveTime = computed(() => formatTime(this.clock.now(), this.policies.timezone()));
  protected readonly shift = computed(() => `${hhmmTo12h(this.policies.officeStart())} · grace ${hhmmTo12h(this.policies.graceEnd())}`);

  protected readonly workedMinutes = computed(() => {
    const record = this.store.record();
    if (!record?.checkInAt) return 0;
    if (record.workedMinutes !== null && record.checkOutAt) return record.workedMinutes;
    return Math.max(0, Math.floor((this.clock.now().getTime() - new Date(record.checkInAt).getTime()) / 60_000));
  });
  /** Progress towards an 8-hour day (40 h week). */
  protected readonly progress = computed(() => this.workedMinutes() / (8 * 60));
  protected readonly halfDayMarker = computed(() => (this.policies.attendance()?.halfDayThresholdHours ?? 5) / 8);

  ngOnInit(): void {
    this.store.load();
  }
}
