import {
  calculateCartSubtotal,
  calculateCartTotals,
  safeQuantity,
  safeUnitPrice,
} from '@/components/demo/cart-pricing';

describe('cart-pricing', () => {
  it('treats undefined, null, and NaN prices as 0', () => {
    expect(safeUnitPrice(undefined)).toBe(0);
    expect(safeUnitPrice(null)).toBe(0);
    expect(safeUnitPrice(Number.NaN)).toBe(0);
    expect(safeUnitPrice(-10)).toBe(0);
  });

  it('treats undefined, null, NaN, and negative quantities as 0', () => {
    expect(safeQuantity(undefined)).toBe(0);
    expect(safeQuantity(null)).toBe(0);
    expect(safeQuantity(Number.NaN)).toBe(0);
    expect(safeQuantity(-3)).toBe(0);
  });

  it('calculates subtotal without producing NaN for malformed prices', () => {
    const subtotal = calculateCartSubtotal([
      { price: undefined, quantity: 2 },
      { price: null, quantity: 1 },
      { price: Number.NaN, quantity: 4 },
      { price: 12.5, quantity: 2 },
    ]);

    expect(subtotal).toBe(25);
    expect(Number.isNaN(subtotal)).toBe(false);
  });

  it('calculates subtotal, tax, and total from sanitized prices', () => {
    const totals = calculateCartTotals(
      [
        { price: undefined, quantity: 2 },
        { price: 20, quantity: 1 },
      ],
      0.25
    );

    expect(totals.subtotal).toBe(20);
    expect(totals.tax).toBe(5);
    expect(totals.total).toBe(25);
  });

  it('does not produce NaN when quantity or taxRate are malformed', () => {
    const totals = calculateCartTotals(
      [
        { price: 10, quantity: Number.NaN },
        { price: 5, quantity: -2 },
        { price: 2, quantity: 3 },
      ],
      Number.NaN
    );

    expect(totals.subtotal).toBe(6);
    expect(totals.tax).toBe(0);
    expect(totals.total).toBe(6);
    expect(Number.isNaN(totals.total)).toBe(false);
  });
});
