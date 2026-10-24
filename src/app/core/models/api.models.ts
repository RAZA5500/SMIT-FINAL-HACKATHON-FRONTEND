/**
 * Types mirroring the HCM Lite REST API (NestJS backend, prefix /api).
 * Every Mongo document is serialised with both `_id` and a string `id`.
 */

// ── Shared ────────────────────────────────────────────────
export type Role = 'Admin' | 'HR' | 'Employee';

export const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
export type WeekDay = (typeof WEEK_DAYS)[number];

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PageMeta;
}

export interface Doc {
  _id: string;
  id: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Shape of every error body returned by the API. */
export interface ApiErrorBody {
  statusCode: number;
  error?: string;
  message: string | string[];
  code?: string;
  [key: string]: unknown;
}

/** A populated `employeeId` reference (attendance, leave and correction lists). */
export interface EmployeeRef {
  _id: string;
  id: string;
  code: string;
  fullName: string;
  departmentId?: string;
  designationId?: string;
}

// ── M1 Auth & users ──────────────────────────────────────
export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  employeeId: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
}

export interface MeResponse extends UserProfile {
  employee: {
    id: string;
    code: string;
    fullName: string;
    status: EmployeeStatus;
    joinDate: string;
    department: { _id: string; id: string; name: string } | null;
    designation: { _id: string; id: string; name: string } | null;
  } | null;
}

export interface AuthResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: string;
  user: UserProfile;
}

export interface ChangePasswordResponse extends AuthResponse {
  message: string;
}

export interface UserAccount extends Doc {
  email: string;
  fullName: string;
  role: Role;
  employeeId: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  passwordChangedAt: string | null;
  createdBy: string | null;
}

export interface CreateHrUserPayload {
  fullName: string;
  email: string;
  password?: string;
  employeeId?: string;
}

export interface CreateHrUserResponse {
  user: UserAccount;
  temporaryPassword?: string;
}

export interface ResetPasswordResponse {
  userId: string;
  email: string;
  temporaryPassword: string;
  mustChangePassword: true;
}

// ── M2 Setup & organisation ──────────────────────────────
export interface SetupStatus {
  initialized: boolean;
}

export interface OfficeLocation {
  lat: number | null;
  lng: number | null;
  radiusMeters: number;
}

export interface CompanyPolicyFields {
  timezone?: string;
  currency?: string;
  officeStartTime?: string;
  graceMinutes?: number;
  halfDayThresholdHours?: number;
  weekendDays?: WeekDay[];
  latePenaltyRuleEnabled?: boolean;
}

export interface InitSetupPayload extends CompanyPolicyFields {
  companyName: string;
  officeLocation?: { lat: number; lng: number; radiusMeters?: number };
  admin: { fullName: string; email: string; password: string };
}

export interface InitSetupResponse extends AuthResponse {
  initialized: true;
  settings: CompanySettings;
}

export interface CompanySettings extends Doc {
  companyName: string;
  timezone: string;
  currency: string;
  officeStartTime: string;
  graceMinutes: number;
  halfDayThresholdHours: number;
  weekendDays: WeekDay[];
  officeLocation: OfficeLocation;
  latePenaltyRuleEnabled: boolean;
  trackingStartDate: string;
  lastClosedDate: string | null;
}

export interface UpdateSettingsPayload extends CompanyPolicyFields {
  companyName?: string;
  officeLocation?: Partial<{ lat: number; lng: number; radiusMeters: number }>;
}

export interface TaxSlab {
  threshold: number;
  upTo: number | null;
  base: number;
  rate: number;
}

/** GET /settings/policies — the policy subset every role may read. */
export interface Policies {
  companyName: string;
  timezone: string;
  currency: string;
  today: string;
  attendance: {
    officeStartTime: string;
    graceMinutes: number;
    halfDayThresholdHours: number;
    weekendDays: WeekDay[];
    latePenaltyRuleEnabled: boolean;
    latePenaltyRule: string;
    officeLocation: { configured: boolean; radiusMeters: number };
    camera: { requireSingleFace: boolean; maxGpsAccuracyMeters: number };
  };
  payroll: {
    hraRate: number;
    medicalRate: number;
    grossMultiplier: number;
    taxSlabs: TaxSlab[];
  };
  leaveTypes: LeaveType[];
  holidays: Holiday[];
}

export interface Department extends Doc {
  name: string;
  code: string | null;
  description: string;
  isActive: boolean;
  employeeCount?: number;
}

