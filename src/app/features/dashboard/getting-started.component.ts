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
        <section class="card mb-6 p-5 sm:p-6">
          <div class="flex flex-col gap-4 md:flex-row md:items-center">
            <app-progress-ring [value]="progress()" [size]="64" [stroke]="6" tone="emerald">
              <p class="num text-sm font-semibold text-slate-900 dark:text-white">{{ doneCount() }}/{{ list.length }}</p>
            </app-progress-ring>
            <div class="flex-1">
              <p class="eyebrow">Getting started</p>
              <h2 class="mt-0.5 text-base font-semibold text-slate-900 dark:text-white">Set up {{ policies.companyName() }} in a few minutes</h2>
              <p class="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{{ intro() }}</p>
            </div>
          </div>
          <ol class="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3" [@listStagger]="list.length">
            @for (s of list; track s.id; let i = $index) {
              <li class="group flex items-start gap-3 rounded-xl border p-4 transition-all duration-300 ease-spring" [class]="s.done ? 'border-slate-200/70 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-950/40' : 'border-blue-200/80 bg-gradient-to-br from-blue-50/80 to-white shadow-xs hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-lift dark:border-blue-500/25 dark:from-blue-500/10 dark:to-slate-900 dark:hover:border-blue-500/40'">
                <span class="grid h-7 w-7 shrink-0 place-items-center rounded-full" [class]="s.done ? 'bg-blue-600 text-white dark:bg-blue-500 dark:text-slate-950' : 'bg-white text-blue-600 shadow-xs ring-1 ring-inset ring-blue-200 transition-transform duration-300 group-hover:scale-110 dark:bg-slate-900 dark:text-blue-400 dark:ring-blue-500/30'">
                  <lucide-icon [img]="s.done ? icons.Check : s.icon" [size]="14" [strokeWidth]="s.done ? 3 : 2" />
                </span>
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-medium" [class]="s.done ? 'text-slate-500 dark:text-slate-400' : 'text-slate-900 dark:text-white'">
                    {{ s.title }}
                    @if (s.optional) {
                      <span class="ml-1 text-xs font-normal text-slate-400">Optional</span>
                    }
                    @if (s.done) {
                      <span class="sr-only">(done)</span>
                    }
                  </p>
                  <p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{{ s.text }}</p>
                  @if (!s.done && s.link) {
                    <a [routerLink]="s.link" [queryParams]="s.query" class="mt-2.5 inline-flex items-center gap-1 rounded-full bg-blue-600 px-2.5 py-1 text-xs font-medium text-white shadow-glow-brand transition-all hover:gap-1.5 hover:bg-blue-700 dark:bg-blue-500 dark:text-slate-950">
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
  /** Copy follows progress: only a fresh install is told the database is empty. */
  protected readonly intro = computed(() => {
    const left = (this.steps() ?? []).filter((s) => !s.done && !s.optional).length;
    if (this.doneCount() <= 1) return 'Your database is empty — follow these steps so HR can start registering employees.';
    return left === 1 ? 'One step left — everything else is ready.' : `${left} steps left — pick up where you left off.`;
  });

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
