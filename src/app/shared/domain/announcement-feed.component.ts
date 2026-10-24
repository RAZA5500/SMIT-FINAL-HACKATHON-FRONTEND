import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { Announcement } from '../../core/models/api.models';
import { CommsService } from '../../core/services/comms.service';
import { listStagger } from '../animations';
import { AgoPipe } from '../pipes/format.pipes';
import { AvatarComponent, RoleBadgeComponent } from '../ui/badges';
import { EmptyStateComponent } from '../ui/empty-state.component';
import { Icons } from '../ui/icons';

/** Announcement feed for dashboards. Uses `items` when given, otherwise loads the latest itself. */
@Component({
  selector: 'app-announcement-feed',
  imports: [LucideAngularModule, RouterLink, AvatarComponent, RoleBadgeComponent, EmptyStateComponent, AgoPipe],
  animations: [listStagger],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="card flex h-full flex-col p-5">
      <header class="mb-4 flex items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <span class="grid h-9 w-9 place-items-center rounded-xl bg-amber-500/10 text-amber-600 ring-1 ring-inset ring-amber-500/25 dark:text-amber-400">
            <lucide-icon [img]="icons.Megaphone" [size]="17" />
          </span>
          <h3 class="section-title">Announcements</h3>
        </div>
        <a routerLink="/announcements" class="btn btn-ghost btn-sm">View all <lucide-icon [img]="icons.ArrowRight" [size]="14" /></a>
      </header>
      @if (loading()) {
        <div class="space-y-3">
          @for (i of [1, 2, 3]; track i) {
            <div class="skeleton h-16"></div>
          }
        </div>
      } @else if (list().length === 0) {
        <app-empty-state [compact]="true" art="megaphone" tone="amber" title="No announcements yet" description="Company news posted by Admin or HR will show up here." />
      } @else {
        <ul class="space-y-3" [@listStagger]="list().length">
          @for (a of list(); track a.id) {
            <li class="rounded-2xl border p-3.5 transition hover:shadow-md" [class]="a.pinned ? 'border-amber-300/60 bg-amber-50/60 dark:border-amber-500/30 dark:bg-amber-500/5' : 'border-slate-100 bg-white/60 dark:border-slate-800 dark:bg-slate-900/40'">
              <div class="flex items-start gap-3">
                <app-avatar [name]="a.createdByName" size="sm" />
                <div class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-center gap-1.5">
                    @if (a.pinned) {
                      <lucide-icon [img]="icons.Pin" [size]="13" class="text-amber-500" />
                    }
                    <p class="truncate text-sm font-semibold text-slate-900 dark:text-white">{{ a.title }}</p>
                  </div>
                  <p class="mt-1 line-clamp-2 text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">{{ a.body }}</p>
                  <p class="mt-2 flex items-center gap-2 text-[11px] text-slate-400">
                    <span class="font-medium text-slate-500 dark:text-slate-400">{{ a.createdByName }}</span>
                    <app-role-badge [role]="a.createdByRole" />
                    <span>· {{ a.createdAt | ago }}</span>
                  </p>
                </div>
              </div>
            </li>
          }
        </ul>
      }
    </section>
  `,
})
export class AnnouncementFeedComponent implements OnInit {
  private readonly comms = inject(CommsService);

  readonly items = input<Announcement[] | undefined>(undefined);
  readonly limit = input(4);

  protected readonly icons = Icons;
  private readonly loaded = signal<Announcement[]>([]);
  protected readonly loading = signal(false);
  protected readonly list = computed(() => (this.items() ?? this.loaded()).slice(0, this.limit()));

  ngOnInit(): void {
    if (this.items() !== undefined) return;
    this.loading.set(true);
    this.comms.announcements(1, this.limit()).subscribe({
      next: (res) => {
        this.loaded.set(res.data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