export interface Designation extends Doc {
  name: string;
  description: string;
  isActive: boolean;
  employeeCount?: number;
}

export interface LeaveType extends Doc {
  name: string;
  /** Working days per calendar year — `null` means unlimited. */
  annualQuota: number | null;
  isPaid: boolean;
  description: string;
  isActive: boolean;
}

export interface Holiday extends Doc {
  name: string;
  date: string;
  description: string;
}

// ── M3 Employees ─────────────────────────────────────────
export type EmployeeStatus = 'active' | 'probation' | 'exited';
export type Gender = 'male' | 'female' | 'other';

export interface SalaryStructure {
  basic: number;
  hra: number;
  medical: number;
  gross: number;
}

export interface Employee extends Doc {
  code: string;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  gender: Gender | null;
  departmentId: string;
  designationId: string;
  joinDate: string;
  status: EmployeeStatus;
  exitDate: string | null;
  basicSalary: number;
  userId: string | null;
  department: { id: string; name: string | null };
  designation: { id: string; name: string | null };
  salary: SalaryStructure;
}

export interface EmployeePayload {
  code: string;
  fullName: string;
  email: string;
  phone?: string;
  address?: string;
  gender?: Gender;
  departmentId: string;
  designationId: string;
  joinDate: string;
  status?: EmployeeStatus;
  exitDate?: string | null;
  basicSalary: number;
}

export interface CreateEmployeeResponse {
  employee: Employee;
  login: {
    userId: string;
    email: string;
    temporaryPassword: string | null;
    mustChangePassword: true;
  };
}

export interface EmployeeQuery {
  q?: string;
  departmentId?: string;
  designationId?: string;
  status?: EmployeeStatus | '';
  page?: number;
  limit?: number;
  sortBy?: 'fullName' | 'code' | 'joinDate' | 'createdAt' | 'basicSalary';
  sortOrder?: 'asc' | 'desc';
}

export interface ImportError {
  row: number;
  field: string;
  reason: string;
}

export interface ImportCredential {
  code: string;
  fullName: string;
  email: string;
  temporaryPassword: string;
}

export interface ImportResult {
  valid: boolean;
  dryRun: boolean;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  inserted: number;
  errors: ImportError[];
  credentials?: ImportCredential[];
}

export interface Employee360 {
  employee: Employee;
  account: {
    userId: string;
    email: string;
    role: Role;
    isActive: boolean;
    mustChangePassword: boolean;
    lastLoginAt: string | null;
  } | null;
  attendance: {
    currentMonth: AttendanceSummary;
    recent: AttendanceRecord[];
  };
  leave: {
    year: number;
    balances: LeaveBalance[];
    recent: LeaveRequest[];
  };
  payroll: {
    salaryStructure: SalaryStructure & { monthlyTax: number };
    recentPayslips: Payslip[];
  };
}

// ── M4 Attendance ────────────────────────────────────────
export type AttendanceStatus = 'present' | 'late' | 'half_day' | 'missing_checkout' | 'absent' | 'on_leave';
export type BoardStatus = AttendanceStatus | 'not_checked_in' | 'weekend' | 'holiday';
export type AttendanceSource = 'manual' | 'camera' | 'system' | 'correction';

export interface LocationVerification {
  source: string;
  faceDetected: boolean;
  faceCount: number;
  distanceMeters: number;
  gpsAccuracy: number;
  radiusMeters: number;
  withinRadius: boolean;
  verifiedAt: string;
}

export interface AttendanceRecord extends Doc {
  employeeId: string | EmployeeRef;
  departmentId: string | null;
  date: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  status: AttendanceStatus;
  lateMinutes: number;
  workedMinutes: number | null;
  isWorkingDay: boolean;
  source: AttendanceSource;
  checkInVerification: LocationVerification | null;
  checkOutVerification: LocationVerification | null;
  ruleSnapshot: {
    timezone: string;
    officeStartTime: string;
    graceMinutes: number;
    halfDayThresholdHours: number;
  };
  leaveRequestId: string | null;
  leaveTypeName: string | null;
  corrected: boolean;
  correctionIds: string[];
}

export interface TodayAttendance {
  date: string;
  timezone: string;
  isWorkingDay: boolean;
  record: AttendanceRecord | null;
  canCheckIn: boolean;
  canCheckOut: boolean;
}

export interface PunchPayload {
  source?: 'manual' | 'camera';
  faceDetected?: boolean;
  faceCount?: number;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
}

