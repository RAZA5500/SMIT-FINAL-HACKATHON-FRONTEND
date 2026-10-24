import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule, LucideIconData } from 'lucide-angular';
import { InitSetupPayload, WEEK_DAYS, WeekDay } from '../../core/models/api.models';
import { GeoError, GeolocationService } from '../../core/services/geolocation.service';
import { SetupService } from '../../core/services/setup.service';
import { ToastService } from '../../core/services/toast.service';
import { celebrate } from '../../core/utils/celebrate';
import { COMMON_TIMEZONES, addMinutesToHhmm, hhmmTo12h } from '../../core/utils/dates';
import { formatMeters } from '../../core/utils/geo';
import { apiErrorMessage, apiStatus } from '../../core/utils/http';
import { matchFields, passwordPolicy } from '../../core/utils/validators';
import { fadeInUp } from '../../shared/animations';
import { FieldErrorComponent } from '../../shared/ui/field-error.component';
import { GeoRadarComponent } from '../../shared/ui/geo-radar.component';
import { Icons } from '../../shared/ui/icons';
import { PasswordStrengthComponent } from '../../shared/ui/password-strength.component';
import { AuthLayoutComponent } from '../auth/auth-layout.component';

interface Step {
  title: string;
  hint: string;
  icon: LucideIconData;
}

