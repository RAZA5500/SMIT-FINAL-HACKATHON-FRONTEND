import { A11yModule } from '@angular/cdk/a11y';
import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, HostListener, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { Role } from '../core/models/api.models';
import { AssistantStore, ChatMessage } from '../core/services/assistant.store';
import { AuthService } from '../core/services/auth.service';
import { renderMarkdown } from '../core/utils/markdown';
import { fade, fadeInUp, slideOver } from '../shared/animations';
import { AiBadgeComponent } from '../shared/ui/badges';
import { Icons } from '../shared/ui/icons';
import { isTopOverlay, lockScroll, popOverlay, pushOverlay, unlockScroll } from '../shared/ui/overlay';

const PROMPTS: Record<Role, string[]> = {
  Admin: [
    'What is our headcount by department?',
    'Is mahine kitne log late aaye?',
    'Who is on leave today?',
    'Summarize payroll cost this month',
  ],
  HR: ['Who is on leave today?', 'Top late-comers this month?', 'Aaj kitne log present hain?', 'Sick leave policy kya hai?'],
  Employee: ['Meri leave balance kitni hai?', 'How many casual leaves do I have left?', 'What is the late arrival policy?', 'Next public holiday kab hai?'],
};

const THINKING_STEPS = ['Understanding your question…', 'Running HR data tools…', 'Checking your access scope…', 'Composing the answer…'];

const TOOL_LABELS: Record<string, string> = {
  get_headcount: 'Headcount',
  get_attendance_summary: 'Attendance summary',
  get_late_comers: 'Late-comers',
  get_leave_summary: 'Leave summary',
  get_my_leave_balance: 'My leave balance',
  get_payroll_summary: 'Payroll summary',
  search_employees: 'Employee search',
};