export interface AttendanceBoardRow {
  employeeId: string;
  code: string;
  fullName: string;
  department: string | null;
  designation: string | null;
  status: BoardStatus;
  checkIn: string | null;
  checkOut: string | null;
  lateMinutes: number;
  workedMinutes: number | null;
  source: AttendanceSource | null;
  leaveType: string | null;
  attendanceId: string | null;
}

export interface AttendanceBoard {
  date: string;
  timezone: string;
  isWorkingDay: boolean;
  total: number;
  summary: Partial<Record<BoardStatus, number>>;
  data: AttendanceBoardRow[];
}

export type RequestStatus = 'pending' | 'approved' | 'rejected';

export interface AttendanceCorrection extends Doc {
  employeeId: string | EmployeeRef;
  attendanceId: string | null;
  date: string;
  requestedCheckIn: string | null;
  requestedCheckOut: string | null;
  reason: string;
  status: RequestStatus;
  requestedBy: string | null;
  reviewedBy: string | null;
  reviewComment: string | null;
  reviewedAt: string | null;
}

export interface CorrectionPayload {
  date: string;
  requestedCheckIn?: string;
  requestedCheckOut?: string;
  reason: string;
}

export interface MyAttendanceResponse {
  from: string;
  to: string;
  data: AttendanceRecord[];
}

// ── M5 Leave ─────────────────────────────────────────────
export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface LeaveRequest extends Doc {
  employeeId: string | EmployeeRef;
  departmentId: string | null;
  leaveTypeId: string;
  leaveTypeName: string;
  isPaid: boolean;
  startDate: string;
  endDate: string;
  dates: string[];
  workingDays: number;
  reason: string;
  status: LeaveStatus;
  requestedBy: string | null;
  reviewedBy: string | null;
  reviewComment: string | null;
  reviewedAt: string | null;
}

export interface LeavePayload {
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  reason?: string;
}

export interface LeaveBalance {
  leaveTypeId: string;
  leaveType: string;
  isPaid: boolean;
  unlimited: boolean;
  quota: number | null;
  used: number;
  pending: number;
  remaining: number | null;
  available: number | null;
}

export interface LeaveBalanceResponse {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  year: number;
  balances: LeaveBalance[];
}

export interface WorkingDaysResponse {
  startDate: string;
  endDate: string;
  workingDays: number;
  dates: string[];
}

export interface LeaveIssue {
  code: string;
  message: string;
}

// ── M6 Payroll ───────────────────────────────────────────
export type PayrollStatus = 'draft' | 'finalized';

export interface PayrollTotals {
  employees: number;
  gross: number;
  proratedGross: number;
  attendanceDeduction: number;
  tax: number;
  net: number;
}

export interface PayrollRun extends Doc {
  month: string;
  status: PayrollStatus;
  workingDaysInMonth: number;
  ruleSnapshot: {
    hraRate: number;
    medicalRate: number;
    taxSlabs: TaxSlab[];
    latePenaltyRuleEnabled: boolean;
    latesPerPenalty: number;
    penaltyDaysPerUnit: number;
    weekendDays: string[];
    holidays: string[];
    currency: string;
  };
  totals: PayrollTotals;
  notes: string;
  createdBy: string | null;
  updatedBy: string | null;
  finalizedBy: string | null;
  finalizedAt: string | null;
  lastCalculatedAt: string | null;
}

export interface PayrollRunDetail extends PayrollRun {
  payslips: Payslip[];
}

export interface Payslip extends Doc {
  payrollRunId: string;
  month: string;
  status: PayrollStatus;
  employeeId: string;
  employee: {
    code: string;
    fullName: string;
    email: string;
    departmentId: string | null;
    departmentName: string;
    designationId: string | null;
    designationName: string;
    joinDate: string;
    exitDate: string | null;
  };
  basic: number;
  hra: number;
  medical: number;
  gross: number;
  workingDaysInMonth: number;
  eligibleWorkingDays: number;
  perDay: number;
  proratedGross: number;
  absentDays: number;
  unpaidLeaveDays: number;
  halfDays: number;
  lateCount: number;
  latePenaltyDays: number;
  deductionDays: number;
  attendanceDeduction: number;
  annualGross: number;
  annualTax: number;
  monthlyTax: number;
  netPay: number;
  currency: string;
}

// ── M7 Dashboards ────────────────────────────────────────
export interface DashboardFilters {
  startDate?: string;
  endDate?: string;
  departmentId?: string;
}

export interface StatusCounts {
  present: number;
  late: number;
  half_day: number;
  missing_checkout: number;
  absent: number;
  on_leave: number;
}

