import { ChangeDetectionStrategy, Component, OnInit, computed, inject, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, LucideIconData } from 'lucide-angular';
import { catchError, forkJoin, map, of } from 'rxjs';
import { EmployeeService } from '../../core/services/employee.service';
import { OrgService } from '../../core/services/org.service';
import { PolicyStore } from '../../core/services/policy.store';
import { UsersService } from '../../core/services/users.service';
import { listStagger } from '../../shared/animations';
import { Icons } from '../../shared/ui/icons';
import { ProgressRingComponent } from '../../shared/ui/progress';

interface SetupStep {
  id: string;
  title: string;
  text: string;
  done: boolean;
  optional?: boolean;
  icon: LucideIconData;
  link: string;
  query?: Record<string, string>;
  cta: string;
}

/** Guided first-run checklist on the Admin dashboard — disappears once the organisation is ready. */
@Component({
  selector: 'app-getting-started',
  imports: [LucideAngularModule, RouterLink, ProgressRingComponent],
  animations: [listStagger],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (steps(); as list) {
      @if (!allDone()) {
        <section class="card relative mb-6 overflow-hidden p-5 sm:p-6">
          <div class="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl"></div>
          <div class="relative flex flex-col gap-5 md:flex-row md:items-center">
            <app-progress-ring [value]="progress()" [size]="96" [stroke]="9" tone="emerald">
              <div>
                <p class="text-xl font-extrabold text-slate-900 dark:text-white">{{ doneCount() }}/{{ list.length }}</p>
                <p class="text-[10px] text-slate-500">steps</p>
              </div>
            </app-progress-ring>
            <div class="flex-1">
              <p class="eyebrow text-emerald-600 dark:text-emerald-400">Getting started</p>
              <h2 class="mt-1 text-xl font-extrabold text-slate-900 dark:text-white">Set up {{ policies.companyName() }} in a few minutes</h2>
              <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Your database is empty — follow these steps so HR can start registering employees.</p>
            </div>
          </div>
          <ol class="relative mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3" [@listStagger]="list.length">
            @for (s of list; track s.id; let i = $index) {
              <li class="flex items-start gap-3 rounded-2xl border p-3.5 transition" [class]="s.done ? 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-500/20 dark:bg-emerald-500/5' : 'border-slate-200 bg-white/70 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/50'">
                <span class="grid h-9 w-9 shrink-0 place-items-center rounded-xl" [class]="s.done ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'">
                  <lucide-icon [img]="s.done ? icons.Check : s.icon" [size]="16" [strokeWidth]="s.done ? 3 : 2" />
                </span>
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-semibold" [class]="s.done ? 'text-emerald-800 line-through decoration-emerald-400/60 dark:text-emerald-300' : 'text-slate-900 dark:text-white'">
                    {{ i + 1 }}. {{ s.title }}
                    @if (s.optional) {
                      <span class="ml-1 text-[10px] font-medium uppercase text-slate-400">optional</span>
                    }
                  </p>
                  <p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{{ s.text }}</p>
                  @if (!s.done && s.link) {
                    <a [routerLink]="s.link" [queryParams]="s.query" class="mt-2 inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline dark:text-emerald-400">
                      {{ s.cta }} <lucide-icon [img]="icons.ArrowRight" [size]="12" />
                    </a>
                  }
                </div>
              </li>
            }
          </ol>
        </section>
      }
    }
  `,
})
export class GettingStartedComponent implements OnInit {
  private readonly org = inject(OrgService);
  private readonly users = inject(UsersService);
  private readonly employees = inject(EmployeeService);
  protected readonly policies = inject(PolicyStore);
  protected readonly icons = Icons;

  readonly completed = output<boolean>();
  protected readonly steps = signal<SetupStep[] | null>(null);

  protected readonly doneCount = computed(() => (this.steps() ?? []).filter((s) => s.done).length);
  protected readonly progress = computed(() => this.doneCount() / Math.max(1, this.steps()?.length ?? 1));
  protected readonly allDone = computed(() => (this.steps() ?? []).filter((s) => !s.optional).every((s) => s.done));

  ngOnInit(): void {
    const year = Number(this.policies.today().slice(0, 4));
    forkJoin({
      settings: this.org.getSettings().pipe(map((s) => s.officeLocation.lat !== null && s.officeLocation.lng !== null), catchError(() => of(false))),
      departments: this.org.departments(true).pipe(map((d) => d.length), catchError(() => of(0))),
      designations: this.org.designations(true).pipe(map((d) => d.length), catchError(() => of(0))),
      holidays: this.org.holidays({ year }).pipe(map((h) => h.length), catchError(() => of(0))),
      hr: this.users.list({ role: 'HR', limit: 1 }).pipe(map((r) => r.meta.total), catchError(() => of(0))),
      employees: this.employees.list({ limit: 1 }).pipe(map((r) => r.meta.total), catchError(() => of(0))),
    }).subscribe((c) => {
      const steps: SetupStep[] = [
        { id: 'company', title: 'Company profile & rules', text: 'Work hours, grace period and weekend saved.', done: true, icon: Icons.Building2, link: '', cta: '' },
        { id: 'geo', title: 'Office geofence', text: 'Needed for camera + GPS check-in.', done: c.settings, icon: Icons.MapPin, link: '/organization', query: { tab: 'rules' }, cta: 'Set office location' },
        { id: 'dept', title: 'Create departments', text: 'e.g. Engineering, Finance, Operations.', done: c.departments > 0, icon: Icons.Network, link: '/organization', query: { tab: 'departments' }, cta: 'Create first department' },
        { id: 'desig', title: 'Create designations', text: 'Job titles such as Software Engineer.', done: c.designations > 0, icon: Icons.Award, link: '/organization', query: { tab: 'designations' }, cta: 'Add designations' },
        { id: 'holidays', title: 'Add public holidays', text: 'Skipped automatically in leave & payroll.', done: c.holidays > 0, optional: true, icon: Icons.PartyPopper, link: '/organization', query: { tab: 'holidays' }, cta: 'Add holidays' },
        { id: 'hr', title: 'Create an HR login', text: 'HR registers employees and runs payroll.', done: c.hr > 0, icon: Icons.UserPlus, link: '/users', query: { action: 'create-hr' }, cta: 'Create HR login' },
        { id: 'employees', title: 'Employees registered', text: 'HR adds people one by one or via CSV import.', done: c.employees > 0, icon: Icons.Users, link: '/employees', cta: 'View directory' },
      ];
      this.steps.set(steps);
      this.completed.emit(steps.filter((s) => !s.optional).every((s) => s.done));
    });
  }
}
