import { formatMeters, haversineMeters } from './geo';

describe('geo utility', () => {
  it('computes haversine distance between two coordinates', () => {
    // Distance between (0, 0) and (0, 1 degree longitude) ~ 111,195 m
    const d = haversineMeters({ lat: 0, lng: 0 }, { lat: 0, lng: 1 });
    expect(d).toBeGreaterThan(111000);
    expect(d).toBeLessThan(112000);
  });

  it('formats meters to m and km', () => {
    expect(formatMeters(50)).toBe('50 m');
    expect(formatMeters(1500)).toBe('1.5 km');
    expect(formatMeters(null)).toBe('—');
  });
});