export interface AttendanceKpis {
  workingDayRecords: number;
  expectedWorkingDays: number;
  attendanceRate: number;
  latePercent: number;
  absenteeismRate: number;
}

export interface AttendanceSummary extends AttendanceKpis {
  startDate: string;
  endDate: string;
  departmentId: string | null;
  employeeId: string | null;
  scope: 'employee' | 'organization';
  counts: StatusCounts;
  byDepartment?: (AttendanceKpis & { departmentId: string | null; department: string; counts: StatusCounts })[];
}

export interface TodayKpis {
  date: string;
  isWorkingDay: boolean;
  headcount: number;
  present: number;
  onTime: number;
  late: number;
  halfDay: number;
  onLeave: number;
  onLeaveByType: Record<string, number>;
  notCheckedIn: number;
  pendingApprovals: { leave: number; corrections: number; total: number };
}

export interface HeadcountKpis {
  date: string;
  departmentId: string | null;
  total: number;
  active: number;
  probation: number;
  byDepartment: { departmentId: string | null; department: string; headcount: number }[];
}

export interface AttritionKpis {
  startDate: string;
  endDate: string;
  departmentId: string | null;
  exits: number;
  headcountStart: number;
  headcountEnd: number;
  averageHeadcount: number;
  attritionRate: number;
  exitsByDepartment: { departmentId: string | null; department: string; exits: number }[];
}

export interface AttendanceTrend {
  startDate: string;
  endDate: string;
  departmentId: string | null;
  data: { date: string; counts: StatusCounts; attendanceRate: number; latePercent: number }[];
}

export interface AbsenteeismKpis {
  startDate: string;
  endDate: string;
  departmentId: string | null;
  overall: { absentDays: number; expectedWorkingDays: number; absenteeismRate: number };
  byDepartment: {
    departmentId: string | null;
    department: string;
    absentDays: number;
    expectedWorkingDays: number;
    absenteeismRate: number;
  }[];
}

export interface LeaveUtilization {
  startDate: string;
  endDate: string;
  departmentId: string | null;
  employeeId: string | null;
  headcount: number;
  byLeaveType: { leaveTypeId: string; leaveType: string; approvedDays: number; quota: number | null; utilization: number | null }[];
}

export interface PayrollCostKpis {
  startMonth: string;
  endMonth: string;
  departmentId: string | null;
  byMonth: ({ month: string; runStatus: PayrollStatus | null } & PayrollCostTotals)[];
  byMonthAndDepartment: ({ month: string; departmentId: string | null; department: string } & PayrollCostTotals)[];
  totals: PayrollCostTotals;
}

export interface PayrollCostTotals {
  gross: number;
  proratedGross: number;
  attendanceDeduction: number;
  tax: number;
  net: number;
  employees: number;
}

export interface AverageSalaryKpis {
  startDate: string;
  endDate: string;
  departmentId: string | null;
  source: 'payslips' | 'employee_master';
  byDepartment: { departmentId: string | null; department: string; averageGross: number; employees: number }[];
  byDesignation: { designationId: string | null; designation: string; averageGross: number; employees: number }[];
}

export interface Demographics {
  date: string;
  departmentId: string | null;
  gender: { gender: 'male' | 'female' | 'other' | 'unspecified'; count: number }[];
  tenure: { band: '<6m' | '6-12m' | '1-3y' | '3-5y' | '5y+'; count: number }[];
}

export interface LateComers {
  startDate: string;
  endDate: string;
  departmentId: string | null;
  totalLateArrivals: number;
  employeesWithLates: number;
  data: {
    employeeId: string;
    code?: string;
    fullName?: string;
    department?: string;
    designation?: string;
    lateCount: number;
    avgLateMinutes: number;
    maxLateMinutes: number;
    lastLateDate: string;
  }[];
}

export interface RiskFactor {
  factor: string;
  weight: number;
  contribution: number;
  detail: string;
}

export interface AttritionRisk {
  startDate: string;
  endDate: string;
  departmentId: string | null;
  methodology: string;
  summary: { evaluated: number; high: number; medium: number; low: number };
  data: {
    employeeId: string;
    code: string;
    fullName: string;
    department: string;
    status: EmployeeStatus;
    score: number;
    level: 'low' | 'medium' | 'high';
    factors: RiskFactor[];
    reasons: string[];
  }[];
}

export interface AbsenceFlag {
  code: 'HIGH_ABSENCE_RATE' | 'CONSECUTIVE_ABSENCES' | 'WEEKEND_ADJACENT_PATTERN' | 'FREQUENT_MISSING_CHECKOUT';
  message: string;
}

