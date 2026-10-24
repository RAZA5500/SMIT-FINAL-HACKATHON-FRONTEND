# Role & Objective
You are a Principal Angular UI/UX Architect. Build a visually stunning, highly interactive, micro-interaction-rich, responsive Web Frontend (375px+ mobile up to widescreen desktop) in **Angular (v17/18+ Standalone Components & Signals)** for **"HCM Lite" — an AI-assisted Human Capital Management System** for `Admin`, `HR`, and `Employee` roles.

## 1. Angular Architecture & Tech Stack
- **Core Angular**: Standalone Components, Angular **Signals** (`signal`, `computed`, `effect`) for ultra-reactive UI state, `@angular/router` with functional guards (`CanActivateFn`), reactive forms (`FormBuilder`, custom validators), and functional HTTP Interceptors (`HttpInterceptorFn` for JWT injection and global error handling).
- **UI, Styling & Animations**:
  - **Tailwind CSS** + `@angular/animations` (smooth route transitions, staggered list entrances, slide-over drawers, and animated KPI counters).
  - **Charts**: `ng2-charts` (Chart.js) or `ng-apexcharts` with custom gradients, interactive tooltips, and live filter updates.
  - **Icons**: `lucide-angular`.
  - **Camera Face Detection (Bonus)**: `@vladmandic/face-api` or `@mediapipe/tasks-vision` bound to an Angular `@ViewChild('videoElement')` + Browser `navigator.geolocation` API.
  - **PWA & Dark Mode (Bonus)**: `@angular/pwa` service worker + manifest configuration, and a reactive `ThemeService` using Signals for instant Dark/Light mode switching with glassmorphism (`backdrop-blur-md`) cards.
- **Visual Color System (Inspired by the HCM Lite Brief Cover)**:
  - **Emerald/Teal (`#10B981` / `#0D9488`)**: Present status, Check-in CTA, HR role badge, primary success states.
  - **AI Royal Violet (`#7C3AED` / `#8B5CF6`)**: AI Assistant drawer, "Summarize with AI" buttons, Smart Leave magic bar, and `AI-generated` badges.
  - **Warm Amber (`#F59E0B`)**: On-Leave status, Employee role badge, Attendance Trend line chart, pending approvals.
  - **Deep Navy / Slate (`#0F172A` / `#1E293B`)**: Admin role badge, sidebar navigation, and sleek Dark Mode surfaces.
  - **Electric Blue (`#3B82F6`) & Rose (`#F43F5E`)**: Late indicators (`#3B82F6`), Absent/Rejection/Anomaly alerts (`#F43F5E`).

---

## 2. Critical Hackathon Rule: Zero Dummy Data & Guided Empty States
- **NO hardcoded or mock numbers anywhere.** The app starts on a completely empty database.
- **Interactive Empty States**: Because judges test from a fresh install, build a reusable `<app-empty-state>` component with custom SVG artwork, clear guidance, and a direct CTA button (e.g., *"No departments created yet -> [ + Create First Department ]"*, *"No employees registered -> [ + Register Employee ] or [ Import CSV ]"*).
- **App Initializer & First-Run Flow**:
  - Use `APP_INITIALIZER` or a root guard calling `GET /api/setup/status`.
  - If `{ initialized: false }`, route immediately to an interactive **Multi-Step First-Run Onboarding Wizard (`/setup`)**:
    1. Company Profile & Work Hours (`09:00` start, `15m` grace, `<5h` half-day, `Sat-Sun` weekend).
    2. Office Geofence Setup (Interactive "Use My Current GPS Location" button that auto-fills `lat`/`lng` + radius slider defaulted to `150m`).
    3. Create Master `Admin` Account.
  - **First-Login Password Guard (`mustChangePasswordGuard`)**: If a newly registered employee signs in with a temporary password (`user.mustChangePassword === true`), lock navigation to `/change-password` with an interactive password-strength meter until updated.

---

## 3. Strict Role-Based Access Guards & Navigation
Implement functional route guards (`roleGuard(['Admin'])`, `roleGuard(['Admin', 'HR'])`, etc.) and a role-adaptive `<app-sidebar>` and `<app-topbar>`:

