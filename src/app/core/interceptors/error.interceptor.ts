import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';
import { SILENT_ERRORS, apiErrorBody, apiErrorMessage } from '../utils/http';

/**
 * Global HTTP error handling:
 * - 401 → session expired: clear the session and go to /login
 * - 403 PASSWORD_CHANGE_REQUIRED → lock the user on /change-password
 * - network / 403 / 429 / 5xx → toast
 * Business errors (400, 404, 409, 422) are left to the calling screen, which shows them in context.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const toast = inject(ToastService);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse)) return throwError(() => error);
      const silent = req.context.get(SILENT_ERRORS);
      const isLogin = req.url.endsWith('/auth/login');

      if (error.status === 401 && !isLogin) {
        if (auth.token()) {
          auth.clear();
          toast.warning('Session ended', 'Please sign in again.');
          void router.navigate(['/login'], { queryParams: { returnUrl: router.url.startsWith('/login') ? undefined : router.url } });
        }
        return throwError(() => error);
      }

      if (error.status === 403 && apiErrorBody(error)?.code === 'PASSWORD_CHANGE_REQUIRED') {
        void router.navigate(['/change-password']);
        return throwError(() => error);
      }

      if (silent) return throwError(() => error);

      if (error.status === 0) {
        toast.error('Server unreachable', 'Cannot reach the HCM Lite API. Check that the backend is running.');
      } else if (error.status === 403 && !isLogin) {
        toast.error('Access denied', apiErrorMessage(error));
      } else if (error.status === 429) {
        toast.warning('Slow down', apiErrorMessage(error, 'Too many requests — please wait a moment.'));
      } else if (error.status >= 500) {
        toast.error('Server error', apiErrorMessage(error, 'The server could not complete the request.'));
      }
      return throwError(() => error);
    }),
  );
};
