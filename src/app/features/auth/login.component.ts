import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { apiErrorMessage, apiStatus } from '../../core/utils/http';
import { fadeInUp } from '../../shared/animations';
import { FieldErrorComponent } from '../../shared/ui/field-error.component';
import { Icons } from '../../shared/ui/icons';
import { AuthLayoutComponent } from './auth-layout.component';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, LucideAngularModule, AuthLayoutComponent, FieldErrorComponent],
  animations: [fadeInUp],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-auth-layout>
      <div @fadeInUp>
        <h1 class="text-[2rem] font-semibold tracking-tight text-slate-900 dark:text-white">
          Welcome back <span class="wave inline-block origin-[70%_70%]" aria-hidden="true">👋</span>
        </h1>
        <p class="mt-1.5 text-sm text-slate-500 dark:text-slate-400">Sign in with the email your Admin or HR registered for you.</p>

        <!-- rotating gradient rim around the form -->
        <div class="frame mt-6" [class.shake]="shake()">
          <form [formGroup]="form" (ngSubmit)="submit()" class="card relative space-y-4 rounded-[19px] border-0 p-6 shadow-lift sm:p-7">
            <div>
              <label class="label" for="email">Email</label>
              <div class="group relative">
                <span class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors duration-200 group-focus-within:text-blue-500"><lucide-icon [img]="icons.Mail" [size]="17" /></span>
                <input id="email" type="email" class="input pl-10" formControlName="email" placeholder="you@company.com" autocomplete="username" />
                @if (emailLooksValid()) {
                  <span class="check absolute right-3 top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center rounded-full bg-blue-500 text-white" aria-hidden="true">
                    <lucide-icon [img]="icons.Check" [size]="12" [strokeWidth]="3" />
                  </span>
                }
              </div>
              <app-field-error [control]="form.controls.email" label="Email" [show]="attempted()" />
            </div>
            <div>
              <label class="label" for="password">Password</label>
              <div class="group relative">
                <span class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors duration-200 group-focus-within:text-blue-500"><lucide-icon [img]="icons.LockKeyhole" [size]="17" /></span>
                <input
                  id="password"
                  [type]="show() ? 'text' : 'password'"
                  class="input px-10"
                  formControlName="password"
                  placeholder="••••••••"
                  autocomplete="current-password"
                  (keydown)="trackCapsLock($event)"
                  (keyup)="trackCapsLock($event)"
                  (blur)="capsLock.set(false)"
                />
                <button
                  type="button"
                  class="absolute inset-y-0 right-0 grid w-11 place-items-center text-slate-400 transition hover:text-slate-700 active:scale-90 dark:hover:text-slate-200"
                  (click)="show.set(!show())"
                  [attr.aria-label]="show() ? 'Hide password' : 'Show password'"
                >
                  <lucide-icon [img]="show() ? icons.EyeOff : icons.Eye" [size]="17" />
                </button>
              </div>
              @if (capsLock()) {
                <p @fadeInUp class="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                  <lucide-icon [img]="icons.TriangleAlert" [size]="13" /> Caps Lock is on
                </p>
              }
              <app-field-error [control]="form.controls.password" label="Password" [show]="attempted()" />
            </div>

            @if (error()) {
              <p @fadeInUp class="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
                <lucide-icon [img]="icons.CircleAlert" [size]="17" class="mt-0.5 shrink-0" /> {{ error() }}
              </p>
            }

            <button type="submit" class="btn btn-primary btn-lg group w-full" [disabled]="loading()">
              @if (loading()) {
                <lucide-icon [img]="icons.LoaderCircle" [size]="18" class="animate-spin" /> Signing in…
              } @else {
                Sign in
                <lucide-icon [img]="icons.ArrowRight" [size]="18" class="transition-transform duration-300 ease-spring group-hover:translate-x-1" />
              }
            </button>

            <div class="flex items-center gap-3 text-[11px] font-medium uppercase tracking-wider text-slate-400">
              <span class="h-px flex-1 bg-slate-200 dark:bg-slate-800"></span>
              One sign-in, three roles
              <span class="h-px flex-1 bg-slate-200 dark:bg-slate-800"></span>
            </div>
            <div class="grid grid-cols-3 gap-2 text-center">
              @for (r of roles; track r.name) {
                <div class="group rounded-xl border border-slate-200/80 bg-slate-50/60 px-2 py-2 transition-all duration-300 ease-spring hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white hover:shadow-card dark:border-slate-800 dark:bg-white/[0.02] dark:hover:border-slate-700 dark:hover:bg-white/[0.04]">
                  <span class="mx-auto grid h-7 w-7 place-items-center rounded-lg transition-transform duration-300 ease-spring group-hover:scale-110" [class]="r.tint">
                    <lucide-icon [img]="r.icon" [size]="15" />
                  </span>
                  <p class="mt-1 text-xs font-semibold text-slate-800 dark:text-slate-200">{{ r.name }}</p>
                  <p class="text-[11px] leading-tight text-slate-500 dark:text-slate-400">{{ r.text }}</p>
                </div>
              }
            </div>

            <p class="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-xs leading-relaxed text-slate-500 dark:bg-white/[0.03] dark:text-slate-400">
              <lucide-icon [img]="icons.KeyRound" [size]="14" class="mt-0.5 shrink-0 text-blue-600 dark:text-blue-400" />
              First time here? Use the temporary password you received — you'll be asked to choose a new one right away.
            </p>
          </form>
        </div>
      </div>
    </app-auth-layout>
  `,
  styles: `
    .frame {
      position: relative;
      isolation: isolate;
      overflow: hidden;
      border-radius: 20px;
      padding: 1px;
      background: rgb(228 229 232);
    }
    :host-context(html.dark) .frame {
      background: rgb(255 255 255 / 0.08);
    }
    .frame::before {
      content: '';
      position: absolute;
      inset: -150%;
      z-index: -1;
      background: conic-gradient(from 0deg, transparent 0 55%, #3B82F6 70%, #6366F1 78%, #8b5cf6 88%, transparent 100%);
      opacity: 0.55;
      animation: rim 7s linear infinite;
      transition: opacity 0.3s;
    }
    .frame:focus-within::before {
      opacity: 1;
      animation-duration: 3.5s;
    }
    @keyframes rim {
      to {
        transform: rotate(360deg);
      }
    }
    @keyframes shake {
      10%,
      90% {
        transform: translateX(-1px);
      }
      20%,
      80% {
        transform: translateX(3px);
      }
      30%,
      50%,
      70% {
        transform: translateX(-6px);
      }
      40%,
      60% {
        transform: translateX(6px);
      }
    }
    .shake {
      animation: shake 0.45s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
    }
    @keyframes wave {
      0%,
      60%,
      100% {
        transform: rotate(0deg);
      }
      10%,
      30% {
        transform: rotate(14deg);
      }
      20% {
        transform: rotate(-8deg);
      }
      40% {
        transform: rotate(-4deg);
      }
      50% {
        transform: rotate(10deg);
      }
    }
    .wave {
      animation: wave 2.2s ease-in-out 0.4s 2;
    }
    h1:hover .wave {
      animation: wave 1.2s ease-in-out infinite;
    }
    @keyframes check-in {
      from {
        opacity: 0;
        transform: translateY(-50%) scale(0.3);
      }
      to {
        opacity: 1;
        transform: translateY(-50%) scale(1);
      }
    }
    .check {
      animation: check-in 0.35s cubic-bezier(0.22, 1, 0.36, 1) both;
    }
  `,
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  protected readonly icons = Icons;

  protected readonly loading = signal(false);
  protected readonly attempted = signal(false);
  protected readonly show = signal(false);
  protected readonly error = signal('');
  protected readonly capsLock = signal(false);
  protected readonly shake = signal(false);
  private shakeTimer: ReturnType<typeof setTimeout> | undefined;

  protected readonly roles = [
    { name: 'Admin', text: 'Company setup', icon: Icons.ShieldCheck, tint: 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' },
    { name: 'HR', text: 'People ops', icon: Icons.Users, tint: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300' },
    { name: 'Employee', text: 'Self-service', icon: Icons.UserRound, tint: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' },
  ];

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  private readonly emailStatus = toSignal(this.form.controls.email.statusChanges, { initialValue: this.form.controls.email.status });
  private readonly emailValue = toSignal(this.form.controls.email.valueChanges, { initialValue: '' });
  /** Green tick once the address is well-formed. */
  protected readonly emailLooksValid = computed(() => this.emailStatus() === 'VALID' && this.emailValue().includes('.'));

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.shakeTimer));
    // A stale "incorrect password" message disappears as soon as the user edits either field.
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.error.set(''));
  }

  protected trackCapsLock(event: KeyboardEvent): void {
    if (typeof event.getModifierState === 'function') this.capsLock.set(event.getModifierState('CapsLock'));
  }

  /** Nudges the form sideways on a failed attempt (restartable). */
  private nudge(): void {
    clearTimeout(this.shakeTimer);
    this.shake.set(false);
    requestAnimationFrame(() => {
      this.shake.set(true);
      this.shakeTimer = setTimeout(() => this.shake.set(false), 500);
    });
  }

  protected submit(): void {
    this.attempted.set(true);
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.nudge();
      return;
    }
    const { email, password } = this.form.getRawValue();
    this.loading.set(true);
    this.error.set('');
    this.auth.login(email.trim().toLowerCase(), password).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.user.mustChangePassword) {
          this.toast.info('Choose a new password', 'Your temporary password must be changed before you continue.');
          void this.router.navigate(['/change-password']);
          return;
        }
        this.toast.success(`Welcome, ${res.user.fullName.split(' ')[0]}!`);
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        void this.router.navigateByUrl(returnUrl && returnUrl.startsWith('/') && !returnUrl.startsWith('/login') ? returnUrl : '/dashboard');
      },
      error: (err) => {
        this.loading.set(false);
        this.nudge();
        const status = apiStatus(err);
        this.error.set(
          status === 401 ? 'Incorrect email or password.' : status === 429 ? 'Too many sign-in attempts. Please wait a minute and try again.' : apiErrorMessage(err),
        );
      },
    });
  }
}