### Admin (Company Level)
- **Manage**: First-run setup; Company settings (`09:00` start, `15m` grace, `<5h` half-day, `Sat-Sun` weekend, office GPS `lat`/`lng` & `150m` radius, Bonus `3 lates = 0.5 day` penalty toggle); Departments, Designations, Leave Types & Quotas (`Annual: 14`, `Sick: 8`, `Casual: 10`, `Unpaid: unlimited`), Public Holidays; Create `HR` logins, deactivate or reset any login; Finalize/lock monthly payroll prepared by HR; Post announcements.
- **View (Read-Only)**: All Employees directory & Employee 360 profile, all Attendance boards/calendars & corrections, all Leave requests, Salary structures, Monthly Payroll drafts, all Payslip PDFs, and the immutable **Audit Log** (`actor`, `action`, `entity`, `before/after JSON` diff viewer).
- **Cannot**: Edit a payroll run after it is finalized; delete or change audit log entries.

### HR (People Operations)
- **Manage**: Register employees with job details & salary (creates their login with temporary password), edit details; CSV Import (with **Dry-Run validation preview table** showing `row`, `field`, `reason`) & CSV Export; Set salary structures (`Basic`, `40% HRA`, `10% Medical`, `1.5x Gross`); Approve/reject attendance corrections; Approve/reject leave requests with comment; Create/review monthly payroll draft; Post announcements.
- **View (Read-Only)**: Company settings & Org setup; All Employees directory & 360 profiles; Daily Attendance board & calendar; All Payslip PDFs.
- **Own Self-Service**: Web/Camera check-in & check-out, apply/cancel own leave, Smart Leave input, own notifications.
- **Cannot**: Change company settings, rules, or office location; create Admin users or finalize payroll; view the audit log.

### Employee (Self-Service)
- **Own Access Only**: Web/Camera check-in & check-out; Own attendance calendar & request correction with reason; Apply/cancel leave, see balance, use **Smart Leave** natural language bar; Download own payslip PDFs; View own Employee 360 profile & edit ONLY own `phone` and `address`; Read announcements & own in-app notifications.
- **Cannot**: See any other employee's data or salary; approve anything, or edit own salary, role, or attendance directly.

---

## 4. Screen-by-Screen Interactive Angular Specifications (9 Modules)

### M1 & M2: Auth & Organization Setup (`/setup`, `/login`, `/organization`)
- Animated segmented tabs in `/organization` for `Company Rules & Geofence`, `Departments`, `Designations`, `Leave Quotas`, and `Public Holidays`.
- Reactive forms for `Admin`; read-only badges for `HR`.

### M3: Employees Directory, Interactive CSV Dry-Run & Employee 360 (`/employees`)
- **Directory**: RxJS `debounceTime(300)` search bar, Department/Designation/Status filter pills, server-side pagination, and Grid/Table view toggle.
- **CSV Import Stepper Modal (HR)**:
  - Drag-and-drop `.csv` upload -> calls `POST /api/employees/import?dryRun=true`.
  - Displays a live **Validation Scorecard**: green counter for valid rows, red table for invalid rows showing exact `Row #`, `Field`, and `Reason` (missing required field, duplicate code/email, invalid email, unknown dept, invalid ISO date, `salary <= 0`).
  - "Commit Import" button unlocks only when dry-run passes.
