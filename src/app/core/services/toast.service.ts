import { Injectable, signal } from '@angular/core';

export type ToastTone = 'success' | 'error' | 'warning' | 'info' | 'ai';

export interface Toast {
  id: number;
  tone: ToastTone;
  title: string;
  message?: string;
  duration: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;
  private readonly recent = new Map<string, number>();
  readonly toasts = signal<Toast[]>([]);

  show(tone: ToastTone, title: string, message?: string, duration = 4500): void {
    // Collapse identical toasts fired in quick succession (e.g. several failing requests).
    const key = `${tone}|${title}|${message ?? ''}`;
    const last = this.recent.get(key);
    if (last && Date.now() - last < 2500) return;
    this.recent.set(key, Date.now());

    const toast: Toast = { id: this.nextId++, tone, title, message, duration };
    this.toasts.update((list) => [...list.slice(-4), toast]);
    if (duration > 0) setTimeout(() => this.dismiss(toast.id), duration);
  }

  success(title: string, message?: string): void {
    this.show('success', title, message);
  }

  error(title: string, message?: string): void {
    this.show('error', title, message, 6500);
  }

  warning(title: string, message?: string): void {
    this.show('warning', title, message, 5500);
  }

  info(title: string, message?: string): void {
    this.show('info', title, message);
  }

  ai(title: string, message?: string): void {
    this.show('ai', title, message, 5000);
  }

  dismiss(id: number): void {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }
}