/** Floating slide-over chat with the HR assistant (English + Roman Urdu), available to every role. */
@Component({
  selector: 'app-ai-drawer',
  imports: [LucideAngularModule, FormsModule, A11yModule, AiBadgeComponent],
  animations: [fade, slideOver, fadeInUp],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (store.open()) {
      <div class="fixed inset-0 z-[70]">
        <div @fade class="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]" (click)="store.close()"></div>
        <aside
          @slideOver
          cdkTrapFocus
          role="dialog"
          aria-modal="true"
          aria-label="HCM AI assistant"
          class="absolute inset-y-0 right-0 flex w-full max-w-[440px] flex-col border-l border-violet-200/60 bg-white shadow-2xl shadow-violet-900/20 dark:border-violet-500/20 dark:bg-slate-950"
        >
          <!-- Header -->
          <header class="relative overflow-hidden bg-gradient-to-br from-violet-600 via-purple-600 to-violet-800 px-5 pb-5 pt-4 text-white">
            <div class="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/10 blur-2xl"></div>
            <div class="relative flex items-start justify-between gap-3">
              <div class="flex items-center gap-3">
                <span class="grid h-11 w-11 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/25 backdrop-blur">
                  <lucide-icon [img]="icons.Bot" [size]="22" />
                </span>
                <div>
                  <p class="font-bold leading-tight">HCM Assistant</p>
                  <p class="flex items-center gap-1.5 text-xs text-violet-100"><lucide-icon [img]="icons.Languages" [size]="12" /> English · Roman Urdu</p>
                </div>
              </div>
              <div class="flex items-center gap-1">
                <button type="button" class="rounded-xl p-2 text-violet-100 transition hover:bg-white/10 hover:text-white disabled:opacity-40" [disabled]="store.messages().length === 0" (click)="store.clear()" title="Clear conversation" aria-label="Clear conversation">
                  <lucide-icon [img]="icons.RotateCcw" [size]="17" />
                </button>
                <button type="button" class="rounded-xl p-2 text-violet-100 transition hover:bg-white/10 hover:text-white" (click)="store.close()" aria-label="Close assistant">
                  <lucide-icon [img]="icons.X" [size]="18" />
                </button>
              </div>
            </div>
            <p class="relative mt-3 text-xs leading-relaxed text-violet-100/90">Answers use live HR data you are allowed to see — {{ scopeText() }}</p>
          </header>

          <!-- Messages -->
          <div #scroller class="scroll-thin flex-1 space-y-4 overflow-y-auto bg-gradient-to-b from-violet-50/60 to-white px-4 py-5 dark:from-violet-950/20 dark:to-slate-950">
            @if (store.messages().length === 0) {
              <div @fadeInUp class="pt-4 text-center">
                <span class="mx-auto grid h-14 w-14 animate-float place-items-center rounded-3xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-glow-violet">
                  <lucide-icon [img]="icons.Sparkles" [size]="26" />
                </span>
                <p class="mt-4 font-semibold text-slate-900 dark:text-white">Assalam-o-Alaikum, {{ auth.firstName() }}!</p>
                <p class="mx-auto mt-1 max-w-xs text-sm text-slate-500 dark:text-slate-400">Ask about attendance, leave, payroll or company policy — in English or Roman Urdu.</p>
              </div>
            }
            @for (m of store.messages(); track m.id) {
              @if (m.role === 'user') {
                <div @fadeInUp class="flex justify-end">
                  <p class="max-w-[85%] whitespace-pre-wrap rounded-3xl rounded-br-lg bg-slate-900 px-4 py-2.5 text-sm text-white shadow-md dark:bg-white dark:text-slate-900">{{ m.content }}</p>
                </div>
              } @else {
                <div @fadeInUp class="flex gap-2.5">
                  <span class="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-md shadow-violet-500/30">
                    <lucide-icon [img]="icons.Bot" [size]="16" />
                  </span>
                  <div class="min-w-0 max-w-[88%]">
                    <div
                      class="rounded-3xl rounded-tl-lg border px-4 py-3 text-sm leading-relaxed shadow-sm"
                      [class]="m.fallback ? 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100' : 'border-violet-100 bg-white text-slate-700 dark:border-violet-500/20 dark:bg-slate-900 dark:text-slate-200'"
                    >
                      <div [innerHTML]="html(m)"></div>
                    </div>
                    <div class="mt-1.5 flex flex-wrap items-center gap-1.5 pl-1">
                      <app-ai-badge />
                      @for (tool of m.tools ?? []; track $index) {
                        <span
                          class="badge"
                          [class]="tool.status === 'ok' ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/25' : tool.status === 'denied' ? 'bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-400/25' : 'bg-slate-100 text-slate-600 ring-slate-400/30 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-600/40'"
                          [title]="tool.status === 'denied' ? 'Blocked: outside your data scope' : tool.name"
                        >
                          <lucide-icon [img]="tool.status === 'ok' ? icons.Wrench : tool.status === 'denied' ? icons.Ban : icons.CircleAlert" [size]="10" />
                          {{ toolLabel(tool.name) }}{{ tool.status === 'denied' ? ' · denied' : '' }}
                        </span>
                      }
                      @if (m.latencyMs) {
                        <span class="text-[10px] text-slate-400">{{ (m.latencyMs / 1000).toFixed(1) }}s</span>
                      }
                    </div>
                  </div>
                </div>
              }
            }
            @if (store.pending()) {
              <div @fadeInUp class="flex gap-2.5">
                <span class="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white">
                  <lucide-icon [img]="icons.Bot" [size]="16" />
                </span>
                <div class="ai-shimmer rounded-3xl rounded-tl-lg border border-violet-200 px-4 py-3 dark:border-violet-500/30">
                  <p class="flex items-center gap-2 text-sm font-medium text-violet-700 dark:text-violet-300">
                    <lucide-icon [img]="icons.WandSparkles" [size]="15" class="animate-pulse" />
                    {{ thinking() }}
                  </p>
                  <div class="mt-2 flex gap-1">
                    @for (d of [0, 1, 2]; track d) {
                      <span class="h-1.5 w-1.5 animate-dot-bounce rounded-full bg-violet-500" [style.animation-delay.ms]="d * 160"></span>
                    }
                  </div>
                </div>
              </div>
            }
          </div>

          <!-- Composer -->
          <footer class="border-t border-violet-100 bg-white p-3 dark:border-violet-500/20 dark:bg-slate-950">
            <div class="scroll-thin -mx-1 mb-2.5 flex gap-1.5 overflow-x-auto px-1 pb-1">
              @for (p of prompts(); track p) {
                <button
                  type="button"
                  class="shrink-0 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700 transition hover:-translate-y-0.5 hover:border-violet-300 hover:bg-violet-100 disabled:opacity-50 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300"
                  [disabled]="store.pending()"
                  (click)="send(p)"
                >
                  {{ p }}
                </button>
              }
            </div>
            <form class="flex items-end gap-2 rounded-2xl border border-violet-200 bg-white p-1.5 shadow-sm transition focus-within:border-violet-400 focus-within:ring-4 focus-within:ring-violet-500/15 dark:border-violet-500/30 dark:bg-slate-900" (submit)="$event.preventDefault(); send(text())">
              <textarea
                #composer
                rows="1"
                [ngModel]="text()"
                (ngModelChange)="text.set($event); autosize()"
                name="message"
                maxlength="2000"
                (keydown.enter)="onEnter($any($event))"
                placeholder="Ask anything… (Enter to send)"
                class="max-h-32 min-h-[40px] flex-1 resize-none bg-transparent px-2.5 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100"
              ></textarea>
              <button type="submit" class="btn btn-ai btn-icon h-10 w-10 shrink-0 p-0" [disabled]="!text().trim() || store.pending()" aria-label="Send message">
                <lucide-icon [img]="icons.Send" [size]="16" />
              </button>
            </form>
            <p class="mt-2 text-center text-[10px] text-slate-400">AI can make mistakes · 20 requests/hour · replies within 15 s</p>
          </footer>
        </aside>
      </div>
    }
  `,
})
export class AiDrawerComponent {
  protected readonly store = inject(AssistantStore);
  protected readonly auth = inject(AuthService);
  protected readonly icons = Icons;

  private readonly scroller = viewChild<ElementRef<HTMLElement>>('scroller');
  private readonly composer = viewChild<ElementRef<HTMLTextAreaElement>>('composer');
  private token: symbol | null = null;
  private thinkingTimer: ReturnType<typeof setInterval> | null = null;

  protected readonly text = signal('');
  protected readonly thinkingStep = signal(0);
  protected readonly thinking = computed(() => THINKING_STEPS[this.thinkingStep() % THINKING_STEPS.length]);
  protected readonly prompts = computed(() => PROMPTS[this.auth.role() ?? 'Employee']);
  protected readonly scopeText = computed(() => {
    switch (this.auth.role()) {
      case 'Admin':
        return 'company-wide data.';
      case 'HR':
        return 'HR data across employees.';
      default:
        return 'your own records only.';
    }
  });

  private readonly htmlCache = new Map<number, string>();

  constructor() {
    effect(() => {
      const open = this.store.open();
      untracked(() => {
        if (open) {
          this.token ??= pushOverlay();
          lockScroll();
          const draft = this.store.draft();
          if (draft) {
            this.text.set(draft);
            this.store.draft.set('');
          }
          setTimeout(() => {
            this.composer()?.nativeElement.focus();
            this.scrollToEnd();
          }, 80);
        } else if (this.token) {
          popOverlay(this.token);
          this.token = null;
          unlockScroll();
        }
      });
    });

    effect(() => {
      this.store.messages();
      const pending = this.store.pending();
      untracked(() => {
        setTimeout(() => this.scrollToEnd(), 30);
        if (pending && !this.thinkingTimer) {
          this.thinkingStep.set(0);
          this.thinkingTimer = setInterval(() => this.thinkingStep.update((n) => n + 1), 2200);
        } else if (!pending && this.thinkingTimer) {
          clearInterval(this.thinkingTimer);
          this.thinkingTimer = null;
        }
      });
    });

    inject(DestroyRef).onDestroy(() => {
      if (this.thinkingTimer) clearInterval(this.thinkingTimer);
      if (this.token) unlockScroll();
    });
  }

  protected send(message: string): void {
    if (!message.trim() || this.store.pending()) return;
    this.store.send(message);
    this.text.set('');
    setTimeout(() => this.autosize());
  }

  protected onEnter(event: KeyboardEvent): void {
    if (event.shiftKey) return;
    event.preventDefault();
    this.send(this.text());
  }

  protected autosize(): void {
    const el = this.composer()?.nativeElement;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }

  protected html(m: ChatMessage): string {
    let cached = this.htmlCache.get(m.id);
    if (!cached) {
      cached = renderMarkdown(m.content);
      this.htmlCache.set(m.id, cached);
    }
    return cached;
  }

  protected toolLabel(name: string): string {
    return TOOL_LABELS[name] ?? name.replace(/_/g, ' ');
  }

  private scrollToEnd(): void {
    const el = this.scroller()?.nativeElement;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.store.open() && isTopOverlay(this.token)) this.store.close();
  }
}
