import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { LucideAngularModule, LucideIconData } from 'lucide-angular';
import { ThemeService } from '../../core/services/theme.service';
import { Icons } from '../../shared/ui/icons';

interface Highlight {
  icon: LucideIconData;
  title: string;
  text: string;
  chip: string;
}

/** Split-screen frame for setup, sign-in and password screens (brief-cover colour story on the left). */
@Component({
  selector: 'app-auth-layout',
  imports: [LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative flex min-h-dvh bg-slate-50 dark:bg-slate-950">
      <!-- Brand panel -->
      <aside class="relative hidden w-[44%] max-w-[640px] flex-col justify-between overflow-hidden bg-[#0B1222] p-10 text-white lg:flex xl:p-14">
        <div class="pointer-events-none absolute -left-24 -top-24 h-96 w-96 animate-blob rounded-full bg-emerald-500/25 blur-3xl"></div>
        <div class="pointer-events-none absolute -right-28 top-1/3 h-96 w-96 animate-blob rounded-full bg-violet-600/25 blur-3xl [animation-delay:-7s]"></div>
        <div class="pointer-events-none absolute -bottom-28 left-1/4 h-80 w-80 animate-blob rounded-full bg-amber-400/20 blur-3xl [animation-delay:-13s]"></div>
        <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.07)_1px,transparent_0)] [background-size:28px_28px]"></div>

        <div class="relative flex items-center gap-3">
          <span class="relative grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-xl font-black shadow-lg shadow-emerald-500/40">
            H<span class="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full border-2 border-[#0B1222] bg-violet-400"></span>
          </span>
          <div>
            <p class="text-lg font-extrabold leading-tight">HCM <span class="text-emerald-400">Lite</span></p>
            <p class="text-xs font-medium text-slate-400">AI-assisted Human Capital Management</p>
          </div>
        </div>

        <div class="relative">
          <h2 class="text-balance text-4xl font-extrabold leading-[1.1] tracking-tight xl:text-5xl">
            People operations,<br />
            <span class="bg-gradient-to-r from-emerald-300 via-teal-200 to-violet-300 bg-clip-text text-transparent">beautifully simple.</span>
          </h2>
          <p class="mt-4 max-w-md text-[15px] leading-relaxed text-slate-300">Attendance with camera & GPS, smart leave, payroll and dashboards — with an AI assistant that speaks English and Roman Urdu.</p>
          <ul class="mt-8 space-y-3">
            @for (h of highlights; track h.title) {
              <li class="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 backdrop-blur-sm">
                <span class="grid h-9 w-9 shrink-0 place-items-center rounded-xl" [class]="h.chip"><lucide-icon [img]="h.icon" [size]="17" /></span>
                <span>
                  <span class="block text-sm font-semibold">{{ h.title }}</span>
                  <span class="block text-xs text-slate-400">{{ h.text }}</span>
                </span>
              </li>
            }
          </ul>
        </div>

        <div class="relative flex flex-wrap gap-2 text-[11px] font-semibold">
          <span class="rounded-full bg-slate-100 px-3 py-1 text-slate-900">Admin</span>
          <span class="rounded-full bg-emerald-500 px-3 py-1 text-white">HR</span>
          <span class="rounded-full bg-amber-400 px-3 py-1 text-slate-950">Employee</span>
        </div>
      </aside>

      <!-- Content -->
      <main class="relative flex flex-1 flex-col">
        <div class="pointer-events-none absolute inset-0 overflow-hidden lg:hidden" aria-hidden="true">
          <div class="absolute -top-32 right-0 h-72 w-72 rounded-full bg-emerald-300/30 blur-3xl dark:bg-emerald-500/10"></div>
          <div class="absolute bottom-0 -left-20 h-72 w-72 rounded-full bg-violet-300/25 blur-3xl dark:bg-violet-600/10"></div>
        </div>
        <div class="relative flex items-center justify-between p-4 sm:p-6">
          <div class="flex items-center gap-2.5 lg:invisible">
            <span class="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 font-black text-white shadow-md shadow-emerald-500/30">H</span>
            <span class="font-extrabold text-slate-900 dark:text-white">HCM <span class="text-emerald-500">Lite</span></span>
          </div>
          <button type="button" class="btn btn-ghost btn-icon" (click)="theme.toggle()" aria-label="Toggle dark mode">
            <lucide-icon [img]="theme.isDark() ? icons.Sun : icons.Moon" [size]="19" />
          </button>
        </div>
        <div class="relative flex flex-1 items-start justify-center px-4 pb-10 sm:items-center sm:px-6">
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
    { icon: Icons.ScanFace, title: 'Camera + GPS check-in', text: 'One face, inside the geofence, no photos stored.', chip: 'bg-emerald-500/20 text-emerald-300' },
    { icon: Icons.Sparkles, title: 'Smart Leave & AI assistant', text: '“Agle Monday chutti chahiye” → a ready leave form.', chip: 'bg-violet-500/25 text-violet-300' },
    { icon: Icons.Wallet, title: 'Payroll studio', text: 'Draft → finalize & lock, with PDF payslips.', chip: 'bg-amber-400/20 text-amber-300' },
  ];
}
