import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  NgZone,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { Subscription } from 'rxjs';
import { CheckInStore, PunchKind } from '../../core/services/check-in.store';
import { FaceDetectionService, FaceScan } from '../../core/services/face-detection.service';
import { GeoError, GeoFix, GeolocationService } from '../../core/services/geolocation.service';
import { AuthService } from '../../core/services/auth.service';
import { OrgService } from '../../core/services/org.service';
import { PolicyStore } from '../../core/services/policy.store';
import { hhmmNowIn } from '../../core/utils/dates';
import { formatMeters, haversineMeters } from '../../core/utils/geo';
import { apiErrorBody, apiErrorCode, apiErrorMessage, apiStatus } from '../../core/utils/http';
import { fadeInUp } from '../animations';
import { GeoRadarComponent, RadarState } from '../ui/geo-radar.component';
import { Icons } from '../ui/icons';
import { ModalComponent } from '../ui/modal.component';

type CameraState = 'idle' | 'starting' | 'live' | 'denied' | 'error';

interface ServerRejection {
  code?: string;
  message: string;
  distanceMeters?: number;
  radiusMeters?: number;
}

const FRIENDLY: Record<string, string> = {
  FACE_NOT_DETECTED: 'No face detected — look straight at the camera.',
  INVALID_FACE_COUNT: 'Exactly one face must be visible.',
  LOCATION_REQUIRED: 'Your GPS location is required for camera check-in.',
  GPS_ACCURACY_TOO_LOW: 'GPS accuracy is too low. Move near a window or outdoors and retry.',
  OFFICE_LOCATION_NOT_CONFIGURED: 'The office location has not been configured yet — ask your administrator.',
  OUTSIDE_GEOFENCE: 'You are outside the office geofence.',
};

/**
 * Camera + GPS check-in: live webcam with scanning brackets, client-side face detection
 * (exactly one face + optional blink liveness), a geofence radar, and a privacy-first
 * payload — the server only receives the verification result, never a photo.
 */
