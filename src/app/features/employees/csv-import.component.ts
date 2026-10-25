import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { ImportResult } from '../../core/models/api.models';
import { EmployeeService } from '../../core/services/employee.service';
import { FileService } from '../../core/services/file.service';
import { ToastService } from '../../core/services/toast.service';
import { celebrate } from '../../core/utils/celebrate';
import { saveBlob, toCsv } from '../../core/utils/format';
import { apiErrorBody, apiErrorMessage } from '../../core/utils/http';
import { fadeInUp, listStagger } from '../../shared/animations';
import { Icons } from '../../shared/ui/icons';
import { ModalComponent } from '../../shared/ui/modal.component';

type Step = 'upload' | 'validate' | 'done';

const MAX_BYTES = 2 * 1024 * 1024;

/** CSV import stepper: drag & drop → dry-run validation scorecard → commit (only when every row passes). */
@Component({
  selector: 'app-csv-import',
  imports: [LucideAngularModule, ModalComponent],
  animations: [fadeInUp, listStagger],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal [open]="open()" size="xl" title="Import employees from CSV" subtitle="Dry-run validation first — nothing is saved until every row passes." [icon]="icons.FileSpreadsheet" tone="emerald" [dismissible]="!busy()" (closed)="closed.emit()">
      <!-- Stepper -->
      <ol class="mb-6 flex items-center gap-2 text-xs font-semibold">
        @for (s of steps; track s.id; let i = $index) {
          <li class="flex flex-1 items-center gap-2">
            <span class="grid h-8 w-8 shrink-0 place-items-center rounded-full transition-colors" [class]="stepIndex() > i ? 'bg-emerald-500 text-white' : stepIndex() === i ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'">
              @if (stepIndex() > i) {
                <lucide-icon [img]="icons.Check" [size]="14" [strokeWidth]="3" />
              } @else {
                {{ i + 1 }}
              }
            </span>
            <span class="hidden sm:inline" [class]="stepIndex() >= i ? 'text-slate-900 dark:text-white' : 'text-slate-400'">{{ s.label }}</span>
            @if (i < steps.length - 1) {
              <span class="h-px flex-1 transition-colors" [class]="stepIndex() > i ? 'bg-emerald-400' : 'bg-slate-200 dark:bg-slate-700'"></span>
            }
          </li>
        }
      </ol>

      @switch (step()) {
        @case ('upload') {
          <div @fadeInUp>
            <label
              class="group relative flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed px-6 py-12 text-center transition-all duration-300"
              [class]="dragging() ? 'scale-[1.01] border-emerald-400 bg-emerald-50 dark:bg-emerald-500/10' : file() ? 'border-emerald-300 bg-emerald-50/50 dark:border-emerald-500/40 dark:bg-emerald-500/5' : 'border-slate-300 bg-slate-50/60 hover:border-emerald-300 hover:bg-emerald-50/40 dark:border-slate-700 dark:bg-slate-900/40'"
              (dragover)="onDragOver($event)"
              (dragleave)="dragging.set(false)"
              (drop)="onDrop($event)"
            >
              <input type="file" accept=".csv,text/csv" class="sr-only" (change)="onPick($event)" />
              <span class="grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-lg shadow-emerald-500/30 transition-transform duration-300 group-hover:-translate-y-1">
                <lucide-icon [img]="file() ? icons.FileSpreadsheet : icons.CloudUpload" [size]="28" />
              </span>
              @if (file(); as f) {
                <p class="mt-4 font-semibold text-slate-900 dark:text-white">{{ f.name }}</p>
                <p class="text-sm text-slate-500 dark:text-slate-400">{{ size(f.size) }} · click or drop to replace</p>
              } @else {
                <p class="mt-4 font-semibold text-slate-900 dark:text-white">Drag & drop your .csv here</p>
                <p class="text-sm text-slate-500 dark:text-slate-400">or click to browse · max 2 MB · up to 1,000 rows</p>
              }
            </label>
            @if (fileError()) {
              <p class="field-error mt-3">{{ fileError() }}</p>
            }
            <div class="mt-5 grid gap-4 rounded-2xl border border-slate-200 p-4 text-sm dark:border-slate-800 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <p class="font-semibold text-slate-800 dark:text-slate-100">Columns</p>
                <p class="mt-1 font-mono text-xs leading-relaxed text-slate-500 dark:text-slate-400">code*, fullName*, email*, phone, address, gender, department*, designation*, joinDate* (YYYY-MM-DD), status, exitDate, basicSalary*</p>
                <p class="mt-1 text-xs text-slate-400">Department & designation may be a name or a code. * required</p>
              </div>
              <button type="button" class="btn btn-secondary btn-sm" (click)="downloadTemplate()"><lucide-icon [img]="icons.Download" [size]="14" /> Template</button>
            </div>
          </div>
        }

        @case ('validate') {
          <div @fadeInUp>
            @if (busy() && !result()) {
              <div class="flex flex-col items-center py-12 text-center">
                <lucide-icon [img]="icons.LoaderCircle" [size]="36" class="animate-spin text-emerald-500" />
                <p class="mt-3 font-semibold text-slate-800 dark:text-slate-100">Validating every row…</p>
                <p class="text-sm text-slate-500">Required fields, duplicates, emails, departments, dates and salaries.</p>
              </div>
            } @else if (result()) {
              @let r = result()!;
              <!-- Validation scorecard -->
              <div class="grid gap-3 sm:grid-cols-3" [@listStagger]="3">
                <div class="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                  <p class="text-xs font-semibold uppercase tracking-wider text-slate-400">Rows checked</p>
                  <p class="mt-1 text-3xl font-extrabold text-slate-900 dark:text-white">{{ r.totalRows }}</p>
                </div>
                <div class="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/30 dark:bg-emerald-500/10">
                  <p class="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300"><lucide-icon [img]="icons.CircleCheck" [size]="13" /> Valid rows</p>
                  <p class="mt-1 text-3xl font-extrabold text-emerald-700 dark:text-emerald-300">{{ r.validRows }}</p>
                </div>
                <div class="rounded-2xl border p-4" [class]="r.invalidRows ? 'border-rose-200 bg-rose-50 dark:border-rose-500/30 dark:bg-rose-500/10' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'">
                  <p class="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider" [class]="r.invalidRows ? 'text-rose-700 dark:text-rose-300' : 'text-slate-400'"><lucide-icon [img]="icons.CircleX" [size]="13" /> Invalid rows</p>
                  <p class="mt-1 text-3xl font-extrabold" [class]="r.invalidRows ? 'text-rose-700 dark:text-rose-300' : 'text-slate-900 dark:text-white'">{{ r.invalidRows }}</p>
                </div>
              </div>

              @if (r.valid) {
                <div class="mt-5 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 p-4 text-white shadow-glow-emerald">
                  <lucide-icon [img]="icons.ShieldCheck" [size]="22" />
                  <p class="text-sm font-semibold">All {{ r.totalRows }} rows passed the dry run. Commit to create {{ r.totalRows }} employees and their logins.</p>
                </div>
              } @else {
                <div class="mt-5 overflow-hidden rounded-2xl border border-rose-200 dark:border-rose-500/30">
                  <div class="flex items-center justify-between bg-rose-50 px-4 py-2.5 dark:bg-rose-500/10">
                    <p class="text-sm font-semibold text-rose-800 dark:text-rose-200">{{ r.errors.length }} problem{{ r.errors.length === 1 ? '' : 's' }} to fix</p>
                    <button type="button" class="btn btn-ghost btn-sm text-rose-700 dark:text-rose-300" (click)="downloadErrors(r)"><lucide-icon [img]="icons.Download" [size]="13" /> Error report</button>
                  </div>
                  <div class="scroll-thin max-h-72 overflow-y-auto">
                    <table class="data-table">
                      <thead>
                        <tr>
                          <th class="w-20">Row #</th>
                          <th class="w-40">Field</th>
                          <th>Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (e of r.errors; track $index) {
                          <tr>
                            <td class="num font-mono font-bold text-rose-700 dark:text-rose-300">{{ e.row }}</td>
                            <td><span class="badge bg-rose-50 font-mono text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-300">{{ e.field }}</span></td>
                            <td class="text-slate-700 dark:text-slate-200">{{ e.reason }}</td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                </div>
                <p class="mt-3 text-xs text-slate-500 dark:text-slate-400">Row numbers match lines in your file (the header is line 1). Fix the file and upload it again.</p>
              }
            }
          </div>
        }

        @case ('done') {
          @if (result(); as r) {
            <div @fadeInUp class="text-center">
              <span class="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-glow-emerald">
                <lucide-icon [img]="icons.PartyPopper" [size]="28" />
              </span>
              <h3 class="mt-4 text-xl font-extrabold text-slate-900 dark:text-white">{{ r.inserted }} employees imported</h3>
              <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Each has a login with a temporary password they must change at first sign-in.</p>
              @if (r.credentials?.length) {
                <div class="mx-auto mt-5 max-w-2xl overflow-hidden rounded-2xl border border-slate-200 text-left dark:border-slate-800">
                  <div class="flex items-center justify-between bg-slate-50 px-4 py-2.5 dark:bg-slate-900/70">
                    <p class="text-sm font-semibold">Temporary credentials</p>
                    <button type="button" class="btn btn-primary btn-sm" (click)="downloadCredentials(r)"><lucide-icon [img]="icons.Download" [size]="13" /> Download CSV</button>
                  </div>
                  <div class="scroll-thin max-h-56 overflow-y-auto">
                    <table class="data-table">
                      <thead><tr><th>Code</th><th>Name</th><th>Email</th><th>Temp password</th></tr></thead>
                      <tbody>
                        @for (c of r.credentials; track c.email) {
                          <tr>
                            <td class="font-mono text-xs">{{ c.code }}</td>
                            <td>{{ c.fullName }}</td>
                            <td class="text-xs">{{ c.email }}</td>
                            <td class="font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-300">{{ c.temporaryPassword }}</td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                </div>
                <p class="mt-2 text-xs text-amber-700 dark:text-amber-300">These passwords are shown only now — download them before closing.</p>
              }
            </div>
          }
        }
      }

      <div modal-footer class="flex flex-col-reverse gap-2 border-t border-slate-100 px-5 py-4 dark:border-slate-800 sm:flex-row sm:justify-between sm:px-6">
        @if (step() === 'validate') {
          <button type="button" class="btn btn-ghost" (click)="restart()" [disabled]="busy()"><lucide-icon [img]="icons.ArrowLeft" [size]="16" /> Upload another file</button>
        } @else {
          <span></span>
        }
        <div class="flex flex-col-reverse gap-2 sm:flex-row">
          @switch (step()) {
            @case ('upload') {
              <button type="button" class="btn btn-secondary" (click)="closed.emit()">Cancel</button>
              <button type="button" class="btn btn-primary" [disabled]="!file() || busy()" (click)="validate()">
                <lucide-icon [img]="icons.ListChecks" [size]="16" /> Run dry-run validation
              </button>
            }
            @case ('validate') {
              <button type="button" class="btn btn-primary" [disabled]="!result()?.valid || busy()" (click)="commit()" [title]="result()?.valid ? '' : 'Fix every invalid row first'">
                <lucide-icon [img]="busy() ? icons.LoaderCircle : result()?.valid ? icons.Zap : icons.Lock" [size]="16" [class.animate-spin]="busy()" />
                Commit import
              </button>
            }
            @case ('done') {
              <button type="button" class="btn btn-primary" (click)="closed.emit()">Done</button>
            }
          }
        </div>
      </div>
    </app-modal>
  `,
})
export class CsvImportComponent {
  private readonly api = inject(EmployeeService);
  private readonly files = inject(FileService);
  private readonly toast = inject(ToastService);
  protected readonly icons = Icons;

  readonly open = input(false);
  readonly closed = output<void>();
  readonly imported = output<number>();

  protected readonly steps = [
    { id: 'upload', label: 'Upload' },
    { id: 'validate', label: 'Dry-run validation' },
    { id: 'done', label: 'Commit' },
  ];
  protected readonly step = signal<Step>('upload');
  protected readonly file = signal<File | null>(null);
  protected readonly fileError = signal('');
  protected readonly dragging = signal(false);
  protected readonly busy = signal(false);
  protected readonly result = signal<ImportResult | null>(null);
  protected readonly stepIndex = computed(() => ['upload', 'validate', 'done'].indexOf(this.step()));

  constructor() {
    effect(() => {
      if (this.open()) untracked(() => this.restart(true));
    });
  }

  protected size(bytes: number): string {
    return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(true);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) this.setFile(file);
  }

  protected onPick(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.setFile(file);
    input.value = '';
  }

  protected restart(clearFile = false): void {
    this.step.set('upload');
    this.result.set(null);
    this.busy.set(false);
    if (clearFile) this.file.set(null);
    this.fileError.set('');
  }

  protected validate(): void {
    const file = this.file();
    if (!file) return;
    this.step.set('validate');
    this.busy.set(true);
    this.result.set(null);
    this.api.importCsv(file, true).subscribe({
      next: (res) => {
        this.busy.set(false);
        this.result.set(res);
      },
      error: (err) => {
        this.busy.set(false);
        this.step.set('upload');
        this.fileError.set(apiErrorMessage(err));
      },
    });
  }

  protected commit(): void {
    const file = this.file();
    if (!file || !this.result()?.valid) return;
    this.busy.set(true);
    this.api.importCsv(file, false).subscribe({
      next: (res) => {
        this.busy.set(false);
        this.result.set(res);
        this.step.set('done');
        this.imported.emit(res.inserted);
        void celebrate();
        this.toast.success('Import complete', `${res.inserted} employees created.`);
      },
      error: (err) => {
        this.busy.set(false);
        const body = apiErrorBody(err) as unknown as ImportResult | null;
        if (body && Array.isArray(body.errors)) this.result.set(body);
        this.toast.error('Import aborted', apiErrorMessage(err));
      },
    });
  }

  protected downloadTemplate(): void {
    this.files.download(this.api.importTemplate(), 'employee-import-template.csv');
  }

  protected downloadErrors(r: ImportResult): void {
    const csv = toCsv([['row', 'field', 'reason'], ...r.errors.map((e) => [e.row, e.field, e.reason])]);
    saveBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), 'import-errors.csv');
  }

  protected downloadCredentials(r: ImportResult): void {
    const rows = (r.credentials ?? []).map((c) => [c.code, c.fullName, c.email, c.temporaryPassword]);
    const csv = toCsv([['code', 'fullName', 'email', 'temporaryPassword'], ...rows]);
    saveBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), 'imported-employee-credentials.csv');
  }

  private setFile(file: File): void {
    this.fileError.set('');
    if (!/\.csv$/i.test(file.name)) {
      this.fileError.set('Please choose a .csv file.');
      return;
    }
    if (file.size > MAX_BYTES) {
      this.fileError.set('The file is larger than 2 MB.');
      return;
    }
    this.file.set(file);
    this.result.set(null);
  }
}
