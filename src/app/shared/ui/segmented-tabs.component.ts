import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  effect,
  input,
  model,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import { LucideAngularModule, LucideIconData } from 'lucide-angular';

export interface TabItem {
  id: string;
  label: string;
  icon?: LucideIconData;
  badge?: number | null;
}

/** Animated segmented control: a pill indicator glides to the active tab. */
@Component({
  selector: 'app-segmented-tabs',
  imports: [LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="scroll-thin -mx-1 max-w-full overflow-x-auto px-1 pb-1">
      <div
        #track
        role="tablist"
        class="relative inline-flex min-w-max gap-1 rounded-2xl border border-slate-200/80 bg-slate-100/80 p-1 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80"
      >
        <span
          aria-hidden="true"
          class="absolute inset-y-1 rounded-xl bg-white shadow-md shadow-slate-900/5 ring-1 ring-slate-900/5 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] dark:bg-slate-800 dark:ring-white/10"
          [style.left.px]="indicator().left"
          [style.width.px]="indicator().width"
          [style.opacity]="indicator().width ? 1 : 0"
        ></span>
        @for (tab of tabs(); track tab.id) {
          <button
            #tabButton
            type="button"
            role="tab"
            [attr.aria-selected]="tab.id === active()"
            (click)="active.set(tab.id)"
            class="relative z-[1] inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-semibold outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-emerald-500"
            [class]="tab.id === active() ? 'text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'"
          >
            @if (tab.icon) {
              <lucide-icon [img]="tab.icon" [size]="16" [strokeWidth]="2.2" />
            }
            {{ tab.label }}
            @if (tab.badge) {
              <span class="grid h-5 min-w-5 place-items-center rounded-full bg-amber-400 px-1.5 text-[10px] font-bold text-slate-950">{{ tab.badge }}</span>
            }
          </button>
        }
      </div>
    </div>
  `,
})
export class SegmentedTabsComponent implements AfterViewInit, OnDestroy {
  readonly tabs = input.required<TabItem[]>();
  readonly active = model.required<string>();

  private readonly track = viewChild.required<ElementRef<HTMLElement>>('track');
  private readonly buttons = viewChildren<ElementRef<HTMLButtonElement>>('tabButton');
  private observer: ResizeObserver | null = null;
  private frame = 0;

  protected readonly indicator = signal({ left: 0, width: 0 });

  constructor() {
    effect(() => {
      this.active();
      this.tabs();
      this.buttons();
      this.schedule();
    });
  }

  ngAfterViewInit(): void {
    this.observer = new ResizeObserver(() => this.schedule());
    this.observer.observe(this.track().nativeElement);
    this.schedule();
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    cancelAnimationFrame(this.frame);
  }

  private schedule(): void {
    cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(() => this.measure());
  }

  private measure(): void {
    const index = this.tabs().findIndex((t) => t.id === this.active());
    const button = this.buttons()[index]?.nativeElement;
    if (!button) {
      this.indicator.set({ left: 0, width: 0 });
      return;
    }
    this.indicator.set({ left: button.offsetLeft, width: button.offsetWidth });
  }
}
