import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { celebrate } from '../../core/utils/celebrate';
import { apiErrorMessage } from '../../core/utils/http';
import { matchFields, passwordPolicy } from '../../core/utils/validators';
import { fadeInUp } from '../../shared/animations';
import { FieldErrorComponent } from '../../shared/ui/field-error.component';
import { Icons } from '../../shared/ui/icons';
import { PasswordStrengthComponent } from '../../shared/ui/password-strength.component';
import { AuthLayoutComponent } from './auth-layout.component';

/** Password change — mandatory (navigation locked) when signing in with a temporary password. */
@Component({
  selector: 'app-change-password',
  imports: [ReactiveFormsModule, RouterLink, LucideAngularModule, AuthLayoutComponent, FieldErrorComponent, PasswordStrengthComponent],
  animations: [fadeInUp],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-auth-layout>
      <div @fadeInUp>
        @if (auth.mustChangePassword()) {
          <span class="badge bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/25">
            <lucide-icon [img]="icons.LockKeyhole" [size]="13" /> Temporary password detected
          </span>
        }
        <h1 class="mt-3 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">{{ auth.mustChangePassword() ? 'Set your own password' : 'Change password' }}</h1>
        <p class="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
          @if (auth.mustChangePassword()) {
            Hi {{ auth.firstName() }} — for your security, replace the temporary password before using HCM Lite.
          } @else {
            Choose a strong password you don't use anywhere else.
          }
        </p>

        <form [formGroup]="form" (ngSubmit)="submit()" class="card mt-6 space-y-4 p-6">
          <div>
            <label class="label" for="current">{{ auth.mustChangePassword() ? 'Temporary password' : 'Current password' }}</label>
            <input id="current" [type]="show() ? 'text' : 'password'" class="input" formControlName="currentPassword" autocomplete="current-password" />
            <app-field-error [control]="form.controls.currentPassword" label="Current password" [show]="attempted()" />
          </div>
          <div>
            <label class="label" for="new">New password</label>
            <div class="relative">
              <input id="new" [type]="show() ? 'text' : 'password'" class="input pr-11" formControlName="newPassword" autocomplete="new-password" />
              <button type="button" class="absolute inset-y-0 right-0 grid w-11 place-items-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200" (click)="show.set(!show())" [attr.aria-label]="show() ? 'Hide passwords' : 'Show passwords'">
                <lucide-icon [img]="show() ? icons.EyeOff : icons.Eye" [size]="17" />
              </button>
            </div>
            <app-password-strength [password]="newValue()" />
          </div>
          <div>
            <label class="label" for="confirm">Confirm new password</label>
            <input id="confirm" [type]="show() ? 'text' : 'password'" class="input" formControlName="confirm" autocomplete="new-password" />
            @if (form.errors?.['mismatch'] && form.controls.confirm.touched) {
              <p class="field-error">Passwords do not match.</p>
            }
          </div>

          @if (error()) {
            <p class="flex items-start gap-2 rounded-lg bg-rose-50 p-3.5 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
              <lucide-icon [img]="icons.CircleAlert" [size]="17" class="mt-0.5 shrink-0" /> {{ error() }}
            </p>
          }

          <button type="submit" class="btn btn-primary btn-lg w-full" [disabled]="saving()">
            <lucide-icon [img]="saving() ? icons.LoaderCircle : icons.ShieldCheck" [size]="18" [class.animate-spin]="saving()" />
            {{ saving() ? 'Saving…' : 'Update password' }}
          </button>
          <div class="flex items-center justify-between text-sm">
            @if (auth.mustChangePassword()) {
              <span class="text-xs text-slate-400">Navigation unlocks after this step.</span>
            } @else {
              <a routerLink="/dashboard" class="font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">← Back to dashboard</a>
            }
            <button type="button" class="font-semibold text-rose-600 hover:underline dark:text-rose-400" (click)="auth.logout()">Sign out</button>
          </div>
        </form>
      </div>
    </app-auth-layout>
  `,
})
export class ChangePasswordComponent {
  protected readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  protected readonly icons = Icons;

  protected readonly saving = signal(false);
  protected readonly attempted = signal(false);
  protected readonly show = signal(false);
  protected readonly error = signal('');

  protected readonly form = this.fb.nonNullable.group(
    {
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, passwordPolicy()]],
      confirm: ['', Validators.required],
    },
    { validators: matchFields('newPassword', 'confirm') },
  );
  protected readonly newValue = toSignal(this.form.controls.newPassword.valueChanges, { initialValue: '' });

  protected submit(): void {
    this.attempted.set(true);
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      if (this.form.controls.newPassword.invalid) this.error.set('The new password does not meet the policy yet.');
      return;
    }
    const v = this.form.getRawValue();
    if (v.currentPassword === v.newPassword) {
      this.error.set('The new password must be different from the current one.');
      return;
    }
    const firstLogin = this.auth.mustChangePassword();
    this.saving.set(true);
    this.error.set('');
    this.auth.changePassword(v.currentPassword, v.newPassword).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success('Password updated', firstLogin ? 'Welcome aboard — your account is ready.' : 'Use your new password next time you sign in.');
        if (firstLogin) void celebrate();
        void this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(apiErrorMessage(err));
      },
    });
  }
}
