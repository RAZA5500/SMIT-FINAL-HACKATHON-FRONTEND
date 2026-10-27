import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { LucideAngularModule, LucideIconData } from 'lucide-angular';
import { ThemeService } from '../../core/services/theme.service';
import { Icons } from '../../shared/ui/icons';
import { LogoComponent } from '../../shared/ui/logo.component';

interface Highlight {
  icon: LucideIconData;
  title: string;
  text: string;
}

/**
 * Split-screen frame for setup, sign-in and password screens: a calm brand panel on the left
 * (headline + three product highlights) and the form on the right.
 */
@Component({
  selector: 'app-auth-layout',
  imports: [LucideAngularModule, LogoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex min-h-dvh bg-slate-50 dark:bg-slate-950 lg:h-dvh lg:overflow-hidden">
      <!-- Brand panel -->
      <aside class="relative isolate hidden w-[44%] max-w-[600px] flex-col overflow-hidden bg-blue-900 px-12 py-10 text-white lg:flex xl:px-16 dark:bg-blue-950">
        <div aria-hidden="true" class="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div class="absolute -left-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-blue-500/25 blur-3xl"></div>
          <div class="absolute -bottom-48 -right-32 h-[30rem] w-[30rem] rounded-full bg-indigo-400/10 blur-3xl"></div>
        </div>

        <div class="flex items-center gap-3">
          <app-logo [size]="40" class="ring-1 ring-white/20" />
          <span class="text-base font-semibold tracking-tight">HCM Lite</span>
        </div>

        <div class="flex flex-1 flex-col justify-center py-10">
          <h2 class="animate-fade-in-up text-balance text-[2.5rem] font-semibold leading-[1.1] tracking-tight xl:text-[2.875rem]">
            People operations,<br />
            <span class="text-blue-300">beautifully simple.</span>
          </h2>
          <p class="mt-5 max-w-md animate-fade-in-up text-base leading-relaxed text-blue-50/75 [animation-delay:80ms]">
            Attendance, leave, payroll and an AI assistant, together in one calm workspace for Admin, HR and every employee.
          </p>

          <ul class="stagger mt-10 space-y-5">
            @for (h of highlights; track h.title) {
              <li class="flex items-start gap-4">
                <span class="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 text-blue-300 ring-1 ring-inset ring-white/15">
                  <lucide-icon [img]="h.icon" [size]="17" [strokeWidth]="2.2" />
                </span>
                <span>
                  <span class="block text-[15px] font-medium text-white">{{ h.title }}</span>
                  <span class="mt-0.5 block text-sm text-blue-50/65">{{ h.text }}</span>
                </span>
              </li>
            }
          </ul>
        </div>

        <p class="flex items-center gap-2 text-xs text-blue-50/55">
          <lucide-icon [img]="icons.Sparkles" [size]="13" class="text-blue-300/80" />
          AI built in, English & Roman Urdu
        </p>
      </aside>

      <!-- Content -->
      <main class="scroll-thin relative isolate flex min-w-0 flex-1 flex-col overflow-x-hidden lg:overflow-y-auto">
        <div aria-hidden="true" class="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div class="mask-radial absolute inset-0 bg-grid-light bg-[size:32px_32px] dark:bg-grid-dark"></div>
          <div class="absolute -top-40 left-1/2 h-80 w-[36rem] -translate-x-1/2 rounded-full bg-blue-300/25 blur-3xl dark:bg-blue-500/10"></div>
          <div class="absolute -bottom-40 right-0 h-72 w-96 rounded-full bg-violet-300/20 blur-3xl dark:bg-violet-500/10"></div>
        </div>
        <div class="flex items-center justify-between p-4 sm:p-6 lg:absolute lg:inset-x-0 lg:top-0 lg:z-10">
          <div class="flex items-center gap-2.5 lg:invisible">
            <app-logo [size]="36" />
            <span class="text-sm font-semibold text-slate-900 dark:text-white">HCM Lite</span>
          </div>
          <button type="button" class="btn btn-ghost btn-icon group" (click)="theme.toggle()" [attr.aria-label]="theme.isDark() ? 'Switch to light mode' : 'Switch to dark mode'">
            <lucide-icon [img]="theme.isDark() ? icons.Sun : icons.Moon" [size]="18" class="transition-transform duration-500 ease-spring group-hover:rotate-[24deg] group-active:rotate-[180deg]" />
          </button>
        </div>
        <div class="flex flex-1 items-start justify-center px-4 pb-10 sm:items-center sm:px-6 lg:py-4">
          <div class="w-full" [class]="wide() ? 'max-w-2xl' : 'max-w-md'">
            <ng-content />
          </div>
        </div>
      </main>
    </div>
  `,
})
export class AuthLayoutComponent {
  protected readonly theme = inject(ThemeService);
  protected readonly icons = Icons;
  readonly wide = input(false);

  protected readonly highlights: Highlight[] = [
    { icon: Icons.ScanFace, title: 'Camera + GPS check-in', text: 'One face, inside the office geofence, no photos stored.' },
    { icon: Icons.Sparkles, title: 'Smart Leave with AI', text: '“Agle Monday chutti chahiye” becomes a ready leave request.' },
    { icon: Icons.Wallet, title: 'Payroll with payslips', text: 'Draft, review and lock monthly payroll, with PDF payslips.' },
  ];
}
