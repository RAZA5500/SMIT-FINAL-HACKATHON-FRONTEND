import { DOCUMENT } from '@angular/common';
import { Injectable, effect, inject, signal } from '@angular/core';
import { safeStorage } from '../utils/storage';

const THEME_KEY = 'hcm-theme';

/** Instant dark / light switching driven by a signal (the `dark` class on <html>). */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  readonly isDark = signal<boolean>(this.initial());

  constructor() {
    effect(() => {
      const dark = this.isDark();
      this.document.documentElement.classList.toggle('dark', dark);
      this.document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0B0C0F' : '#F7F7F8');
    });
  }

  toggle(): void {
    this.isDark.update((dark) => !dark);
    safeStorage.set(THEME_KEY, this.isDark() ? 'dark' : 'light');
  }

  /** Light by default; dark only when the user picked it (matches the pre-paint script in index.html). */
  private initial(): boolean {
    return safeStorage.get(THEME_KEY) === 'dark';
  }
}
