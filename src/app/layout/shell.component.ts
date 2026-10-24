import { ChangeDetectionStrategy, Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { filter } from 'rxjs';
import { AssistantStore } from '../core/services/assistant.store';
import { safeStorage } from '../core/utils/storage';
import { CameraCheckinComponent } from '../shared/attendance/camera-checkin.component';
import { CorrectionRequestComponent } from '../shared/attendance/correction-request.component';
import { fade, routeTransition, slideInLeft } from '../shared/animations';
import { Icons } from '../shared/ui/icons';
import { AiDrawerComponent } from './ai-drawer.component';
import { SidebarComponent } from './sidebar.component';
import { TopbarComponent } from './topbar.component';

const COLLAPSE_KEY = 'hcm-sidebar-collapsed';

/** Authenticated app frame: sidebar, topbar, animated router outlet, AI assistant and attendance overlays. */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, LucideAngularModule, SidebarComponent, TopbarComponent, AiDrawerComponent, CameraCheckinComponent, CorrectionRequestComponent],
  animations: [routeTransition, slideInLeft, fade],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative flex h-dvh overflow-hidden">
      <!-- ambient glow -->
      <div class="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <div class="absolute -top-40 left-1/3 h-[28rem] w-[28rem] animate-blob rounded-full bg-emerald-300/25 blur-3xl dark:bg-emerald-500/10"></div>
        <div class="absolute -right-32 top-1/3 h-[26rem] w-[26rem] animate-blob rounded-full bg-violet-300/20 blur-3xl [animation-delay:-6s] dark:bg-violet-600/10"></div>
        <div class="absolute -bottom-24 left-24 h-80 w-80 animate-blob rounded-full bg-amber-200/30 blur-3xl [animation-delay:-12s] dark:bg-amber-500/5"></div>
      </div>

      <!-- desktop sidebar -->
      <div class="hidden shrink-0 lg:block">
        <app-sidebar [collapsed]="collapsed()" />
      </div>

      <!-- mobile off-canvas -->
      @if (mobileNav()) {
        <div class="fixed inset-0 z-50 lg:hidden">
          <div @fade class="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" (click)="mobileNav.set(false)"></div>
          <div @slideInLeft class="absolute inset-y-0 left-0 shadow-2xl">
            <app-sidebar [mobile]="true" (navigate)="mobileNav.set(false)" />
          </div>
        </div>
      }

      <div class="flex min-w-0 flex-1 flex-col">
        <app-topbar [collapsed]="collapsed()" (menu)="mobileNav.set(true)" (toggleCollapse)="toggleCollapse()" />
        <main #scroller class="scroll-thin relative flex-1 overflow-y-auto overflow-x-hidden">
          <div class="mx-auto w-full max-w-[1440px] px-4 pb-28 pt-6 sm:px-6 lg:px-8" [@routeTransition]="routeKey(outlet)">
            <router-outlet #outlet="outlet" />
          </div>
        </main>
      </div>

      <!-- Floating AI trigger -->
      <button
        type="button"
        class="group fixed bottom-5 right-5 z-30 grid h-14 w-14 animate-glow-pulse place-items-center rounded-2xl bg-gradient-to-br from-violet-600 to-purple-500 text-white transition-transform duration-300 hover:scale-110 active:scale-95"
        (click)="assistant.openDrawer()"
        aria-label="Open the AI assistant"
        title="Ask the HCM assistant"
      >
        <lucide-icon [img]="icons.Sparkles" [size]="24" />
        <span class="pointer-events-none absolute right-16 hidden whitespace-nowrap rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white opacity-0 shadow-lg transition group-hover:opacity-100 sm:block dark:bg-white dark:text-slate-900">Ask AI · English / Roman Urdu</span>
      </button>

      <app-ai-drawer />
      <app-camera-checkin />
      <app-correction-request />
    </div>
  `,
})
export class ShellComponent {
  protected readonly assistant = inject(AssistantStore);
  private readonly router = inject(Router);
  private readonly scroller = viewChild<ElementRef<HTMLElement>>('scroller');
  protected readonly icons = Icons;

  protected readonly mobileNav = signal(false);
  protected readonly collapsed = signal(safeStorage.get(COLLAPSE_KEY) === '1');

  constructor() {
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.mobileNav.set(false);
        this.scroller()?.nativeElement.scrollTo({ top: 0 });
      });
  }

  protected toggleCollapse(): void {
    this.collapsed.update((v) => !v);
    safeStorage.set(COLLAPSE_KEY, this.collapsed() ? '1' : '0');
  }

  protected routeKey(outlet: RouterOutlet): string {
    return outlet?.isActivated ? (outlet.activatedRoute.snapshot.routeConfig?.path ?? '') : '';
  }
}
