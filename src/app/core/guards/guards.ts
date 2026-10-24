import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { Observable, catchError, map, of } from 'rxjs';
import { Role } from '../models/api.models';
import { AuthService } from '../services/auth.service';
import { SetupService } from '../services/setup.service';
import { ToastService } from '../services/toast.service';

/** Resolves the first-run flag, re-asking the server when it was unreachable at boot. */
function initializedFlag(): Observable<boolean | null> {
  const setup = inject(SetupService);
  const known = setup.initialized();
  return known === null ? setup.refresh() : of(known);
}

/** `/setup` is only reachable while the database is empty (`{ initialized: false }`). */
export const setupPendingGuard: CanActivateFn = () => {
  const router = inject(Router);
  return initializedFlag().pipe(
    map((initialized) => {
      if (initialized === null) return router.createUrlTree(['/unavailable']);
      return initialized ? router.createUrlTree(['/login']) : true;
    }),
  );
};

/** Every other screen requires a completed first-run setup. */
export const initializedGuard: CanActivateFn = () => {
  const router = inject(Router);
  return initializedFlag().pipe(
    map((initialized) => {
      if (initialized === null) return router.createUrlTree(['/unavailable']);
      return initialized ? true : router.createUrlTree(['/setup']);
    }),
  );
};

/** Requires a signed-in user (restores the profile from the token when needed). */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const toLogin = () => router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });

  if (!auth.token()) return toLogin();
  if (auth.user()) return true;
  return auth.me().pipe(
    map(() => true as const),
    catchError(() => {
      auth.clear();
      return of(toLogin());
    }),
  );
};

/** Signed-in users skip the login screen. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isLoggedIn()) return true;
  return router.createUrlTree([auth.mustChangePassword() ? '/change-password' : '/dashboard']);
};

/** First-login lock: a temporary password must be replaced before anything else. */
export const mustChangePasswordGuard: CanActivateFn = (): boolean | UrlTree => {
  const auth = inject(AuthService);
  return auth.mustChangePassword() ? inject(Router).createUrlTree(['/change-password']) : true;
};

/** Role-based access, e.g. `roleGuard(['Admin', 'HR'])`. */
export const roleGuard =
  (roles: Role[]): CanActivateFn =>
  () => {
    const auth = inject(AuthService);
    if (auth.hasRole(...roles)) return true;
    inject(ToastService).error('Access denied', `This area is available to ${roles.join(' & ')} only.`);
    return inject(Router).createUrlTree(['/dashboard']);
  };

/** Self-service screens need a login linked to an employee profile. */
export const employeeProfileGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  if (auth.hasEmployeeProfile()) return true;
  inject(ToastService).info('No employee profile', 'This login is not linked to an employee profile.');
  return inject(Router).createUrlTree(['/dashboard']);
};
