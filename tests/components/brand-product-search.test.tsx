import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrandProductSearch } from '@/app/dashboard/products/components/brand-product-search';
import { searchCannMenusProducts, linkBrandProducts } from '@/app/dashboard/products/actions';
import { useToast } from '@/hooks/use-toast';

// Mock dependencies
jest.mock('@/app/dashboard/products/actions', () => ({
  searchCannMenusProducts: jest.fn(),
  linkBrandProducts: jest.fn(),
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn(),
}));

// Mock useDebounce to resolve immediately
jest.mock('@/hooks/use-debounce', () => ({
  useDebounce: jest.fn((value) => value),
}));

// Mock Dialog component parts (Radix UI often needs this)
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <div>{children}</div>,
  DialogDescription: ({ children }: any) => <div>{children}</div>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
}));

describe('BrandProductSearch', () => {
  const mockToast = jest.fn();
  const mockOnSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useToast as jest.Mock).mockReturnValue({ toast: mockToast });
  });

  it('renders correctly', () => {
    render(<BrandProductSearch onSuccess={mockOnSuccess} />);
    expect(screen.getByPlaceholderText(/search brand/i)).toBeInTheDocument();
  });

  it('performs search on input', async () => {
    (searchCannMenusProducts as jest.Mock).mockResolvedValue([
      { id: '1', name: 'Product A', brand: 'Brand', price: 10, category: 'Edible', image: '' }
    ]);

    render(<BrandProductSearch onSuccess={mockOnSuccess} />);
    
    // Type in input
    fireEvent.change(screen.getByPlaceholderText(/search brand/i), { target: { value: 'Jeeter' } });

    // Expect search to be called (debounced mock is immediate)
    await waitFor(() => {
      expect(searchCannMenusProducts).toHaveBeenCalledWith('Jeeter');
    });

    // Expect results
    expect(await screen.findByText('Product A')).toBeInTheDocument();
  });

  it('selects products and links them', async () => {
    (searchCannMenusProducts as jest.Mock).mockResolvedValue([
      { id: '1', name: 'Product A', brand: 'Brand', price: 10, category: 'Edible', image: '' }
    ]);
    (linkBrandProducts as jest.Mock).mockResolvedValue({ success: true, count: 1 });

    render(<BrandProductSearch onSuccess={mockOnSuccess} />);

    // Search
    fireEvent.change(screen.getByPlaceholderText(/search brand/i), { target: { value: 'Jeeter' } });
    await screen.findByText('Product A');

    // It might auto-select or we click select
    // In code: "Auto-select all by default if reasonable count" -> Yes, 1 is reasonable.
    // So 'Import 1 Products' button should be enabled.
    
    const importBtn = screen.getByText(/Import 1 Products/i);
    expect(importBtn).toBeEnabled();
    fireEvent.click(importBtn);

    // Dialog appears
    expect(screen.getByText('One-Time Confirmation')).toBeInTheDocument();

    // Confirm
    const confirmBtn = screen.getByText('Confirm & Lock Catalog');
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(linkBrandProducts).toHaveBeenCalled();
    });

    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Products Linked!' }));
    expect(mockOnSuccess).toHaveBeenCalled();
  });
});
