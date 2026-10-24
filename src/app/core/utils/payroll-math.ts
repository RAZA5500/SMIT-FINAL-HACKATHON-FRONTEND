import { TaxSlab } from '../models/api.models';

/**
 * Client mirror of the server payroll calculator — powers the live salary calculator.
 * Rates and slabs always come from GET /settings/policies, never from constants here.
 */

const round2 = (value: number) => Math.round(value * 100) / 100;

export interface SalaryBreakdown {
  basic: number;
  hra: number;
  medical: number;
  gross: number;
  annualGross: number;
  annualTax: number;
  monthlyTax: number;
  netFullMonth: number;
  slab: TaxSlab | null;
}

export function annualTaxFor(annualGross: number, slabs: TaxSlab[]): { tax: number; slab: TaxSlab | null } {
  if (!(annualGross > 0) || slabs.length === 0) return { tax: 0, slab: slabs[0] ?? null };
  const slab = slabs.find((s) => s.upTo === null || annualGross <= s.upTo) ?? slabs[slabs.length - 1];
  return { tax: round2(slab.base + (annualGross - slab.threshold) * slab.rate), slab };
}

export function salaryBreakdown(basic: number, rates: { hraRate: number; medicalRate: number }, slabs: TaxSlab[]): SalaryBreakdown {
  const safeBasic = Number.isFinite(basic) && basic > 0 ? basic : 0;
  const hra = round2(safeBasic * rates.hraRate);
  const medical = round2(safeBasic * rates.medicalRate);
  const gross = round2(safeBasic + hra + medical);
  const annualGross = round2(gross * 12);
  const { tax: annualTax, slab } = annualTaxFor(annualGross, slabs);
  const monthlyTax = round2(annualTax / 12);
  return {
    basic: round2(safeBasic),
    hra,
    medical,
    gross,
    annualGross,
    annualTax,
    monthlyTax,
    netFullMonth: round2(gross - monthlyTax),
    slab,
  };
}

/** Plain-language description of a tax slab, e.g. "5% above PKR 600,000". */
export function describeSlab(slab: TaxSlab | null, money: (n: number) => string): string {
  if (!slab) return '—';
  if (slab.rate === 0) return `Tax-free up to ${slab.upTo !== null ? money(slab.upTo) : 'any amount'}`;
  const base = slab.base > 0 ? `${money(slab.base)} + ` : '';
  return `${base}${Math.round(slab.rate * 100)}% above ${money(slab.threshold)}`;
}
