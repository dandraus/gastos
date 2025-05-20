import { formatNumber } from './format';

describe('formatNumber', () => {
  it('formats numbers with thousands separator and two decimals', () => {
    expect(formatNumber(1234.5)).toBe('1.234,50'.replace(',', '.'));
  });
});
