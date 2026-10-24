import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Announcement, AnnouncementPayload, AppNotification, Paginated } from '../models/api.models';
import { SILENT_ERRORS, toParams } from '../utils/http';

const API = environment.apiUrl;

/** M9 — announcements and in-app notifications. */
@Injectable({ providedIn: 'root' })
export class CommsService {
  private readonly http = inject(HttpClient);

  announcements(page = 1, limit = 10): Observable<Paginated<Announcement>> {
    return this.http.get<Paginated<Announcement>>(`${API}/announcements`, { params: toParams({ page, limit }) });
  }

  createAnnouncement(payload: AnnouncementPayload): Observable<Announcement> {
    return this.http.post<Announcement>(`${API}/announcements`, payload);
  }

  updateAnnouncement(id: string, payload: Partial<AnnouncementPayload>): Observable<Announcement> {
    return this.http.patch<Announcement>(`${API}/announcements/${id}`, payload);
  }

  deleteAnnouncement(id: string): Observable<{ deleted: true }> {
    return this.http.delete<{ deleted: true }>(`${API}/announcements/${id}`);
  }

  notifications(query: { page?: number; limit?: number; unreadOnly?: boolean } = {}): Observable<Paginated<AppNotification>> {
    return this.http.get<Paginated<AppNotification>>(`${API}/notifications`, { params: toParams(query) });
  }

  unreadCount(): Observable<{ unread: number }> {
    return this.http.get<{ unread: number }>(`${API}/notifications/unread-count`, {
      context: new HttpContext().set(SILENT_ERRORS, true),
    });
  }

  markRead(id: string): Observable<AppNotification> {
    return this.http.patch<AppNotification>(`${API}/notifications/${id}/read`, {});
  }

  markAllRead(): Observable<{ updated: number }> {
    return this.http.patch<{ updated: number }>(`${API}/notifications/read-all`, {});
  }
}
