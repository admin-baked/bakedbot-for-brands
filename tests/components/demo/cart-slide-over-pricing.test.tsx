import React from 'react';
import { render, screen } from '@testing-library/react';
import { CartSlideOver } from '@/components/demo/cart-slide-over';

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => <img alt={props.alt || ''} {...props} />,
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, className }: any) => (
    <button type="button" onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
}));

jest.mock('@/components/ui/separator', () => ({
  Separator: () => <hr />,
}));

jest.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children, open }: any) => (open ? <div>{children}</div> : null),
  SheetContent: ({ children }: any) => <div>{children}</div>,
  SheetHeader: ({ children }: any) => <div>{children}</div>,
  SheetTitle: ({ children }: any) => <h2>{children}</h2>,
  SheetFooter: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('@/components/upsell/product-upsell-row', () => ({
  ProductUpsellRow: () => <div data-testid="upsell-row" />,
}));

jest.mock('@/server/actions/upsell', () => ({
  fetchCartUpsells: jest.fn(),
}));

jest.mock('lucide-react', () => new Proxy({}, {
  get: (_target, prop) => (props: any) => <span data-testid={`icon-${String(prop)}`} {...props} />,
}));

describe('CartSlideOver pricing', () => {
  it('does not render NaN totals when cart items have missing prices', () => {
    render(
      <CartSlideOver
        open={true}
        onClose={jest.fn()}
        items={[
          {
            id: 'prod-1',
            name: 'Mystery Product',
            category: 'Flower',
            quantity: 2,
            price: undefined as any,
          },
        ] as any}
        onUpdateQuantity={jest.fn()}
        onRemoveItem={jest.fn()}
        onClearCart={jest.fn()}
      />
    );

    expect(screen.getByText('Mystery Product')).toBeInTheDocument();
    expect(screen.queryByText(/\$NaN/)).not.toBeInTheDocument();
    expect(screen.getAllByText('$0.00').length).toBeGreaterThanOrEqual(3);
  });
});
