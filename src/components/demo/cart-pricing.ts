export interface PricedCartItem {
  price?: number | null;
  quantity: number;
}

export function safeUnitPrice(price: number | null | undefined): number {
  return typeof price === 'number' && Number.isFinite(price) ? price : 0;
}

export function calculateCartSubtotal(items: PricedCartItem[]): number {
  return items.reduce((sum, item) => sum + safeUnitPrice(item.price) * item.quantity, 0);
}

export function calculateCartTotals(items: PricedCartItem[], taxRate: number = 0.25) {
  const subtotal = calculateCartSubtotal(items);
  const tax = subtotal * taxRate;

  return {
    subtotal,
    tax,
    total: subtotal + tax,
  };
}
