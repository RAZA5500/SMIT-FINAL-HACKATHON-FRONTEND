import { ChangeDetectionStrategy, Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { safeStorage } from '../core/utils/storage';
import { CameraCheckinComponent } from '../shared/attendance/camera-checkin.component';
import { CorrectionRequestComponent } from '../shared/attendance/correction-request.component';
import { fade, routeTransition, slideInLeft } from '../shared/animations';
import { AiDrawerComponent } from './ai-drawer.component';
import { SidebarComponent } from './sidebar.component';
import { TopbarComponent } from './topbar.component';

const COLLAPSE_KEY = 'hcm-sidebar-collapsed';

/** Authenticated app frame: sidebar, topbar, router outlet, AI assistant and attendance overlays. */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, SidebarComponent, TopbarComponent, AiDrawerComponent, CameraCheckinComponent, CorrectionRequestComponent],
  animations: [routeTransition, slideInLeft, fade],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative flex h-dvh overflow-hidden">
      <!-- desktop sidebar -->
      <div class="hidden shrink-0 lg:block">
        <app-sidebar [collapsed]="collapsed()" />
      </div>

      <!-- mobile off-canvas -->
      @if (mobileNav()) {
        <div class="fixed inset-0 z-50 lg:hidden">
          <div @fade class="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" (click)="mobileNav.set(false)"></div>
          <div @slideInLeft class="absolute inset-y-0 left-0 shadow-lift">
            <app-sidebar [mobile]="true" (navigate)="mobileNav.set(false)" />
          </div>
        </div>
      }

      <div class="flex min-w-0 flex-1 flex-col">
        <main #scroller class="scroll-thin relative isolate flex-1 overflow-y-auto overflow-x-hidden">
          <app-topbar class="sticky top-0 z-30 block" [collapsed]="collapsed()" (menu)="mobileNav.set(true)" (toggleCollapse)="toggleCollapse()" />
          <!-- ambient canvas: soft brand glows over a fading grid, scrolls away with the page top -->
          <div aria-hidden="true" class="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px] overflow-hidden">
            <div class="mask-radial absolute inset-0 bg-grid-light bg-[size:32px_32px] dark:bg-grid-dark"></div>
            <div class="absolute -top-40 left-[8%] h-80 w-[36rem] animate-aurora rounded-full bg-blue-400/[0.14] blur-3xl dark:bg-blue-500/10"></div>
            <div class="absolute -top-32 right-[4%] h-72 w-[30rem] animate-aurora rounded-full bg-violet-400/[0.12] blur-3xl [animation-delay:-8s] dark:bg-violet-500/10"></div>
          </div>
          <div class="mx-auto w-full max-w-[1400px] px-4 pb-16 pt-6 sm:px-6 lg:px-8 lg:pt-8" [@routeTransition]="routeKey(outlet)">
            <router-outlet #outlet="outlet" />
          </div>
        </main>
      </div>

      <app-ai-drawer />
      <app-camera-checkin />
      <app-correction-request />
    </div>
  `,
})
export class ShellComponent {
  private readonly router = inject(Router);
  private readonly scroller = viewChild<ElementRef<HTMLElement>>('scroller');

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