/** Multi-step first-run onboarding: company & hours → office geofence → master Admin. */
@Component({
  selector: 'app-setup-wizard',
  imports: [ReactiveFormsModule, LucideAngularModule, AuthLayoutComponent, FieldErrorComponent, PasswordStrengthComponent, GeoRadarComponent],
  animations: [fadeInUp],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './setup-wizard.component.html',
})
export class SetupWizardComponent {
  private readonly fb = inject(FormBuilder);
  private readonly setup = inject(SetupService);
  private readonly geo = inject(GeolocationService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  protected readonly icons = Icons;

  protected readonly steps: Step[] = [
    { title: 'Company & hours', hint: 'Profile and work rules', icon: Icons.Building2 },
    { title: 'Office geofence', hint: 'GPS location & radius', icon: Icons.MapPin },
    { title: 'Master admin', hint: 'Your Admin account', icon: Icons.ShieldCheck },
  ];
  protected readonly weekDays = WEEK_DAYS;
  protected readonly step = signal(0);
  protected readonly attempted = signal(false);
  protected readonly saving = signal(false);
  protected readonly locating = signal(false);
  protected readonly gpsAccuracy = signal<number | null>(null);
  protected readonly geoError = signal('');
  protected readonly serverError = signal('');
  protected readonly showPassword = signal(false);

  private readonly browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Karachi';
  protected readonly timezones = [...new Set([this.browserZone, ...COMMON_TIMEZONES])];

  protected readonly company = this.fb.nonNullable.group({
    companyName: ['', [Validators.required, Validators.maxLength(150)]],
    timezone: [this.browserZone, Validators.required],
    currency: ['PKR', [Validators.required, Validators.pattern(/^[A-Za-z]{3}$/)]],
    officeStartTime: ['09:00', Validators.required],
    graceMinutes: [15, [Validators.required, Validators.min(0), Validators.max(240)]],
    halfDayThresholdHours: [5, [Validators.required, Validators.min(0.5), Validators.max(24)]],
    weekendDays: [['Saturday', 'Sunday'] as WeekDay[]],
    latePenaltyRuleEnabled: [false],
  });

  protected readonly geofence = this.fb.group({
    lat: this.fb.control<number | null>(null, [Validators.min(-90), Validators.max(90)]),
    lng: this.fb.control<number | null>(null, [Validators.min(-180), Validators.max(180)]),
    radiusMeters: this.fb.nonNullable.control(150, [Validators.required, Validators.min(10), Validators.max(10_000)]),
  });

  protected readonly admin = this.fb.nonNullable.group(
    {
      fullName: ['', [Validators.required, Validators.maxLength(120)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, passwordPolicy()]],
      confirm: ['', Validators.required],
    },
    { validators: matchFields('password', 'confirm') },
  );

  private readonly companyValue = toSignal(this.company.valueChanges, { initialValue: this.company.getRawValue() });
  private readonly geoValue = toSignal(this.geofence.valueChanges, { initialValue: this.geofence.getRawValue() });
  protected readonly passwordValue = toSignal(this.admin.controls.password.valueChanges, { initialValue: '' });

  protected readonly shiftLabel = computed(() => {
    const v = this.companyValue();
    const start = v.officeStartTime || '09:00';
    return `${hhmmTo12h(start)} start · late after ${hhmmTo12h(addMinutesToHhmm(start, Number(v.graceMinutes) || 0))}`;
  });
  protected readonly weekendSet = computed(() => new Set(this.companyValue().weekendDays ?? []));
  protected readonly radius = computed(() => Number(this.geoValue().radiusMeters) || 150);
  protected readonly hasLocation = computed(() => {
    const v = this.geoValue();
    return v.lat !== null && v.lat !== undefined && v.lng !== null && v.lng !== undefined && `${v.lat}` !== '' && `${v.lng}` !== '';
  });
  protected readonly mapsUrl = computed(() => {
    const v = this.geoValue();
    return this.hasLocation() ? `https://www.google.com/maps?q=${v.lat},${v.lng}` : null;
  });
  protected readonly radiusLabel = computed(() => formatMeters(this.radius()));

  protected toggleWeekend(day: WeekDay): void {
    const current = new Set(this.company.controls.weekendDays.value);
    if (current.has(day)) current.delete(day);
    else if (current.size < 6) current.add(day);
    this.company.controls.weekendDays.setValue(WEEK_DAYS.filter((d) => current.has(d)));
  }

  protected async useMyLocation(): Promise<void> {
    this.locating.set(true);
    this.geoError.set('');
    try {
      const fix = await this.geo.current();
      this.geofence.patchValue({ lat: Number(fix.lat.toFixed(6)), lng: Number(fix.lng.toFixed(6)) });
      this.gpsAccuracy.set(fix.accuracy);
      this.toast.success('Location captured', `Accuracy ±${fix.accuracy} m — you can fine-tune the coordinates.`);
    } catch (error) {
      this.geoError.set(error instanceof GeoError ? error.message : 'Could not read your location.');
    } finally {
      this.locating.set(false);
    }
  }

  protected next(): void {
    this.attempted.set(true);
    const group = this.step() === 0 ? this.company : this.geofence;
    group.markAllAsTouched();
    if (group.invalid) return;
    if (this.step() === 1 && !this.hasLocation() && (this.geoValue().lat !== null || this.geoValue().lng !== null)) {
      this.geoError.set('Enter both latitude and longitude, or leave both empty to set the office location later.');
      return;
    }
    this.attempted.set(false);
    this.step.update((s) => Math.min(2, s + 1));
  }

  protected back(): void {
    this.attempted.set(false);
    this.step.update((s) => Math.max(0, s - 1));
  }

  protected goTo(index: number): void {
    if (index < this.step()) this.step.set(index);
  }

  protected launch(): void {
    this.attempted.set(true);
    this.admin.markAllAsTouched();
    if (this.company.invalid) return this.step.set(0);
    if (this.admin.invalid) return;

    const c = this.company.getRawValue();
    const g = this.geofence.getRawValue();
    const a = this.admin.getRawValue();
    const payload: InitSetupPayload = {
      companyName: c.companyName.trim(),
      timezone: c.timezone,
      currency: c.currency.toUpperCase(),
      officeStartTime: c.officeStartTime,
      graceMinutes: Number(c.graceMinutes),
      halfDayThresholdHours: Number(c.halfDayThresholdHours),
      weekendDays: c.weekendDays,
      latePenaltyRuleEnabled: c.latePenaltyRuleEnabled,
      admin: { fullName: a.fullName.trim(), email: a.email.trim().toLowerCase(), password: a.password },
      ...(this.hasLocation() ? { officeLocation: { lat: Number(g.lat), lng: Number(g.lng), radiusMeters: Number(g.radiusMeters) } } : {}),
    };

    this.saving.set(true);
    this.serverError.set('');
    this.setup.initialize(payload).subscribe({
      next: () => {
        this.saving.set(false);
        void celebrate();
        this.toast.success(`Welcome to HCM Lite, ${a.fullName.split(' ')[0]}!`, 'Your company is ready. Next: create departments and an HR login.');
        void this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        this.saving.set(false);
        if (apiStatus(error) === 409) {
          this.toast.info('Already set up', 'This system has already been initialized — please sign in.');
          this.setup.refresh().subscribe(() => void this.router.navigate(['/login']));
          return;
        }
        this.serverError.set(apiErrorMessage(error));
      },
    });
  }
}
