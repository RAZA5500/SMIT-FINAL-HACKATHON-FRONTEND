import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../core/services/auth.service';
import { fadeInUp } from '../../shared/animations';
import { Icons } from '../../shared/ui/icons';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { SegmentedTabsComponent, TabItem } from '../../shared/ui/segmented-tabs.component';
import { CompanyRulesTabComponent } from './company-rules-tab.component';
import { DepartmentsTabComponent } from './departments-tab.component';
import { DesignationsTabComponent } from './designations-tab.component';
import { HolidaysTabComponent } from './holidays-tab.component';
import { LeaveQuotasTabComponent } from './leave-quotas-tab.component';

type OrgTab = 'rules' | 'departments' | 'designations' | 'leave' | 'holidays';
const TABS: OrgTab[] = ['rules', 'departments', 'designations', 'leave', 'holidays'];

/** M2 — organisation setup (Admin manages; HR views). */
@Component({
  selector: 'app-organization',
  imports: [
    LucideAngularModule,
    PageHeaderComponent,
    SegmentedTabsComponent,
    CompanyRulesTabComponent,
    DepartmentsTabComponent,
    DesignationsTabComponent,
    LeaveQuotasTabComponent,
    HolidaysTabComponent,
  ],
  animations: [fadeInUp],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header
      title="Organization"
      [subtitle]="auth.isAdmin() ? 'Company rules, geofence and the building blocks every other module uses.' : 'Company rules and structure configured by your Admin.'"
    >
      @if (!auth.isAdmin()) {
        <span class="badge bg-slate-100 py-1 text-slate-600 ring-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
          <lucide-icon [img]="icons.Eye" [size]="12" /> View only
        </span>
      }
    </app-page-header>

    <div class="mb-6">
      <app-segmented-tabs [tabs]="tabs" [active]="tab()" (activeChange)="select($any($event))" />
    </div>

    @switch (tab()) {
      @case ('rules') {
        <app-company-rules-tab @fadeInUp [canEdit]="canEdit()" />
      }
      @case ('departments') {
        <app-departments-tab @fadeInUp [canEdit]="canEdit()" />
      }
      @case ('designations') {
        <app-designations-tab @fadeInUp [canEdit]="canEdit()" />
      }
      @case ('leave') {
        <app-leave-quotas-tab @fadeInUp [canEdit]="canEdit()" />
      }
      @case ('holidays') {
        <app-holidays-tab @fadeInUp [canEdit]="canEdit()" />
      }
    }
  `,
})
export class OrganizationComponent {
  protected readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly icons = Icons;

  protected readonly tabs: TabItem[] = [
    { id: 'rules', label: 'Company Rules & Geofence', icon: Icons.Settings2 },
    { id: 'departments', label: 'Departments', icon: Icons.Network },
    { id: 'designations', label: 'Designations', icon: Icons.Award },
    { id: 'leave', label: 'Leave Quotas', icon: Icons.TreePalm },
    { id: 'holidays', label: 'Public Holidays', icon: Icons.PartyPopper },
  ];

  protected readonly tab = signal<OrgTab>('rules');
  protected readonly canEdit = computed(() => this.auth.isAdmin());

  constructor() {
    const initial = this.route.snapshot.queryParamMap.get('tab') as OrgTab | null;
    if (initial && TABS.includes(initial)) this.tab.set(initial);
    effect(() => {
      const tab = this.tab();
      void this.router.navigate([], { relativeTo: this.route, queryParams: { tab }, queryParamsHandling: 'merge', replaceUrl: true });
    });
  }

  protected select(tab: OrgTab): void {
    this.tab.set(tab);
  }
}
