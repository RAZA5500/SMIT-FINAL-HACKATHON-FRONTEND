import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { Icons } from '../ui/icons';

type ChangeKind = 'added' | 'removed' | 'changed' | 'same';

interface DiffRow {
  path: string;
  before: string;
  after: string;
  kind: ChangeKind;
}

const MAX_DEPTH = 4;

function flatten(value: unknown, prefix = '', depth = 0, out = new Map<string, string>()): Map<string, string> {
  if (value === null || value === undefined) {
    if (prefix) out.set(prefix, value === null ? 'null' : '—');
    return out;
  }
  if (Array.isArray(value)) {
    if (value.length === 0 || depth >= MAX_DEPTH || value.every((v) => typeof v !== 'object' || v === null)) {
      out.set(prefix || '(root)', JSON.stringify(value));
      return out;
    }
    value.forEach((v, i) => flatten(v, `${prefix}[${i}]`, depth + 1, out));
    return out;
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0 || depth >= MAX_DEPTH) {
      out.set(prefix || '(root)', JSON.stringify(value));
      return out;
    }
    for (const [key, v] of entries) flatten(v, prefix ? `${prefix}.${key}` : key, depth + 1, out);
    return out;
  }
  out.set(prefix || '(value)', typeof value === 'string' ? value : JSON.stringify(value));
  return out;
}

/** Before / after JSON diff viewer for audit entries. */
@Component({
  selector: 'app-json-diff',
  imports: [LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex flex-wrap items-center gap-2 text-xs">
        <span class="badge bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-400/25">+ {{ counts().added }} added</span>
        <span class="badge bg-amber-50 text-amber-800 ring-amber-600/25 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/25">~ {{ counts().changed }} changed</span>
        <span class="badge bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-400/25">− {{ counts().removed }} removed</span>
      </div>
      <div class="flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
        <button type="button" class="rounded-lg px-2.5 py-1 text-xs font-semibold transition" [class]="view() === 'diff' ? 'bg-white shadow dark:bg-slate-700' : 'text-slate-500'" (click)="view.set('diff')">Diff</button>
        <button type="button" class="rounded-lg px-2.5 py-1 text-xs font-semibold transition" [class]="view() === 'raw' ? 'bg-white shadow dark:bg-slate-700' : 'text-slate-500'" (click)="view.set('raw')">Raw JSON</button>
      </div>
    </div>

    @if (view() === 'diff') {
      <label class="mt-3 flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
        <input type="checkbox" class="switch scale-75" [checked]="showSame()" (change)="showSame.set(!showSame())" />
        Show unchanged fields ({{ counts().same }})
      </label>
      @if (visibleRows().length === 0) {
        <p class="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">No field-level differences to show.</p>
      } @else {
        <div class="mt-3 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
          <div class="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,1fr)] bg-slate-50 text-xs font-medium text-slate-500 dark:bg-slate-800/70 dark:text-slate-400">
            <span class="px-3 py-2">Field</span><span class="px-3 py-2">Before</span><span class="px-3 py-2">After</span>
          </div>
          @for (row of visibleRows(); track row.path) {
            <div class="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,1fr)] border-t border-slate-100 font-mono text-[12px] dark:border-slate-800">
              <span class="flex items-start gap-1.5 break-all px-3 py-2 text-slate-700 dark:text-slate-300">
                <span class="mt-0.5 font-semibold" [class]="markClass(row.kind)">{{ mark(row.kind) }}</span>{{ row.path }}
              </span>
              <span class="break-all px-3 py-2" [class]="row.kind === 'removed' || row.kind === 'changed' ? 'bg-rose-50 text-rose-800 dark:bg-rose-500/10 dark:text-rose-300' : 'text-slate-500 dark:text-slate-400'">{{ row.before }}</span>
              <span class="break-all px-3 py-2" [class]="row.kind === 'added' || row.kind === 'changed' ? 'bg-blue-50 text-blue-800 dark:bg-blue-500/10 dark:text-blue-300' : 'text-slate-500 dark:text-slate-400'">{{ row.after }}</span>
            </div>
          }
        </div>
      }
    } @else {
      <div class="mt-3 grid gap-3 md:grid-cols-2">
        <div>
          <p class="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400"><lucide-icon [img]="icons.History" [size]="13" /> Before</p>
          <pre class="scroll-thin max-h-[50vh] overflow-auto rounded-lg bg-slate-950 p-3 font-mono text-[11px] leading-relaxed text-rose-200">{{ beforeJson() }}</pre>
        </div>
        <div>
          <p class="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400"><lucide-icon [img]="icons.CircleCheck" [size]="13" /> After</p>
          <pre class="scroll-thin max-h-[50vh] overflow-auto rounded-lg bg-slate-950 p-3 font-mono text-[11px] leading-relaxed text-blue-200">{{ afterJson() }}</pre>
        </div>
      </div>
    }
  `,
})
export class JsonDiffComponent {
  readonly before = input<unknown>(null);
  readonly after = input<unknown>(null);

  protected readonly icons = Icons;
  protected readonly view = signal<'diff' | 'raw'>('diff');
  protected readonly showSame = signal(false);

  protected readonly rows = computed<DiffRow[]>(() => {
    const a = flatten(this.before());
    const b = flatten(this.after());
    const keys = [...new Set([...a.keys(), ...b.keys()])].sort();
    return keys.map((path) => {
      const before = a.get(path);
      const after = b.get(path);
      const kind: ChangeKind = before === undefined ? 'added' : after === undefined ? 'removed' : before === after ? 'same' : 'changed';
      return { path, before: before ?? '—', after: after ?? '—', kind };
    });
  });

  protected readonly counts = computed(() => {
    const c = { added: 0, removed: 0, changed: 0, same: 0 };
    for (const row of this.rows()) c[row.kind] += 1;
    return c;
  });

  protected readonly visibleRows = computed(() => (this.showSame() ? this.rows() : this.rows().filter((r) => r.kind !== 'same')));
  protected readonly beforeJson = computed(() => JSON.stringify(this.before() ?? null, null, 2));
  protected readonly afterJson = computed(() => JSON.stringify(this.after() ?? null, null, 2));

  protected mark(kind: ChangeKind): string {
    return { added: '+', removed: '−', changed: '~', same: '·' }[kind];
  }

  protected markClass(kind: ChangeKind): string {
    return { added: 'text-blue-600', removed: 'text-rose-600', changed: 'text-amber-600', same: 'text-slate-300' }[kind];
  }
}
