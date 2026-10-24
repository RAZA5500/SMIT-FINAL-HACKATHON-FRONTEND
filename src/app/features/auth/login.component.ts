import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
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
        <h1 class="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Welcome back</h1>
        <p class="mt-1.5 text-sm text-slate-500 dark:text-slate-400">Sign in with the email your Admin or HR registered for you.</p>

        <form [formGroup]="form" (ngSubmit)="submit()" class="card mt-7 space-y-4 p-6 sm:p-7">
          <div>
            <label class="label" for="email">Email</label>
            <div class="relative">
              <span class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"><lucide-icon [img]="icons.Mail" [size]="17" /></span>
              <input id="email" type="email" class="input pl-10" formControlName="email" placeholder="you@company.com" autocomplete="username" />
            </div>
            <app-field-error [control]="form.controls.email" label="Email" [show]="attempted()" />
          </div>
          <div>
            <label class="label" for="password">Password</label>
            <div class="relative">
              <span class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"><lucide-icon [img]="icons.LockKeyhole" [size]="17" /></span>
              <input id="password" [type]="show() ? 'text' : 'password'" class="input px-10" formControlName="password" autocomplete="current-password" />
              <button type="button" class="absolute inset-y-0 right-0 grid w-11 place-items-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200" (click)="show.set(!show())" [attr.aria-label]="show() ? 'Hide password' : 'Show password'">
                <lucide-icon [img]="show() ? icons.EyeOff : icons.Eye" [size]="17" />
              </button>
            </div>
            <app-field-error [control]="form.controls.password" label="Password" [show]="attempted()" />
          </div>

          @if (error()) {
            <p @fadeInUp class="flex items-start gap-2 rounded-2xl bg-rose-50 p-3.5 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
              <lucide-icon [img]="icons.CircleAlert" [size]="17" class="mt-0.5 shrink-0" /> {{ error() }}
            </p>
          }

          <button type="submit" class="btn btn-primary btn-lg w-full" [disabled]="loading()">
            <lucide-icon [img]="loading() ? icons.LoaderCircle : icons.LogIn" [size]="18" [class.animate-spin]="loading()" />
            {{ loading() ? 'Signing in…' : 'Sign in' }}
          </button>
          <p class="flex items-start gap-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            <lucide-icon [img]="icons.KeyRound" [size]="14" class="mt-0.5 shrink-0" />
            First time here? Use the temporary password you received — you'll be asked to choose a new one right away.
          </p>
        </form>
      </div>
    </app-auth-layout>
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

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  protected submit(): void {
    this.attempted.set(true);
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
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
        const status = apiStatus(err);
        this.error.set(
          status === 401 ? 'Incorrect email or password.' : status === 429 ? 'Too many sign-in attempts. Please wait a minute and try again.' : apiErrorMessage(err),
        );
      },
    });
  }
}