export interface AbsenceAnomalies {
  startDate: string;
  endDate: string;
  departmentId: string | null;
  flaggedEmployees: number;
  data: {
    employeeId: string;
    code?: string;
    fullName?: string;
    department?: string;
    absentDays: number;
    absenceRate: number;
    departmentAverageRate: number;
    flags: AbsenceFlag[];
  }[];
}

export interface DashboardSummary {
  filters: { startDate: string; endDate: string; departmentId: string | null };
  today: TodayKpis;
  headcount: HeadcountKpis;
  attrition: AttritionKpis;
  attritionYtd: AttritionKpis;
  attendance: AttendanceSummary;
  attendanceTrend: AttendanceTrend;
  absenteeism: AbsenteeismKpis;
  leaveUtilization: LeaveUtilization;
  payrollCost: PayrollCostKpis;
  averageSalary: AverageSalaryKpis;
  demographics: Demographics;
  lateComers: LateComers;
  attritionRisk: AttritionRisk;
  absenceAnomalies: AbsenceAnomalies;
  generatedAt: string;
}

export interface PersonalDashboard {
  date: string;
  timezone: string;
  today: {
    isWorkingDay: boolean;
    record: AttendanceRecord | null;
    canCheckIn: boolean;
    canCheckOut: boolean;
  };
  week: { startDate: string; hoursWorked: number; targetHours: number; progressPercent: number };
  month: {
    startDate: string;
    lateCount: number;
    present: number;
    halfDays: number;
    missingCheckouts: number;
    absent: number;
    onLeave: number;
  };
  leaveBalances: LeaveBalance[];
  lastPayslip: { id: string; month: string; gross: number; netPay: number; currency: string } | null;
  announcements: Announcement[];
  unreadNotifications: number;
}

// ── M8 AI ────────────────────────────────────────────────
export type AiStatus = 'success' | 'disabled' | 'timeout' | 'error' | 'refused' | 'fallback';

export interface AiToolCall {
  name: string;
  status: 'ok' | 'denied' | 'error';
}

export interface AiChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface AiChatResponse {
  aiGenerated: true;
  feature: 'chat';
  status: AiStatus;
  fallback: boolean;
  reply: string;
  toolsCalled: AiToolCall[];
  model: string | null;
  latencyMs?: number;
}

export interface AiDashboardSummaryResponse {
  aiGenerated: true;
  feature: 'dashboard-summary';
  status: AiStatus;
  fallback: boolean;
  bullets: string[];
  grounded?: boolean;
  attempts?: number;
  model?: string | null;
  latencyMs?: number;
  message?: string;
}

export interface SmartLeavePreview {
  leaveTypeId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  workingDays: number;
  dates: string[];
  canSubmit: boolean;
  issues: LeaveIssue[];
  balances: LeaveBalance[];
}

export interface SmartLeaveResponse {
  aiGenerated: true;
  feature: 'smart-leave';
  status: AiStatus;
  fallbackToManualForm: boolean;
  draft: { type: string; startDate: string; endDate: string; reason: string } | null;
  leaveTypeId?: string;
  workingDays?: number | null;
  preview?: SmartLeavePreview | null;
  attempts?: number;
  errors?: string[];
  message: string;
  model?: string | null;
}

// ── M9 Comms & audit ─────────────────────────────────────
export interface Announcement extends Doc {
  title: string;
  body: string;
  pinned: boolean;
  createdBy: string;
  createdByName: string;
  createdByRole: Role;
}

export interface AnnouncementPayload {
  title: string;
  body: string;
  pinned?: boolean;
}

export type NotificationType = 'leave' | 'attendance' | 'payroll' | 'announcement' | 'account' | 'system';

export interface AppNotification extends Doc {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  entity: string | null;
  entityId: string | null;
  isRead: boolean;
  readAt: string | null;
}

export const AUDIT_ACTIONS = [
  'create',
  'update',
  'delete',
  'approve',
  'reject',
  'finalize',
  'import',
  'activate',
  'deactivate',
  'reset_password',
  'change_password',
  'initialize',
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export interface AuditLog extends Doc {
  actorId: string | null;
  actorRole: string;
  actorEmail: string | null;
  action: AuditAction;
  entity: string;
  entityId: string | null;
  before: unknown;
  after: unknown;
}

export interface AuditQuery {
  entity?: string;
  action?: AuditAction | '';
  actorId?: string;
  entityId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}
