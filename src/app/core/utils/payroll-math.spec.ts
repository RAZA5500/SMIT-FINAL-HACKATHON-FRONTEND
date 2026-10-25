import { TaxSlab } from '../models/api.models';
import { annualTaxFor, describeSlab, salaryBreakdown } from './payroll-math';

describe('payroll-math', () => {
  const sampleSlabs: TaxSlab[] = [
    { threshold: 0, upTo: 600000, base: 0, rate: 0 },
    { threshold: 600000, upTo: 1200000, base: 0, rate: 0.05 },
    { threshold: 1200000, upTo: 2400000, base: 30000, rate: 0.15 },
    { threshold: 2400000, upTo: null, base: 210000, rate: 0.25 },
  ];

  it('calculates 40% HRA, 10% Medical, and 1.5x Gross from Basic', () => {
    const basic = 100000;
    const rates = { hraRate: 0.4, medicalRate: 0.1 };
    const breakdown = salaryBreakdown(basic, rates, sampleSlabs);

    expect(breakdown.basic).toBe(100000);
    expect(breakdown.hra).toBe(40000);
    expect(breakdown.medical).toBe(10000);
    expect(breakdown.gross).toBe(150000);
    expect(breakdown.annualGross).toBe(1800000);
    expect(breakdown.annualTax).toBe(120000);
    expect(breakdown.monthlyTax).toBe(10000);
    expect(breakdown.netFullMonth).toBe(140000);
  });

  it('correctly calculates annual tax for slabs', () => {
    const { tax } = annualTaxFor(1800000, sampleSlabs);
    // 30,000 + (1,800,000 - 1,200,000) * 0.15 = 30,000 + 90,000 = 120,000
    expect(tax).toBe(120000);
  });

  it('calculates zero tax for income within first slab', () => {
    const { tax } = annualTaxFor(500000, sampleSlabs);
    expect(tax).toBe(0);
  });

  it('handles top unbounded slab', () => {
    const { tax } = annualTaxFor(3000000, sampleSlabs);
    // 210,000 + (3,000,000 - 2,400,000) * 0.25 = 210,000 + 150,000 = 360,000
    expect(tax).toBe(360000);
  });

  it('handles non-positive basic salary safely', () => {
    const breakdown = salaryBreakdown(0, { hraRate: 0.4, medicalRate: 0.1 }, sampleSlabs);
    expect(breakdown.basic).toBe(0);
    expect(breakdown.gross).toBe(0);
    expect(breakdown.annualTax).toBe(0);
    expect(breakdown.netFullMonth).toBe(0);
  });

  it('formats slab description correctly using describeSlab', () => {
    const format = (n: number) => `PKR ${n.toLocaleString()}`;
    expect(describeSlab(null, format)).toBe('—');
    expect(describeSlab(sampleSlabs[0], format)).toBe('Tax-free up to PKR 600,000');
    expect(describeSlab(sampleSlabs[1], format)).toBe('5% above PKR 600,000');
    expect(describeSlab(sampleSlabs[2], format)).toBe('PKR 30,000 + 15% above PKR 1,200,000');
  });
});
