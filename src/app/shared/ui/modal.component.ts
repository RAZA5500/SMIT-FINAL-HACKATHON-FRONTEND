import { A11yModule } from '@angular/cdk/a11y';
import { ChangeDetectionStrategy, Component, DestroyRef, Directive, HostListener, computed, effect, inject, input, output, untracked } from '@angular/core';
import { LucideAngularModule, LucideIconData } from 'lucide-angular';
import { fade, modalPop, slideOver } from '../animations';
import { Icons } from './icons';
import { isTopOverlay, lockScroll, popOverlay, pushOverlay, unlockScroll } from './overlay';
import { TONE_SOLID, Tone } from './tone';

@Directive()
abstract class OverlayBase {
  readonly open = input(false);
  readonly dismissible = input(true);
  readonly closed = output<void>();

  private token: symbol | null = null;

  constructor() {
    effect(() => {
      const open = this.open();
      untracked(() => (open ? this.attach() : this.detach()));
    });
    inject(DestroyRef).onDestroy(() => this.detach());
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.open() && this.dismissible() && isTopOverlay(this.token)) this.closed.emit();
  }

  protected requestClose(): void {
    if (this.dismissible()) this.closed.emit();
  }

  private attach(): void {
    if (this.token) return;
    this.token = pushOverlay();
    lockScroll();
  }

  private detach(): void {
    if (!this.token) return;
    popOverlay(this.token);
    this.token = null;
    unlockScroll();
  }
}

/**
 * Animated dialog. Projects the body by default and an optional `[modal-footer]` slot.
 * `<app-modal [open]="show()" title="…" (closed)="show.set(false)">…</app-modal>`
 */
@Component({
  selector: 'app-modal',
  imports: [LucideAngularModule, A11yModule],
  animations: [fade, modalPop],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open()) {
      <div class="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-6" role="presentation">
        <div @fade class="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" (click)="requestClose()"></div>
        <section
          @modalPop
          cdkTrapFocus
          [cdkTrapFocusAutoCapture]="true"
          role="dialog"
          aria-modal="true"
          [attr.aria-label]="title()"
          class="relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl border border-slate-200/80 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:rounded-3xl"
          [class]="width()"
        >
          <header class="flex items-start gap-3.5 border-b border-slate-100 px-5 py-4 dark:border-slate-800 sm:px-6">
            @if (icon(); as img) {
              <span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white shadow-md" [class]="solid()">
                <lucide-icon [img]="img" [size]="19" [strokeWidth]="2.2" />
              </span>
            }
            <div class="min-w-0 flex-1">
              <h2 class="text-base font-bold text-slate-900 dark:text-white sm:text-lg">{{ title() }}</h2>
              @if (subtitle()) {
                <p class="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{{ subtitle() }}</p>
              }
            </div>
            @if (dismissible()) {
              <button type="button" class="btn btn-ghost btn-icon -mr-2 -mt-1" (click)="requestClose()" aria-label="Close dialog">
                <lucide-icon [img]="icons.X" [size]="18" />
              </button>
            }
          </header>
          <div class="scroll-thin flex-1 overflow-y-auto px-5 py-5 sm:px-6">
            <ng-content />
          </div>
          <ng-content select="[modal-footer]" />
        </section>
      </div>
    }
  `,
})
export class ModalComponent extends OverlayBase {
  readonly title = input('');
  readonly subtitle = input('');
  readonly icon = input<LucideIconData | null>(null);
  readonly tone = input<Tone>('emerald');
  readonly size = input<'sm' | 'md' | 'lg' | 'xl' | '2xl'>('md');

  protected readonly icons = Icons;
  protected readonly solid = computed(() => TONE_SOLID[this.tone()]);
  protected readonly width = computed(
    () => ({ sm: 'sm:max-w-md', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl', xl: 'sm:max-w-4xl', '2xl': 'sm:max-w-6xl' })[this.size()],
  );
}

/** Right-hand slide-over drawer with the same API as the modal. */
@Component({
  selector: 'app-slide-over',
  imports: [LucideAngularModule, A11yModule],
  animations: [fade, slideOver],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open()) {
      <div class="fixed inset-0 z-[60]" role="presentation">
        <div @fade class="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" (click)="requestClose()"></div>
        <aside
          @slideOver
          cdkTrapFocus
          [cdkTrapFocusAutoCapture]="true"
          role="dialog"
          aria-modal="true"
          [attr.aria-label]="title()"
          class="absolute inset-y-0 right-0 flex w-full flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
          [class]="width()"
        >
          <ng-content select="[slide-header]" />
          @if (title()) {
            <header class="flex items-start gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <div class="min-w-0 flex-1">
                <h2 class="truncate text-lg font-bold text-slate-900 dark:text-white">{{ title() }}</h2>
                @if (subtitle()) {
                  <p class="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{{ subtitle() }}</p>
                }
              </div>
              <button type="button" class="btn btn-ghost btn-icon -mr-2" (click)="requestClose()" aria-label="Close panel">
                <lucide-icon [img]="icons.X" [size]="18" />
              </button>
            </header>
          }
          <div class="scroll-thin flex min-h-0 flex-1 flex-col overflow-y-auto">
            <ng-content />
          </div>
          <ng-content select="[slide-footer]" />
        </aside>
      </div>
    }
  `,
})
export class SlideOverComponent extends OverlayBase {
  readonly title = input('');
  readonly subtitle = input('');
  readonly size = input<'md' | 'lg' | 'xl'>('lg');

  protected readonly icons = Icons;
  protected readonly width = computed(() => ({ md: 'max-w-md', lg: 'max-w-xl', xl: 'max-w-3xl' })[this.size()]);
}