@Component({
  selector: 'app-camera-checkin',
  imports: [LucideAngularModule, ModalComponent, GeoRadarComponent],
  animations: [fadeInUp],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal
      [open]="open()"
      size="xl"
      [icon]="icons.ScanFace"
      [tone]="mode() === 'out' ? 'amber' : 'emerald'"
      [title]="mode() === 'out' ? 'Camera check-out' : 'Camera check-in'"
      subtitle="Face check + GPS geofence · nothing but the result leaves your device"
      [dismissible]="!submitting()"
      (closed)="close()"
    >
      <div class="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <!-- Camera viewport -->
        <div>
          <div class="relative aspect-[4/3] overflow-hidden rounded-3xl bg-slate-950 shadow-inner">
            <video
              #videoElement
              class="h-full w-full -scale-x-100 object-cover transition-opacity duration-500"
              [class.opacity-0]="cameraState() !== 'live'"
              autoplay
              muted
              playsinline
            ></video>
            <canvas #overlay class="pointer-events-none absolute inset-0 h-full w-full -scale-x-100"></canvas>

            @if (cameraState() === 'live') {
              <!-- animated scanning brackets -->
              <div class="pointer-events-none absolute inset-[12%] animate-bracket-breathe">
                <span class="absolute left-0 top-0 h-10 w-10 rounded-tl-2xl border-l-4 border-t-4 transition-colors duration-300" [class]="bracketColor()"></span>
                <span class="absolute right-0 top-0 h-10 w-10 rounded-tr-2xl border-r-4 border-t-4 transition-colors duration-300" [class]="bracketColor()"></span>
                <span class="absolute bottom-0 left-0 h-10 w-10 rounded-bl-2xl border-b-4 border-l-4 transition-colors duration-300" [class]="bracketColor()"></span>
                <span class="absolute bottom-0 right-0 h-10 w-10 rounded-br-2xl border-b-4 border-r-4 transition-colors duration-300" [class]="bracketColor()"></span>
                @if (!faceOk()) {
                  <span class="absolute inset-x-2 h-0.5 animate-scan-line rounded-full bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_12px_2px_rgba(245,158,11,0.6)]"></span>
                }
              </div>
              <div class="absolute inset-x-0 top-3 flex justify-center">
                <span class="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold text-white shadow-lg backdrop-blur-md" [class]="faceChipClass()">
                  <lucide-icon [img]="faceOk() ? icons.CircleCheck : faceCount() && faceCount()! > 1 ? icons.Users : icons.ScanFace" [size]="14" />
                  {{ faceMessage() }}
                </span>
              </div>
              @if (livenessEnabled() && faceOk()) {
                <div @fadeInUp class="absolute inset-x-0 bottom-3 flex justify-center">
                  <span class="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold shadow-lg backdrop-blur-md" [class]="blinkDetected() ? 'bg-emerald-500/90 text-white' : 'bg-white/90 text-slate-800'">
                    <lucide-icon [img]="blinkDetected() ? icons.ShieldCheck : icons.Eye" [size]="14" />
                    {{ blinkDetected() ? 'Liveness confirmed' : 'Blink once to confirm you are live' }}
                  </span>
                </div>
              }
            } @else {
              <div class="absolute inset-0 grid place-items-center p-6 text-center text-slate-300">
                @switch (cameraState()) {
                  @case ('denied') {
                    <div>
                      <lucide-icon [img]="icons.VideoOff" [size]="40" class="mx-auto text-rose-400" />
                      <p class="mt-3 font-semibold text-white">Camera permission denied</p>
                      <p class="mt-1 text-sm">Allow camera access in your browser and retry, or request an HR correction.</p>
                      <button type="button" class="btn btn-secondary btn-sm mt-4" (click)="startCamera()">Retry</button>
                    </div>
                  }
                  @case ('error') {
                    <div>
                      <lucide-icon [img]="icons.VideoOff" [size]="40" class="mx-auto text-rose-400" />
                      <p class="mt-3 font-semibold text-white">Camera unavailable</p>
                      <p class="mt-1 text-sm">{{ cameraError() }}</p>
                      <button type="button" class="btn btn-secondary btn-sm mt-4" (click)="startCamera()">Retry</button>
                    </div>
                  }
                  @default {
                    <div>
                      <lucide-icon [img]="icons.LoaderCircle" [size]="36" class="mx-auto animate-spin text-emerald-400" />
                      <p class="mt-3 text-sm">Starting camera…</p>
                    </div>
                  }
                }
              </div>
            }
            @if (face.status() === 'loading' && cameraState() === 'live') {
              <div class="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-slate-900/80 px-3 py-1 text-[11px] font-medium text-slate-200">
                <lucide-icon [img]="icons.LoaderCircle" [size]="12" class="animate-spin" /> Loading face model…
              </div>
            }
          </div>

          <label class="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-800">
            <span class="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              <lucide-icon [img]="icons.Eye" [size]="16" class="text-violet-500" /> Blink liveness check
              <span class="text-xs font-normal text-slate-400">(optional)</span>
            </span>
            <input type="checkbox" class="switch" [checked]="livenessEnabled()" (change)="toggleLiveness()" />
          </label>

          <div class="mt-3 flex gap-3 rounded-2xl border border-emerald-200/70 bg-emerald-50/70 p-3.5 text-xs leading-relaxed text-emerald-900 dark:border-emerald-500/20 dark:bg-emerald-500/5 dark:text-emerald-200">
            <lucide-icon [img]="icons.ShieldCheck" [size]="18" class="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <p>
              <strong>Privacy:</strong> face detection runs entirely in your browser. No photo or video is stored or uploaded — only the face count
              and your GPS fix are sent to the server, which stores just the verification result (distance &amp; accuracy).
            </p>
          </div>
        </div>

        <!-- Geofence & checks -->
        <div class="flex flex-col gap-4">
          <div class="flex flex-col items-center rounded-3xl border border-slate-200 p-4 dark:border-slate-800">
            <div class="flex w-full items-center justify-between">
              <p class="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100"><lucide-icon [img]="icons.Radar" [size]="16" class="text-amber-500" /> Geofence radar</p>
              <span class="text-xs text-slate-500 dark:text-slate-400">radius {{ meters(radius()) }}</span>
            </div>
            <div class="mt-2 w-full max-w-[200px]">
              <app-geo-radar [radiusMeters]="radius()" [distanceMeters]="distance()" [state]="radarState()" />
            </div>
            <div class="mt-3 grid w-full grid-cols-2 gap-2 text-center">
              <div class="rounded-xl bg-slate-50 py-2 dark:bg-slate-800/60">
                <p class="text-[11px] text-slate-500 dark:text-slate-400">Distance</p>
                <p class="text-sm font-bold" [class]="distanceClass()">{{ distance() !== null ? meters(distance()) : 'Server-verified' }}</p>
              </div>
              <div class="rounded-xl bg-slate-50 py-2 dark:bg-slate-800/60">
                <p class="text-[11px] text-slate-500 dark:text-slate-400">GPS accuracy</p>
                <p class="text-sm font-bold" [class]="fix() ? (accuracyOk() ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400') : 'text-slate-400'">
                  {{ fix() ? '±' + fix()!.accuracy + ' m' : '…' }}
                </p>
              </div>
            </div>
            @if (geoError()) {
              <p class="mt-3 w-full rounded-xl bg-rose-50 p-2.5 text-xs text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{{ geoError() }}</p>
            }
          </div>

          <ul class="space-y-2">
            @for (check of checks(); track check.label) {
              <li class="flex items-center gap-3 rounded-2xl border px-3.5 py-2.5 text-sm transition-colors" [class]="check.ok === true ? 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-500/20 dark:bg-emerald-500/5' : check.ok === false ? 'border-rose-200 bg-rose-50/60 dark:border-rose-500/20 dark:bg-rose-500/5' : 'border-slate-200 dark:border-slate-800'">
                <lucide-icon
                  [img]="check.ok === true ? icons.CircleCheck : check.ok === false ? icons.CircleX : icons.CircleDashed"
                  [size]="18"
                  [class]="check.ok === true ? 'text-emerald-500' : check.ok === false ? 'text-rose-500' : 'text-slate-400 animate-pulse'"
                />
                <span class="min-w-0 flex-1">
                  <span class="block font-medium text-slate-800 dark:text-slate-100">{{ check.label }}</span>
                  <span class="block text-xs text-slate-500 dark:text-slate-400">{{ check.detail }}</span>
                </span>
              </li>
            }
          </ul>

          @if (rejection(); as r) {
            <div @fadeInUp class="flex gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
              <lucide-icon [img]="icons.TriangleAlert" [size]="18" class="mt-0.5 shrink-0" />
              <div>
                <p class="font-semibold">{{ r.code ? friendly(r.code) : 'Check-in rejected' }}</p>
                <p class="mt-0.5 text-xs">{{ r.message }}</p>
              </div>
            </div>
          }
          @if (success()) {
            <div @fadeInUp class="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 p-4 text-white shadow-glow-emerald">
              <lucide-icon [img]="icons.CircleCheck" [size]="24" />
              <p class="font-semibold">{{ mode() === 'out' ? 'Checked out' : 'Checked in' }} — verified by camera &amp; GPS.</p>
            </div>
          }
        </div>
      </div>

      <div modal-footer class="flex flex-col-reverse gap-2 border-t border-slate-100 px-5 py-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <button type="button" class="btn btn-ghost text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10" (click)="requestCorrection()" [disabled]="submitting()">
          <lucide-icon [img]="icons.Wrench" [size]="16" /> Failed? Request HR correction
        </button>
        <div class="flex flex-col-reverse gap-2 sm:flex-row">
          <button type="button" class="btn btn-secondary" (click)="close()" [disabled]="submitting()">Cancel</button>
          <button type="button" class="btn" [class]="mode() === 'out' ? 'btn-amber' : 'btn-primary'" [disabled]="!canSubmit()" (click)="submit()">
            <lucide-icon [img]="submitting() ? icons.LoaderCircle : icons.ScanFace" [size]="16" [class.animate-spin]="submitting()" />
            {{ mode() === 'out' ? 'Check out with camera' : 'Check in with camera' }}
          </button>
        </div>
      </div>
    </app-modal>
  `,
})
export class CameraCheckinComponent {
  private readonly store = inject(CheckInStore);
  private readonly geo = inject(GeolocationService);
  private readonly auth = inject(AuthService);
  private readonly org = inject(OrgService);
  private readonly policies = inject(PolicyStore);
  private readonly zone = inject(NgZone);
  protected readonly face = inject(FaceDetectionService);
  protected readonly icons = Icons;

  @ViewChild('videoElement') private videoElement?: ElementRef<HTMLVideoElement>;
  @ViewChild('overlay') private overlay?: ElementRef<HTMLCanvasElement>;

  private stream: MediaStream | null = null;
  private geoSub: Subscription | null = null;
  private officeSub: Subscription | null = null;
  private loopHandle = 0;
  private running = false;
  private earBaseline = 0;
  private eyesClosed = false;

  protected readonly mode = computed<PunchKind | null>(() => this.store.cameraMode());
  protected readonly open = computed(() => this.mode() !== null);

  protected readonly cameraState = signal<CameraState>('idle');
  protected readonly cameraError = signal('');
  protected readonly faceCount = signal<number | null>(null);
  protected readonly livenessEnabled = signal(true);
  protected readonly blinkDetected = signal(false);
  protected readonly fix = signal<GeoFix | null>(null);
  protected readonly geoError = signal<string | null>(null);
  protected readonly office = signal<{ lat: number | null; lng: number | null; radiusMeters: number } | null>(null);
  protected readonly rejection = signal<ServerRejection | null>(null);
  protected readonly submitting = signal(false);
  protected readonly success = signal(false);

  protected readonly maxAccuracy = computed(() => this.policies.attendance()?.camera.maxGpsAccuracyMeters ?? 100);
  protected readonly officeConfigured = computed(() => {
    const office = this.office();
    if (office) return office.lat !== null && office.lng !== null;
    return this.policies.attendance()?.officeLocation.configured ?? true;
  });
  protected readonly radius = computed(() => this.office()?.radiusMeters ?? this.policies.attendance()?.officeLocation.radiusMeters ?? 150);

  /** Live distance for Admin/HR (who may read the office coordinates); otherwise the server's figure after a check. */
  protected readonly distance = computed<number | null>(() => {
    const fix = this.fix();
    const office = this.office();
    if (fix && office?.lat !== null && office?.lat !== undefined && office.lng !== null) {
      return haversineMeters({ lat: fix.lat, lng: fix.lng }, { lat: office.lat, lng: office.lng });
    }
    return this.rejection()?.distanceMeters ?? null;
  });

  protected readonly faceOk = computed(() => this.faceCount() === 1);
  protected readonly livenessOk = computed(() => !this.livenessEnabled() || this.blinkDetected());
  protected readonly accuracyOk = computed(() => !!this.fix() && this.fix()!.accuracy <= this.maxAccuracy());
  protected readonly inside = computed<boolean | null>(() => (this.distance() === null ? null : this.distance()! <= this.radius()));

  protected readonly radarState = computed<RadarState>(() => {
    if (this.geoError()) return 'error';
    if (!this.fix()) return 'scanning';
    const inside = this.inside();
    return inside === null ? 'unknown' : inside ? 'inside' : 'outside';
  });

  protected readonly canSubmit = computed(
    () =>
      !this.submitting() &&
      !this.success() &&
      this.cameraState() === 'live' &&
      this.faceOk() &&
      this.livenessOk() &&
      this.accuracyOk() &&
      this.officeConfigured() &&
      this.inside() !== false,
  );

  protected readonly faceMessage = computed(() => {
    const count = this.faceCount();
    if (this.face.status() === 'error') return 'Face model failed to load';
    if (count === null) return 'Looking for your face…';
    if (count === 0) return 'No face detected — center your face';
    if (count > 1) return `${count} faces detected — only you should be in frame`;
    return 'Exactly 1 face detected';
  });

  protected readonly faceChipClass = computed(() => {
    const count = this.faceCount();
    if (count === 1) return 'bg-emerald-500/90';
    if (count !== null && count > 1) return 'bg-rose-500/90';
    return 'bg-amber-500/90';
  });

  protected readonly bracketColor = computed(() => {
    const count = this.faceCount();
    if (count === 1) return 'border-emerald-400';
    if (count !== null && count > 1) return 'border-rose-500';
    return 'border-amber-400';
  });

  protected readonly distanceClass = computed(() => {
    const inside = this.inside();
    if (inside === null) return 'text-slate-500 dark:text-slate-400 text-xs';
    return inside ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400';
  });

  protected readonly checks = computed(() => {
    const count = this.faceCount();
    const fix = this.fix();
    const inside = this.inside();
    return [
      {
        label: 'Exactly one face',
        detail: count === null ? 'Scanning the camera feed…' : count === 1 ? 'Face detected on this device' : count === 0 ? 'No face in frame' : `${count} faces — step away from others`,
        ok: count === null ? null : count === 1,
      },
      ...(this.livenessEnabled()
        ? [{ label: 'Blink liveness', detail: this.blinkDetected() ? 'Live person confirmed' : 'Blink naturally while facing the camera', ok: this.blinkDetected() ? true : null }]
        : []),
      {
        label: `GPS accuracy ≤ ${this.maxAccuracy()} m`,
        detail: fix ? `Current fix ±${fix.accuracy} m` : this.geoError() ? 'Location unavailable' : 'Waiting for a GPS fix…',
        ok: fix ? fix.accuracy <= this.maxAccuracy() : this.geoError() ? false : null,
      },
      {
        label: `Within ${formatMeters(this.radius())} of the office`,
        detail: !this.officeConfigured()
          ? 'Office location not configured by Admin'
          : inside === null
            ? 'Verified securely by the server on submit'
            : inside
              ? `${formatMeters(this.distance())} away — inside`
              : `${formatMeters(this.distance())} away — outside`,
        ok: !this.officeConfigured() ? false : inside,
      },
    ];
  });

  constructor() {
    effect(() => {
      const open = this.open();
      untracked(() => (open ? setTimeout(() => this.start()) : this.stop()));
    });
    inject(DestroyRef).onDestroy(() => this.stop());
  }

  protected close(): void {
    if (this.submitting()) return;
    this.store.closeCamera();
  }

  protected toggleLiveness(): void {
    this.livenessEnabled.update((v) => !v);
    this.blinkDetected.set(false);
    this.eyesClosed = false;
  }

  protected friendly(code: string): string {
    return FRIENDLY[code] ?? 'Check-in rejected';
  }

  protected meters(value: number | null): string {
    return formatMeters(value);
  }

  protected submit(): void {
    const mode = this.mode();
    const fix = this.fix();
    if (!mode || !fix || !this.canSubmit()) return;
    this.submitting.set(true);
    this.rejection.set(null);
    this.store
      .punch(mode, {
        source: 'camera',
        faceDetected: true,
        faceCount: 1,
        latitude: fix.lat,
        longitude: fix.lng,
        accuracy: fix.accuracy,
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.success.set(true);
          setTimeout(() => this.store.closeCamera(), 1400);
        },
        error: (error) => {
          this.submitting.set(false);
          const body = apiErrorBody(error);
          if (apiStatus(error) === 409) {
            this.rejection.set({ message: apiErrorMessage(error) });
            this.store.load();
            return;
          }
          this.rejection.set({
            code: apiErrorCode(error),
            message: apiErrorMessage(error),
            distanceMeters: typeof body?.['distanceMeters'] === 'number' ? (body['distanceMeters'] as number) : undefined,
            radiusMeters: typeof body?.['radiusMeters'] === 'number' ? (body['radiusMeters'] as number) : undefined,
          });
        },
      });
  }

  protected requestCorrection(): void {
    const tz = this.policies.timezone();
    const mode = this.mode();
    const reason = this.rejection()?.message ?? (this.faceCount() !== 1 ? 'Camera could not verify my face.' : this.geoError() ?? 'Camera check-in failed.');
    this.store.closeCamera();
    this.store.openCorrection({
      date: this.policies.today(),
      ...(mode === 'out' ? { requestedCheckOut: hhmmNowIn(tz) } : { requestedCheckIn: hhmmNowIn(tz) }),
      reason: `Camera ${mode === 'out' ? 'check-out' : 'check-in'} failed: ${reason}`,
    });
  }

  // ── lifecycle ─────────────────────────────────────────

  private start(): void {
    this.reset();
    this.loadOffice();
    void this.startCamera();
    this.startGeo();
    this.face.load().catch(() => undefined);
  }

  private reset(): void {
    this.faceCount.set(null);
    this.blinkDetected.set(false);
    this.fix.set(null);
    this.geoError.set(null);
    this.rejection.set(null);
    this.submitting.set(false);
    this.success.set(false);
    this.earBaseline = 0;
    this.eyesClosed = false;
  }

  /** Admin/HR may read the office coordinates (live distance); Employees get the server's verdict. */
  private loadOffice(): void {
    this.office.set(null);
    if (!this.auth.isManager()) return;
    this.officeSub?.unsubscribe();
    this.officeSub = this.org.getSettings().subscribe({
      next: (settings) => this.office.set(settings.officeLocation),
      error: () => undefined,
    });
  }

  protected async startCamera(): Promise<void> {
    this.stopCamera();
    this.cameraState.set('starting');
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      this.cameraError.set('Camera access needs a secure connection (HTTPS or localhost) and a supported browser.');
      this.cameraState.set('error');
      return;
    }
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      if (!this.open()) return this.stopCamera();
      const video = this.videoElement?.nativeElement;
      if (!video) return;
      video.srcObject = this.stream;
      await video.play();
      this.cameraState.set('live');
      this.runLoop();
    } catch (error) {
      const name = (error as DOMException)?.name;
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        this.cameraState.set('denied');
      } else {
        this.cameraError.set(name === 'NotFoundError' ? 'No camera was found on this device.' : name === 'NotReadableError' ? 'The camera is in use by another application.' : 'The camera could not be started.');
        this.cameraState.set('error');
      }
    }
  }

  private startGeo(): void {
    this.geoSub?.unsubscribe();
    this.geoSub = this.geo.watch().subscribe({
      next: (fix) => {
        this.fix.set(fix);
        this.geoError.set(null);
      },
      error: (error: GeoError) => this.geoError.set(error.message),
    });
  }

  /** Detection loop — as fast as the model allows while verifying, then throttled. */
  private runLoop(): void {
    if (this.running) return;
    this.running = true;
    this.zone.runOutsideAngular(() => {
      const tick = async () => {
        if (!this.running) return;
        const video = this.videoElement?.nativeElement;
        if (video && video.readyState >= 2 && !document.hidden) {
          try {
            const scan = await this.face.scan(video);
            this.zone.run(() => this.applyScan(scan));
            this.draw(scan);
          } catch {
            /* model still loading or a dropped frame */
          }
        }
        const verifying = !this.faceOk() || (this.livenessEnabled() && !this.blinkDetected());
        this.loopHandle = window.setTimeout(() => requestAnimationFrame(() => void tick()), verifying ? 0 : 220);
      };
      void tick();
    });
  }

  private applyScan(scan: FaceScan): void {
    this.faceCount.set(scan.count);
    if (scan.count !== 1 || scan.ear === null) {
      this.eyesClosed = false;
      return;
    }
    // Adaptive blink detection on the eye aspect ratio.
    const ear = scan.ear;
    if (!this.eyesClosed && ear > this.earBaseline * 0.8) {
      this.earBaseline = this.earBaseline === 0 ? ear : this.earBaseline * 0.85 + ear * 0.15;
    }
    if (this.earBaseline > 0 && ear < this.earBaseline * 0.72) {
      this.eyesClosed = true;
    } else if (this.eyesClosed && ear > this.earBaseline * 0.88) {
      this.eyesClosed = false;
      this.blinkDetected.set(true);
    }
  }

  private draw(scan: FaceScan): void {
    const canvas = this.overlay?.nativeElement;
    if (!canvas || !scan.frameWidth) return;
    if (canvas.width !== scan.frameWidth) canvas.width = scan.frameWidth;
    if (canvas.height !== scan.frameHeight) canvas.height = scan.frameHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const color = scan.count === 1 ? '#34d399' : '#fb7185';
    for (const box of scan.boxes) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 6]);
      ctx.beginPath();
      ctx.roundRect(box.x, box.y, box.width, box.height, 14);
      ctx.stroke();
    }
  }

  private stopCamera(): void {
    this.running = false;
    clearTimeout(this.loopHandle);
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    const video = this.videoElement?.nativeElement;
    if (video) video.srcObject = null;
    const canvas = this.overlay?.nativeElement;
    canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
  }

  private stop(): void {
    this.stopCamera();
    this.geoSub?.unsubscribe();
    this.geoSub = null;
    this.officeSub?.unsubscribe();
    this.cameraState.set('idle');
  }
}
