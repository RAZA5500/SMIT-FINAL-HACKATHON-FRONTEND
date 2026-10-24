import { Routes } from '@angular/router';
import {
  authGuard,
  employeeProfileGuard,
  guestGuard,
  initializedGuard,
  mustChangePasswordGuard,
  roleGuard,
  setupPendingGuard,
} from './core/guards/guards';
import { ShellComponent } from './layout/shell.component';

export const routes: Routes = [
  // ── First run & authentication ─────────────────────────
  {
    path: 'setup',
    title: 'First-run setup',
    canActivate: [setupPendingGuard],
    loadComponent: () => import('./features/setup/setup-wizard.component').then((m) => m.SetupWizardComponent),
  },
  {
    path: 'login',
    title: 'Sign in',
    canActivate: [initializedGuard, guestGuard],
    loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'change-password',
    title: 'Change password',
    canActivate: [initializedGuard, authGuard],
    loadComponent: () => import('./features/auth/change-password.component').then((m) => m.ChangePasswordComponent),
  },
  {
    path: 'unavailable',
    title: 'Server unavailable',
    loadComponent: () => import('./features/auth/unavailable.component').then((m) => m.UnavailableComponent),
  },

  // ── Signed-in app ──────────────────────────────────────
  {
    path: '',
    component: ShellComponent,
    canActivate: [initializedGuard, authGuard, mustChangePasswordGuard],
    canActivateChild: [mustChangePasswordGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        title: 'Dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'profile',
        title: 'My Profile',
        canActivate: [employeeProfileGuard],
        loadComponent: () => import('./features/employees/employee-360.component').then((m) => m.Employee360Component),
      },
      {
        path: 'employees',
        title: 'Employees',
        canActivate: [roleGuard(['Admin', 'HR'])],
        loadComponent: () => import('./features/employees/employees.component').then((m) => m.EmployeesComponent),
      },
      {
        path: 'employees/:id',
        title: 'Employee 360',
        canActivate: [roleGuard(['Admin', 'HR'])],
        loadComponent: () => import('./features/employees/employee-360.component').then((m) => m.Employee360Component),
      },
      {
        path: 'attendance',
        title: 'Attendance',
        loadComponent: () => import('./features/attendance/attendance.component').then((m) => m.AttendanceComponent),
      },
      {
        path: 'leave',
        title: 'Leave',
        loadComponent: () => import('./features/leave/leave.component').then((m) => m.LeaveComponent),
      },
      {
        path: 'payroll',
        title: 'Payroll',
        loadComponent: () => import('./features/payroll/payroll.component').then((m) => m.PayrollComponent),
      },
      {
        path: 'announcements',
        title: 'Announcements',
        loadComponent: () => import('./features/announcements/announcements.component').then((m) => m.AnnouncementsComponent),
      },
      {
        path: 'organization',
        title: 'Organization',
        canActivate: [roleGuard(['Admin', 'HR'])],
        loadComponent: () => import('./features/organization/organization.component').then((m) => m.OrganizationComponent),
      },
      {
        path: 'users',
        title: 'Logins & Access',
        canActivate: [roleGuard(['Admin'])],
        loadComponent: () => import('./features/users/users.component').then((m) => m.UsersComponent),
      },
      {
        path: 'audit-logs',
        title: 'Audit Log',
        canActivate: [roleGuard(['Admin'])],
        loadComponent: () => import('./features/audit/audit-logs.component').then((m) => m.AuditLogsComponent),
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
