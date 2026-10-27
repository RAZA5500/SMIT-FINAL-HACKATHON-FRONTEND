import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { Announcement, PageMeta } from '../../core/models/api.models';
import { AuthService } from '../../core/services/auth.service';
import { CommsService } from '../../core/services/comms.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { ToastService } from '../../core/services/toast.service';
import { apiErrorMessage } from '../../core/utils/http';
import { listStagger } from '../../shared/animations';
import { FORMAT_PIPES } from '../../shared/pipes/format.pipes';
import { AvatarComponent, RoleBadgeComponent } from '../../shared/ui/badges';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';
import { FieldErrorComponent } from '../../shared/ui/field-error.component';
import { Icons } from '../../shared/ui/icons';
import { ModalComponent } from '../../shared/ui/modal.component';
import { PageHeaderComponent } from '../../shared/ui/page-header.component';
import { PaginationComponent } from '../../shared/ui/pagination.component';

@Component({
  selector: 'app-announcements',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    LucideAngularModule,
    PageHeaderComponent,
    EmptyStateComponent,
    AvatarComponent,
    RoleBadgeComponent,
    ModalComponent,
    FieldErrorComponent,
    PaginationComponent,
    FORMAT_PIPES,
  ],
  animations: [listStagger],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header
      title="Company Announcements"
      subtitle="Broadcast news, policy updates, company milestones and holiday notices to the entire team."
    >
      <div header-actions class="flex flex-wrap items-center gap-2">
        @if (auth.isManager()) {
          <button type="button" class="btn btn-primary" (click)="openCreateModal()">
            <lucide-icon [img]="icons.Plus" [size]="16" /> Post announcement
          </button>
        }
      </div>
    </app-page-header>

    <div class="space-y-6">
      @if (loading()) {
        <div class="space-y-4">
          @for (i of [1, 2, 3]; track i) {
            <div class="skeleton h-32 rounded-xl"></div>
          }
        </div>
      } @else if (announcements().length === 0) {
        <app-empty-state
          art="megaphone"
          title="No announcements yet"
          description="Leadership or HR has not posted any announcements. Check back later for company updates."
        >
          @if (auth.isManager()) {
            <button type="button" class="btn btn-primary mt-4" (click)="openCreateModal()">
              <lucide-icon [img]="icons.Plus" [size]="16" /> Post First Announcement
            </button>
          }
        </app-empty-state>
      } @else {
        <div class="space-y-4" [@listStagger]="announcements().length">
          @for (a of announcements(); track a.id) {
            <article
              class="card card-hover relative overflow-hidden p-6 transition"
              [class]="a.pinned ? 'border-slate-300 dark:border-slate-600' : ''"
            >
              @if (a.pinned) {
                <div class="mb-3 flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <lucide-icon [img]="icons.Pin" [size]="13" /> Pinned announcement
                </div>
              }

              <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div class="min-w-0 flex-1">
                  <h3 class="text-base font-semibold text-slate-900 dark:text-white">{{ a.title }}</h3>
                  <div class="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300 whitespace-pre-line">
                    {{ a.body }}
                  </div>

                  <div class="mt-4 flex flex-wrap items-center gap-2.5 text-xs text-slate-400">
                    <app-avatar [name]="a.createdByName" size="xs" />
                    <span class="font-semibold text-slate-700 dark:text-slate-300">{{ a.createdByName }}</span>
                    <app-role-badge [role]="a.createdByRole" />
                    <span>·</span>
                    <span [title]="a.createdAt | stamp">{{ a.createdAt | ago }}</span>
                  </div>
                </div>

                @if (auth.isManager()) {
                  <div class="flex items-center gap-1 self-end sm:self-start">
                    <button type="button" class="btn btn-ghost btn-icon" (click)="openEditModal(a)" title="Edit Announcement">
                      <lucide-icon [img]="icons.Pencil" [size]="15" />
                    </button>
                    <button type="button" class="btn btn-ghost btn-icon text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10" (click)="deleteAnnouncement(a)" title="Delete Announcement">
                      <lucide-icon [img]="icons.Trash2" [size]="15" />
                    </button>
                  </div>
                }
              </div>
            </article>
          }
        </div>

        <div class="mt-6">
          <app-pagination [meta]="meta()" (pageChange)="onPageChange($event)" />
        </div>
      }
    </div>

    <!-- Create / Edit Modal -->
    <app-modal
      [open]="modalOpen()"
      [title]="editingId() ? 'Edit Announcement' : 'Post Announcement'"
      [subtitle]="editingId() ? 'Update the content or pin status of this notice.' : 'Broadcast a new notice to all employees across the organization.'"
      tone="amber"
      [icon]="icons.Megaphone"
      (closed)="modalOpen.set(false)"
    >
      <form [formGroup]="form" (ngSubmit)="submitForm()" class="space-y-4">
        <div>
          <label class="label" for="ann-title">Title</label>
          <input id="ann-title" type="text" class="input" formControlName="title" placeholder="e.g. Eid-ul-Fitr Holiday Schedule & Office Timings" />
          <app-field-error [control]="form.controls['title']" label="Title" [show]="submitted()" />
        </div>

        <div>
          <label class="label" for="ann-body">Announcement Body</label>
          <textarea
            id="ann-body"
            rows="5"
            class="input resize-none"
            formControlName="body"
            placeholder="Write the full announcement text here..."
          ></textarea>
          <app-field-error [control]="form.controls['body']" label="Body" [show]="submitted()" />
        </div>

        <div class="flex items-center gap-2 pt-1">
          <input
            id="ann-pinned"
            type="checkbox"
            class="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600/40 dark:border-slate-700 dark:bg-slate-800"
            formControlName="pinned"
          />
          <label for="ann-pinned" class="text-sm font-medium text-slate-700 dark:text-slate-300">
            Pin to top of feed and dashboard
          </label>
        </div>

        @if (error()) {
          <p class="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
            {{ error() }}
          </p>
        }

        <div modal-footer class="flex justify-end gap-2 border-t border-slate-200 px-5 py-4 dark:border-slate-800 sm:px-6">
          <button type="button" class="btn btn-secondary" (click)="modalOpen.set(false)">Cancel</button>
          <button type="submit" class="btn btn-primary" [disabled]="submitting()">
            <lucide-icon [img]="submitting() ? icons.LoaderCircle : icons.Send" [size]="16" [class.animate-spin]="submitting()" />
            {{ editingId() ? 'Save Changes' : 'Post Announcement' }}
          </button>
        </div>
      </form>
    </app-modal>
  `,
})
export class AnnouncementsComponent implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly comms = inject(CommsService);
  private readonly fb = inject(FormBuilder);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  protected readonly icons = Icons;

  protected readonly announcements = signal<Announcement[]>([]);
  protected readonly meta = signal<PageMeta | null>(null);
  protected readonly loading = signal(false);
  protected readonly currentPage = signal(1);

  // Modal State
  protected readonly modalOpen = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly submitted = signal(false);
  protected readonly submitting = signal(false);
  protected readonly error = signal('');

  protected readonly form: FormGroup = this.fb.group({
    title: ['', Validators.required],
    body: ['', Validators.required],
    pinned: [false],
  });

  ngOnInit(): void {
    this.loadAnnouncements();
  }

  protected loadAnnouncements(page = this.currentPage()): void {
    this.loading.set(true);
    this.comms.announcements(page, 10).subscribe({
      next: (res) => {
        this.announcements.set(res.data);
        this.meta.set(res.meta);
        this.currentPage.set(res.meta.page);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error('Failed to load announcements', apiErrorMessage(err));
      },
    });
  }

  protected onPageChange(page: number): void {
    this.loadAnnouncements(page);
  }

  protected openCreateModal(): void {
    this.editingId.set(null);
    this.submitted.set(false);
    this.error.set('');
    this.form.reset({ title: '', body: '', pinned: false });
    this.modalOpen.set(true);
  }

  protected openEditModal(a: Announcement): void {
    this.editingId.set(a.id);
    this.submitted.set(false);
    this.error.set('');
    this.form.patchValue({
      title: a.title,
      body: a.body,
      pinned: a.pinned,
    });
    this.modalOpen.set(true);
  }

  protected submitForm(): void {
    this.submitted.set(true);
    if (this.form.invalid) return;

    this.submitting.set(true);
    this.error.set('');
    const val = this.form.value;

    const editId = this.editingId();
    if (editId) {
      this.comms.updateAnnouncement(editId, val).subscribe({
        next: () => {
          this.submitting.set(false);
          this.modalOpen.set(false);
          this.toast.success('Announcement updated');
          this.loadAnnouncements();
        },
        error: (err) => {
          this.submitting.set(false);
          this.error.set(apiErrorMessage(err));
        },
      });
    } else {
      this.comms.createAnnouncement(val).subscribe({
        next: () => {
          this.submitting.set(false);
          this.modalOpen.set(false);
          this.toast.success('Announcement posted');
          this.loadAnnouncements(1);
        },
        error: (err) => {
          this.submitting.set(false);
          this.error.set(apiErrorMessage(err));
        },
      });
    }
  }

  protected async deleteAnnouncement(a: Announcement): Promise<void> {
    const ok = await this.confirm.confirm({
      title: `Delete announcement "${a.title}"?`,
      message: 'This will remove the announcement for all employees across the organization.',
      confirmText: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;

    this.comms.deleteAnnouncement(a.id).subscribe({
      next: () => {
        this.toast.success('Announcement deleted');
        this.loadAnnouncements();
      },
      error: (err) => this.toast.error('Delete failed', apiErrorMessage(err)),
    });
  }
}
