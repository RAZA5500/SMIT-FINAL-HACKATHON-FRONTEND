import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import { Subscription } from 'rxjs';
import { AiStatus, AiToolCall } from '../models/api.models';
import { AiService } from './ai.service';
import { AuthService } from './auth.service';

export interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  tools?: AiToolCall[];
  status?: AiStatus;
  fallback?: boolean;
  model?: string | null;
  latencyMs?: number;
  at: Date;
}

/** Conversation state for the floating AI assistant drawer (kept for the session). */
@Injectable({ providedIn: 'root' })
export class AssistantStore {
  private readonly ai = inject(AiService);
  private readonly auth = inject(AuthService);
  private nextId = 1;
  private request: Subscription | null = null;

  readonly open = signal(false);
  readonly messages = signal<ChatMessage[]>([]);
  readonly pending = signal(false);
  /** Text to place in the composer when the drawer opens (e.g. from "Ask My Assistant"). */
  readonly draft = signal('');

  constructor() {
    // A new user never sees the previous user's conversation.
    effect(() => {
      this.auth.user();
      untracked(() => this.clear());
    });
  }

  openDrawer(prompt?: string): void {
    if (prompt) this.draft.set(prompt);
    this.open.set(true);
  }

  close(): void {
    this.open.set(false);
  }

  send(text: string): void {
    const message = text.trim();
    if (!message || this.pending()) return;

    // Only real exchanges are sent back as context (fallback notices are not).
    const history = this.messages()
      .filter((m) => !m.fallback)
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.content }));

    this.push({ role: 'user', content: message });
    this.pending.set(true);
    this.request = this.ai.chat(message, history).subscribe((res) => {
      this.push({
        role: 'assistant',
        content: res.reply,
        tools: res.toolsCalled,
        status: res.status,
        fallback: res.fallback,
        model: res.model,
        latencyMs: res.latencyMs,
      });
      this.pending.set(false);
    });
  }

  clear(): void {
    this.request?.unsubscribe();
    this.pending.set(false);
    this.messages.set([]);
  }

  private push(message: Omit<ChatMessage, 'id' | 'at'>): void {
    this.messages.update((list) => [...list, { ...message, id: this.nextId++, at: new Date() }]);
  }
}