- **Employee 360 Slide-Over / Page (`/employees/:id`)**:
  - Header with status badge, Bonus **Attrition Risk Score gauge**, and **Absence Anomaly Flag** pill.
  - Tabs: `Job & Personal Info` (inline edit for Employee's own `phone` & `address`), `Attendance Calendar`, `Leave Balances`, `Salary Breakdown`, and `Payslips`.

### M4: Interactive Web & Camera Attendance HUD (`/attendance`)
- **Live Check-In Hero Widget**:
  - Live ticking clock Signal, shift window (`09:00 AM - Grace 09:15 AM`), and dynamic status badge (`present`, `late`, `half_day`, `missing_checkout`, `absent`).
  - Gracefully handles `409 Conflict` if already checked in today, switching to a "Check Out" button with a live worked-hours progress ring.
- **Camera + GPS Check-In Modal (Bonus Highlight)**:
  - Live webcam `<video>` overlay framed with **animated emerald/amber scanning brackets**.
  - **Face Check**: Runs client-side face detection ensuring **exactly 1 face** is detected (rejects 0 or >1 faces with clear alert) + optional blink liveness check.
  - **Geofence Radar**: Reads `navigator.geolocation` (`lat`, `lng`, `accuracy`), blocks if `accuracy > 100m`, and displays live distance to office vs Admin's radius.
  - Sends verification payload to `POST /api/attendance/check-in` (never stores raw photo by default; displays clear privacy notice). Includes a **"Failed? Request HR Correction"** fallback button.
- **Attendance Calendar & Daily Board**: Interactive monthly calendar for employees + filterable Daily Board & Correction Approval queue for HR.

### M5: Smart Leave Magic Bar & Approval Inbox (`/leave`)
- **Smart Leave AI Bar**:
  - Glowing violet input bar at the top of the Leave page accepting **English or Roman Urdu** (e.g., *"I need next Monday and Tuesday off for my sister's wedding"* or *"Agle Monday aur Tuesday shadi ke liye chutti chahiye"*).
  - Calls `POST /api/ai/smart-leave`, plays a shimmer animation, and patches the Angular Reactive Form (`type`, `startDate`, `endDate`, `reason`) so the user can review and click **Confirm**. If AI validation fails after retry, smoothly focuses the manual form.
- **Working-Day Calculator**: Automatically skips configured weekends (`Sat-Sun`) and `Public Holidays` in the date-picker preview, and displays clear error alerts on `422 Unprocessable Entity` (overlap or over-balance).
- **HR Approval Inbox**: One-click Approve/Reject modal with comment field.

### M6: Payroll Studio & Payslip PDF (`/payroll`)
- **Live Salary Structure Calculator (HR)**: Entering `Basic Salary` reactively computes `HRA (40%)`, `Medical (10%)`, and `Gross (1.5x Basic)` using Angular Signals.
- **Monthly Payroll Table**:
  - Displays Working Days, Present, Late (with `3 lates = 0.5 day` penalty indicator), Half Days, Absent/Unpaid days, Prorated Gross, Attendance Deduction, Annualized Tax Slab calculation tooltip, and Net Pay.
  - `HR` can click **"Generate / Recalculate Draft"**.
  - `Admin` can click **"Finalize & Lock Month"** (once finalized, renders a **Locked Badge** and permanently disables all edit buttons).
- **Payslip Viewer & PDF Download**: Formatted payslip preview modal + one-click PDF download (`GET /api/payroll/payslips/:id/pdf`).

### M7: Role-Specific Dashboards & AI Summary (`/dashboard`)
- **Global Filter Ribbon (`Admin` & `HR`)**: Date Range picker + Department filter + glowing violet **"✨ Summarize with AI"** button (`POST /api/ai/dashboard-summary`) that renders 3–5 insight bullets labeled `AI-generated`.
- **Admin Dashboard**: KPI cards (`Headcount`, `Attrition YTD`, `Payroll Cost`, `Avg Salary`), `Headcount by Dept` bar chart, `Payroll Cost by Dept` bar chart, `Gender & Tenure` charts, live `Audit Log Feed`, `Attrition Risk / Anomaly` alerts, and `Announcements`.
- **HR Dashboard**: KPI cards (`Headcount`, `Present Today`, `On Leave Today`, `Late Today`, `Pending Approvals`), `Attendance Trend` amber line chart, `Absenteeism by Dept` bar chart, `Leave by Type` chart, and `Top 5 Late-Comers` table.
- **Employee Dashboard**: Quick Check-in widget, `Hours This Week vs 40h` progress bar, `Late Count`, `Leave Balance` cards, `Last Payslip` card + download, `Announcements`, and quick **"Ask My Assistant"** button.

### M8: Floating AI Assistant Drawer (English + Roman Urdu)
- Slide-over chat drawer (`POST /api/ai/chat`) available across all roles with role-specific quick prompt chips.
- Displays tool execution states, tags every response with an **`AI-generated`** badge, handles the `15s` timeout with a friendly fallback message, and politely refuses unauthorized cross-employee queries (e.g., an Employee asking for a colleague's salary).

### M9: Comms, Notifications & Admin Audit Diff Viewer
- **Notification Bell**: Navbar dropdown with unread badge for leave decisions, corrections, and payslips.
- **Announcements**: Post modal for `Admin`/`HR`; feed on all dashboards.
- **Audit Log Screen (`/audit-logs`, Admin Only)**: Filterable table with a slide-over **Before / After JSON Diff Viewer**.