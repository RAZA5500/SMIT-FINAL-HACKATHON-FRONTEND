import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { ToastService } from '../../core/services/toast.service';
import { copyToClipboard } from '../../core/utils/format';
import { Icons } from './icons';
import { ModalComponent } from './modal.component';

export interface Credentials {
  title: string;
  name: string;
  email: string;
  temporaryPassword: string;
}

/** One-time reveal of a temporary password (new logins and resets). */
@Component({
  selector: 'app-credentials-dialog',
  imports: [LucideAngularModule, ModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal [open]="!!credentials()" [title]="credentials()?.title ?? ''" subtitle="Share these securely — the password is shown only once." [icon]="icons.KeyRound" tone="emerald" (closed)="closed.emit()">
      @if (credentials(); as c) {
        <div class="space-y-3">
          <div class="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
            <p class="text-xs font-medium text-slate-400">Sign-in email</p>
            <p class="mt-1 break-all font-mono text-sm font-semibold text-slate-900 dark:text-white">{{ c.email }}</p>
          </div>
          <div class="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-500/30 dark:bg-blue-500/10">
            <p class="text-xs font-medium text-blue-700 dark:text-blue-300">Temporary password</p>
            <div class="mt-1 flex items-center justify-between gap-3">
              <p class="break-all font-mono text-lg font-semibold tracking-wider text-blue-900 dark:text-blue-100">{{ c.temporaryPassword }}</p>
              <button type="button" class="btn btn-secondary btn-sm shrink-0" (click)="copy(c)">
                <lucide-icon [img]="copied() ? icons.Check : icons.Copy" [size]="14" /> {{ copied() ? 'Copied' : 'Copy' }}
              </button>
            </div>
          </div>
          <p class="flex gap-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            <lucide-icon [img]="icons.LockKeyhole" [size]="14" class="mt-0.5 shrink-0" />
            {{ c.name }} must choose a new password at first sign-in — navigation stays locked until they do.
          </p>
        </div>
      }
      <div modal-footer class="flex justify-end border-t border-slate-200 px-5 py-4 dark:border-slate-800 sm:px-6">
        <button type="button" class="btn btn-primary" (click)="closed.emit()">Done</button>
      </div>
    </app-modal>
  `,
})
export class CredentialsDialogComponent {
  private readonly toast = inject(ToastService);
  protected readonly icons = Icons;
  readonly credentials = input<Credentials | null>(null);
  readonly closed = output<void>();
  protected readonly copied = signal(false);

  protected async copy(c: Credentials): Promise<void> {
    const ok = await copyToClipboard(`Email: ${c.email}\nTemporary password: ${c.temporaryPassword}`);
    if (ok) {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } else {
      this.toast.warning('Copy failed', 'Select and copy the password manually.');
    }
  }
}
