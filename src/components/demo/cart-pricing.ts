export interface PricedCartItem {
  price?: number | null;
  quantity?: number | null;
}

export function safeUnitPrice(price: number | null | undefined): number {
  if (typeof price !== 'number' || !Number.isFinite(price)) return 0;
  return Math.max(0, price);
}

export function safeQuantity(quantity: number | null | undefined): number {
  if (typeof quantity !== 'number' || !Number.isFinite(quantity)) return 0;
  return Math.max(0, quantity);
}

export function calculateCartSubtotal(items: PricedCartItem[]): number {
  return items.reduce((sum, item) => sum + safeUnitPrice(item.price) * safeQuantity(item.quantity), 0);
}

export function calculateCartTotals(items: PricedCartItem[], taxRate: number = 0.25) {
  const subtotal = calculateCartSubtotal(items);
  const normalizedTaxRate =
    typeof taxRate === 'number' && Number.isFinite(taxRate) && taxRate >= 0
      ? taxRate
      : 0;
  const tax = subtotal * normalizedTaxRate;

  return {
    subtotal,
    tax,
    total: subtotal + tax,
  };
}
