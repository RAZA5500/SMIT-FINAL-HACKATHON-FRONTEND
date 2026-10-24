import { Directive, ElementRef, NgZone, OnDestroy, effect, inject, input } from '@angular/core';

/**
 * Animated KPI counter: tweens the element's text from the previous value to the new one.
 * `<span [appCountUp]="headcount()" [countFormat]="fmt"></span>`
 */
@Directive({ selector: '[appCountUp]' })
export class CountUpDirective implements OnDestroy {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly zone = inject(NgZone);
  private frame = 0;
  private current = 0;

  readonly appCountUp = input<number | null | undefined>(0);
  readonly countFormat = input<(value: number) => string>((value) => Math.round(value).toLocaleString('en-US'));
  readonly countDuration = input(900);

  constructor() {
    effect(() => {
      const target = this.appCountUp();
      const format = this.countFormat();
      const duration = this.countDuration();
      if (target === null || target === undefined || Number.isNaN(target)) {
        cancelAnimationFrame(this.frame);
        this.el.nativeElement.textContent = '—';
        return;
      }
      this.animate(this.current, target, format, duration);
    });
  }

  private animate(from: number, to: number, format: (value: number) => string, duration: number): void {
    cancelAnimationFrame(this.frame);
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce || from === to) {
      this.current = to;
      this.el.nativeElement.textContent = format(to);
      return;
    }
    this.zone.runOutsideAngular(() => {
      const start = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        const value = from + (to - from) * eased;
        this.current = value;
        this.el.nativeElement.textContent = format(t === 1 ? to : value);
        if (t < 1) this.frame = requestAnimationFrame(step);
        else this.current = to;
      };
      this.frame = requestAnimationFrame(step);
    });
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.frame);
  }
}
