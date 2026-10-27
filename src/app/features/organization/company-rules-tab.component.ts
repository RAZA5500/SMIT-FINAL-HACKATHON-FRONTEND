import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { CompanySettings, UpdateSettingsPayload, WEEK_DAYS, WeekDay } from '../../core/models/api.models';
import { GeoError, GeolocationService } from '../../core/services/geolocation.service';
import { OrgService } from '../../core/services/org.service';
import { PolicyStore } from '../../core/services/policy.store';
import { ToastService } from '../../core/services/toast.service';
import { COMMON_TIMEZONES, addMinutesToHhmm, hhmmTo12h } from '../../core/utils/dates';
import { formatMeters } from '../../core/utils/geo';
import { apiErrorMessage } from '../../core/utils/http';
import { StampPipe } from '../../shared/pipes/format.pipes';
import { FieldErrorComponent } from '../../shared/ui/field-error.component';
import { GeoRadarComponent } from '../../shared/ui/geo-radar.component';
import { Icons } from '../../shared/ui/icons';

/** Company rules (hours, grace, half-day, weekend, late penalty) and the office geofence. */
@Component({
  selector: 'app-company-rules-tab',
  imports: [ReactiveFormsModule, LucideAngularModule, FieldErrorComponent, GeoRadarComponent, StampPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading()) {
      <div class="grid gap-6 lg:grid-cols-2">
        <div class="skeleton h-96"></div>
        <div class="skeleton h-96"></div>
      </div>
    } @else if (settings()) {
      @let s = settings()!;
      <form [formGroup]="form" (ngSubmit)="save()" class="grid gap-6 lg:grid-cols-2">
        <!-- Company & work rules -->
        <section class="card card-pad space-y-5">
          <header class="flex items-center gap-3">
            <span class="grid h-9 w-9 place-items-center rounded-md bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700"><lucide-icon [img]="icons.Clock" [size]="19" /></span>
            <div>
              <h2 class="section-title">Company & work rules</h2>
              <p class="text-xs text-slate-500 dark:text-slate-400">Changes apply to new attendance records and payroll runs only.</p>
            </div>
          </header>

          @if (canEdit()) {
            <div>
              <label class="label" for="cn">Company name</label>
              <input id="cn" class="input" formControlName="companyName" />
              <app-field-error [control]="form.controls.companyName" label="Company name" />
            </div>
            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label class="label" for="tz">Timezone</label>
                <select id="tz" class="input" formControlName="timezone">
                  @for (tz of timezones(); track tz) {
                    <option [value]="tz">{{ tz }}</option>
                  }
                </select>
              </div>
              <div>
                <label class="label" for="cur">Currency</label>
                <input id="cur" class="input uppercase" maxlength="3" formControlName="currency" />
                <app-field-error [control]="form.controls.currency" label="Currency" />
              </div>
            </div>
            <div class="grid gap-4 sm:grid-cols-3">
              <div>
                <label class="label" for="st">Office start</label>
                <input id="st" type="time" class="input" formControlName="officeStartTime" />
              </div>
              <div>
                <label class="label" for="gr">Grace (min)</label>
                <input id="gr" type="number" min="0" max="240" class="input" formControlName="graceMinutes" />
                <app-field-error [control]="form.controls.graceMinutes" label="Grace" />
              </div>
              <div>
                <label class="label" for="hd">Half-day &lt; (h)</label>
                <input id="hd" type="number" min="0.5" max="24" step="0.5" class="input" formControlName="halfDayThresholdHours" />
                <app-field-error [control]="form.controls.halfDayThresholdHours" label="Half-day threshold" />
              </div>
            </div>
            <p class="-mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">{{ shiftLabel() }}</p>
            <div>
              <p class="label">Weekend days</p>
              <div class="flex flex-wrap gap-2">
                @for (day of weekDays; track day) {
                  <button type="button" class="pill" [class.pill-active]="weekendSet().has(day)" (click)="toggleWeekend(day)">{{ day.slice(0, 3) }}</button>
                }
              </div>
            </div>
            <label class="flex items-center justify-between gap-4 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
              <span>
                <span class="block text-sm font-semibold text-slate-800 dark:text-slate-100">Late penalty rule <span class="badge ml-1 bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">Bonus</span></span>
                <span class="block text-xs text-slate-500 dark:text-slate-400">3 lates in a month = 0.5 day deduction in payroll.</span>
              </span>
              <input type="checkbox" class="switch" formControlName="latePenaltyRuleEnabled" />
            </label>
          } @else {
            <dl class="grid grid-cols-2 gap-3">
              @for (item of readOnlyItems(); track item.label) {
                <div class="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-900/50">
                  <dt class="text-xs font-medium text-slate-400">{{ item.label }}</dt>
                  <dd class="mt-1 font-semibold text-slate-900 dark:text-white">{{ item.value }}</dd>
                </div>
              }
            </dl>
            <div class="flex flex-wrap gap-1.5">
              @for (day of s.weekendDays; track day) {
                <span class="badge bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700">{{ day }}</span>
              }
              <span class="badge bg-white text-slate-700 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700">
                <span class="h-1.5 w-1.5 rounded-full" [class]="s.latePenaltyRuleEnabled ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'"></span>
                Late penalty {{ s.latePenaltyRuleEnabled ? 'on' : 'off' }}
              </span>
            </div>
          }
        </section>

        <!-- Geofence -->
        <section class="card card-pad space-y-5">
          <header class="flex items-center gap-3">
            <span class="grid h-9 w-9 place-items-center rounded-md bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700"><lucide-icon [img]="icons.MapPin" [size]="19" /></span>
            <div>
              <h2 class="section-title">Office geofence</h2>
              <p class="text-xs text-slate-500 dark:text-slate-400">Camera check-ins are accepted only inside this radius.</p>
            </div>
          </header>
          <div class="grid items-center gap-5 sm:grid-cols-[1fr_190px]">
            <div class="space-y-4">
              @if (canEdit()) {
                <button type="button" class="btn btn-secondary w-full" (click)="useMyLocation()" [disabled]="locating()">
                  <lucide-icon [img]="locating() ? icons.LoaderCircle : icons.LocateFixed" [size]="16" [class.animate-spin]="locating()" />
                  Use my current GPS location
                </button>
                @if (geoError()) {
                  <p class="rounded-lg bg-rose-50 p-2.5 text-xs text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{{ geoError() }}</p>
                }
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="label" for="lat">Latitude</label>
                    <input id="lat" type="number" step="any" class="input font-mono" formControlName="lat" />
                  </div>
                  <div>
                    <label class="label" for="lng">Longitude</label>
                    <input id="lng" type="number" step="any" class="input font-mono" formControlName="lng" />
                  </div>
                </div>
              } @else {
                <div class="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 font-mono text-sm dark:border-slate-800 dark:bg-slate-900/50">
                  @if (s.officeLocation.lat !== null) {
                    {{ s.officeLocation.lat }}, {{ s.officeLocation.lng }}
                  } @else {
                    <span class="font-sans text-slate-500">Office location not configured yet.</span>
                  }
                </div>
              }
              <div>
                <div class="flex items-center justify-between">
                  <span class="text-sm font-semibold text-slate-800 dark:text-slate-100">Radius</span>
                  <span class="num rounded-md bg-slate-100 px-2 py-0.5 text-sm font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">{{ radiusLabel() }}</span>
                </div>
                @if (canEdit()) {
                  <input type="range" min="25" max="1000" step="5" class="range mt-3" formControlName="radiusMeters" aria-label="Geofence radius" />
                }
              </div>
              @if (mapsUrl(); as url) {
                <a [href]="url" target="_blank" rel="noopener" class="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:underline dark:text-blue-400">
                  <lucide-icon [img]="icons.MapPin" [size]="13" /> View on Google Maps <lucide-icon [img]="icons.ArrowUpRight" [size]="12" />
                </a>
              }
            </div>
            <div class="mx-auto w-full max-w-[190px]">
              <app-geo-radar [radiusMeters]="radius()" [state]="hasLocation() ? 'inside' : 'scanning'" [distanceMeters]="hasLocation() ? 0 : null" />
            </div>
          </div>
          <p class="text-xs text-slate-400">Tracking since {{ s.trackingStartDate }} · last updated {{ s.updatedAt | stamp }}</p>
        </section>

        @if (canEdit()) {
          <div class="sticky bottom-4 z-10 lg:col-span-2">
            <div class="glass flex flex-col items-center justify-between gap-3 rounded-lg px-4 py-3 shadow-lift sm:flex-row">
              <p class="text-sm text-slate-600 dark:text-slate-300">
                @if (form.dirty) {
                  <span class="inline-flex items-center gap-1.5 font-semibold text-amber-700 dark:text-amber-300"><lucide-icon [img]="icons.CircleAlert" [size]="15" /> Unsaved changes</span>
                } @else {
                  All changes saved.
                }
              </p>
              <div class="flex gap-2">
                <button type="button" class="btn btn-ghost" [disabled]="!form.dirty || saving()" (click)="reset()">Discard</button>
                <button type="submit" class="btn btn-primary" [disabled]="!form.dirty || saving()">
                  <lucide-icon [img]="saving() ? icons.LoaderCircle : icons.Check" [size]="16" [class.animate-spin]="saving()" /> Save rules
                </button>
              </div>
            </div>
          </div>
        }
      </form>
    }
  `,
})
export class CompanyRulesTabComponent implements OnInit {
  private readonly org = inject(OrgService);
  private readonly policies = inject(PolicyStore);
  private readonly geo = inject(GeolocationService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  protected readonly icons = Icons;
  protected readonly weekDays = WEEK_DAYS;

  readonly canEdit = input(false);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly locating = signal(false);
  protected readonly geoError = signal('');
  protected readonly settings = signal<CompanySettings | null>(null);

  protected readonly form = this.fb.group({
    companyName: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(150)]),
    timezone: this.fb.nonNullable.control('Asia/Karachi', Validators.required),
    currency: this.fb.nonNullable.control('PKR', [Validators.required, Validators.pattern(/^[A-Za-z]{3}$/)]),
    officeStartTime: this.fb.nonNullable.control('09:00', Validators.required),
    graceMinutes: this.fb.nonNullable.control(15, [Validators.required, Validators.min(0), Validators.max(240)]),
    halfDayThresholdHours: this.fb.nonNullable.control(5, [Validators.required, Validators.min(0.5), Validators.max(24)]),
    weekendDays: this.fb.nonNullable.control<WeekDay[]>([]),
    latePenaltyRuleEnabled: this.fb.nonNullable.control(false),
    lat: this.fb.control<number | null>(null, [Validators.min(-90), Validators.max(90)]),
    lng: this.fb.control<number | null>(null, [Validators.min(-180), Validators.max(180)]),
    radiusMeters: this.fb.nonNullable.control(150, [Validators.min(10), Validators.max(10_000)]),
  });

  private readonly value = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

  protected readonly timezones = computed(() => {
    const current = this.settings()?.timezone;
    return [...new Set([...(current ? [current] : []), ...COMMON_TIMEZONES])];
  });
  protected readonly weekendSet = computed(() => new Set(this.value().weekendDays ?? []));
  protected readonly radius = computed(() => Number(this.value().radiusMeters) || 150);
  protected readonly radiusLabel = computed(() => formatMeters(this.radius()));
  protected readonly hasLocation = computed(() => {
    const v = this.value();
    return v.lat !== null && v.lat !== undefined && v.lng !== null && v.lng !== undefined;
  });
  protected readonly mapsUrl = computed(() => (this.hasLocation() ? `https://www.google.com/maps?q=${this.value().lat},${this.value().lng}` : null));
  protected readonly shiftLabel = computed(() => {
    const v = this.value();
    const start = v.officeStartTime || '09:00';
    return `Present until ${hhmmTo12h(addMinutesToHhmm(start, Number(v.graceMinutes) || 0))}, late afterwards; under ${v.halfDayThresholdHours}h worked = half day.`;
  });
  protected readonly readOnlyItems = computed(() => {
    const s = this.settings();
    if (!s) return [];
    return [
      { label: 'Company', value: s.companyName },
      { label: 'Timezone', value: s.timezone },
      { label: 'Office start', value: hhmmTo12h(s.officeStartTime) },
      { label: 'Grace period', value: `${s.graceMinutes} min` },
      { label: 'Half day below', value: `${s.halfDayThresholdHours} h` },
      { label: 'Currency', value: s.currency },
    ];
  });

  ngOnInit(): void {
    this.org.getSettings().subscribe({
      next: (settings) => {
        this.settings.set(settings);
        this.patch(settings);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error('Could not load settings', apiErrorMessage(err));
      },
    });
  }

  protected toggleWeekend(day: WeekDay): void {
    const current = new Set(this.form.controls.weekendDays.value);
    if (current.has(day)) current.delete(day);
    else if (current.size < 6) current.add(day);
    this.form.controls.weekendDays.setValue(WEEK_DAYS.filter((d) => current.has(d)));
    this.form.markAsDirty();
  }

  protected async useMyLocation(): Promise<void> {
    this.locating.set(true);
    this.geoError.set('');
    try {
      const fix = await this.geo.current();
      this.form.patchValue({ lat: Number(fix.lat.toFixed(6)), lng: Number(fix.lng.toFixed(6)) });
      this.form.markAsDirty();
      this.toast.success('Location captured', `Accuracy ±${fix.accuracy} m`);
    } catch (error) {
      this.geoError.set(error instanceof GeoError ? error.message : 'Could not read your location.');
    } finally {
      this.locating.set(false);
    }
  }

  protected reset(): void {
    const s = this.settings();
    if (s) this.patch(s);
  }

  protected save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    const hasLat = v.lat !== null && v.lat !== undefined;
    const hasLng = v.lng !== null && v.lng !== undefined;
    if (hasLat !== hasLng) {
      this.toast.warning('Incomplete location', 'Enter both latitude and longitude.');
      return;
    }
    const payload: UpdateSettingsPayload = {
      companyName: v.companyName.trim(),
      timezone: v.timezone,
      currency: v.currency.toUpperCase(),
      officeStartTime: v.officeStartTime,
      graceMinutes: Number(v.graceMinutes),
      halfDayThresholdHours: Number(v.halfDayThresholdHours),
      weekendDays: v.weekendDays,
      latePenaltyRuleEnabled: v.latePenaltyRuleEnabled,
      officeLocation: hasLat ? { lat: Number(v.lat), lng: Number(v.lng), radiusMeters: Number(v.radiusMeters) } : { radiusMeters: Number(v.radiusMeters) },
    };
    this.saving.set(true);
    this.org.updateSettings(payload).subscribe({
      next: (settings) => {
        this.saving.set(false);
        this.settings.set(settings);
        this.patch(settings);
        this.policies.refresh();
        this.toast.success('Company rules saved', 'New rules apply to records created from now on.');
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error('Could not save', apiErrorMessage(err));
      },
    });
  }

  private patch(s: CompanySettings): void {
    this.form.reset({
      companyName: s.companyName,
      timezone: s.timezone,
      currency: s.currency,
      officeStartTime: s.officeStartTime,
      graceMinutes: s.graceMinutes,
      halfDayThresholdHours: s.halfDayThresholdHours,
      weekendDays: s.weekendDays,
      latePenaltyRuleEnabled: s.latePenaltyRuleEnabled,
      lat: s.officeLocation?.lat ?? null,
      lng: s.officeLocation?.lng ?? null,
      radiusMeters: s.officeLocation?.radiusMeters ?? 150,
    });
  }
}
