import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Mirrors the backend password policy: 8-64 chars with at least one letter and one number. */
export const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,64}$/;
export const PASSWORD_RULE = 'Use 8-64 characters with at least one letter and one number.';

export const EMPLOYEE_CODE_REGEX = /^[A-Za-z0-9_-]{1,20}$/;
export const PHONE_REGEX = /^[+\d][\d\s()-]{5,19}$/;
export const DEPARTMENT_CODE_REGEX = /^[A-Za-z0-9_-]{1,20}$/;

export function passwordPolicy(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = (control.value ?? '') as string;
    if (!value) return null;
    return PASSWORD_REGEX.test(value) ? null : { passwordPolicy: true };
  };
}

/** Group validator: two controls must hold the same value. */
export function matchFields(field: string, confirmField: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const a = group.get(field)?.value;
    const b = group.get(confirmField)?.value;
    if (!b) return null;
    return a === b ? null : { mismatch: true };
  };
}

/** Group validator: `endField` must not be before `startField` (ISO dates or HH:mm strings compare lexically). */
export function orderedRange(startField: string, endField: string, errorKey = 'rangeOrder', allowEqual = true): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const start = group.get(startField)?.value as string | null;
    const end = group.get(endField)?.value as string | null;
    if (!start || !end) return null;
    const ok = allowEqual ? end >= start : end > start;
    return ok ? null : { [errorKey]: true };
  };
}

/** Group validator: at least one of the listed controls has a value. */
export function atLeastOne(fields: string[], errorKey = 'atLeastOne'): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null =>
    fields.some((field) => !!group.get(field)?.value) ? null : { [errorKey]: true };
}

export function notBlank(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null =>
    typeof control.value === 'string' && control.value.trim().length === 0 && control.value.length > 0 ? { blank: true } : null;
}

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  label: 'Too weak' | 'Weak' | 'Fair' | 'Strong' | 'Excellent';
  checks: { id: string; label: string; ok: boolean; required: boolean }[];
}

export function passwordStrength(password: string): PasswordStrength {
  const checks = [
    { id: 'length', label: '8+ characters', ok: password.length >= 8 && password.length <= 64, required: true },
    { id: 'letter', label: 'A letter', ok: /[A-Za-z]/.test(password), required: true },
    { id: 'number', label: 'A number', ok: /\d/.test(password), required: true },
    { id: 'case', label: 'Upper & lower case', ok: /[a-z]/.test(password) && /[A-Z]/.test(password), required: false },
    { id: 'symbol', label: 'A symbol', ok: /[^A-Za-z0-9]/.test(password), required: false },
    { id: 'long', label: '12+ characters', ok: password.length >= 12, required: false },
  ];
  const requiredOk = checks.filter((c) => c.required).every((c) => c.ok);
  const bonus = checks.filter((c) => !c.required && c.ok).length;
  let score: PasswordStrength['score'] = 0;
  if (password.length > 0) score = 1;
  if (requiredOk) score = 2;
  if (requiredOk && bonus >= 2) score = 3;
  if (requiredOk && bonus >= 3) score = 4;
  const labels: PasswordStrength['label'][] = ['Too weak', 'Weak', 'Fair', 'Strong', 'Excellent'];
  return { score, label: labels[score], checks };
}
