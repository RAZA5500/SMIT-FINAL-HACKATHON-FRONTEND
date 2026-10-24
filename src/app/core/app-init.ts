import { Injectable, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { catchError, firstValueFrom, map, of, switchMap, timeout } from 'rxjs';
import { AuthService } from './services/auth.service';
import { SetupService } from './services/setup.service';

/**
 * App initializer: asks the server whether first-run setup is done (GET /api/setup/status)
 * and restores a saved session from its token before the first route is resolved.
 */
export function bootstrapSession(): Promise<unknown> {
  const setup = inject(SetupService);
  const auth = inject(AuthService);
  return firstValueFrom(
    setup.refresh().pipe(
      switchMap((initialized) => {
        if (initialized === false) {
          auth.clear(); // a fresh database invalidates any stored session
          return of(null);
        }
        if (!initialized || !auth.token()) return of(null);
        return auth.me().pipe(
          map(() => null),
          catchError(() => {
            auth.clear();
            return of(null);
          }),
        );
      }),
      timeout(15_000),
      catchError(() => of(null)),
    ),
  );
}

/** "<Page> · HCM Lite" document titles. */
@Injectable({ providedIn: 'root' })
export class HcmTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const page = this.buildTitle(snapshot);
    this.title.setTitle(page ? `${page} · HCM Lite` : 'HCM Lite — AI-assisted HR');
  }
}
