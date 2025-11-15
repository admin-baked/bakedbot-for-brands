
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useCart } from '@/hooks/use-cart';
import { useStore } from '@/hooks/use-store';
import { useToast } from '@/hooks/use-toast';
import { ProductCard } from '@/components/product-card';
import type { Product } from '@/lib/types';

// Mock the hooks used by the component
jest.mock('@/hooks/use-cart');
jest.mock('@/hooks/use-store');
jest.mock('@/hooks/use-toast');

const mockAddToCart = jest.fn();
const mockToast = jest.fn();

const mockProduct: Product = {
  id: 'prod-1',
  name: 'Cosmic Caramels',
  category: 'Edibles',
  price: 25.00,
  prices: { loc1: 25.00 },
  imageUrl: 'https://picsum.photos/seed/1/600/400',
  imageHint: 'caramel',
  description: 'Chewy, rich caramels.',
};

describe('ProductCard', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Setup default mock implementations
    (useCart as jest.Mock).mockReturnValue({
      addToCart: mockAddToCart,
    });
    (useToast as jest.Mock).mockReturnValue({
      toast: mockToast,
    });
    // Default state: no location selected
    (useStore as unknown as jest.Mock).mockReturnValue({
      selectedLocationId: null,
    });
  });

  it('renders product information correctly', () => {
    render(<ProductCard product={mockProduct} />);

    expect(screen.getByText('Cosmic Caramels')).toBeInTheDocument();
    expect(screen.getByText('$25.00')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Cosmic Caramels' })).toBeInTheDocument();
  });

  it('shows a destructive toast and does not add to cart if no location is selected', () => {
    render(<ProductCard product={mockProduct} />);

    const addButton = screen.getByRole('button', { name: /Add/i });
    fireEvent.click(addButton);

    // Verify that addToCart was NOT called
    expect(mockAddToCart).not.toHaveBeenCalled();

    // Verify that a destructive toast was shown
    expect(mockToast).toHaveBeenCalledWith({
      variant: 'destructive',
      title: 'No Location Selected',
      description: 'Please select a dispensary location before adding items to your cart.',
    });
  });

  it('adds item to cart and shows a success toast when a location is selected', () => {
    // Override the mock for this specific test
    (useStore as unknown as jest.Mock).mockReturnValue({
      selectedLocationId: 'loc1',
    });

    render(<ProductCard product={mockProduct} />);

    const addButton = screen.getByRole('button', { name: /Add/i });
    fireEvent.click(addButton);

    // Verify that addToCart WAS called with the correct arguments
    expect(mockAddToCart).toHaveBeenCalledWith(mockProduct, 'loc1');

    // Verify that a success toast was shown
    expect(mockToast).toHaveBeenCalledWith({
        title: 'Added to Cart',
        description: 'Cosmic Caramels has been added to your cart.',
    });
  });

  it('disables the add to cart button when no location is selected', () => {
    render(<ProductCard product={mockProduct} />);

    const addButton = screen.getByRole('button', { name: /Add/i });
    // The button is not technically disabled, so we check the click handler logic instead
    fireEvent.click(addButton);
    expect(mockAddToCart).not.toHaveBeenCalled();
  });

  it('enables the add to cart button when a location is selected', () => {
     (useStore as unknown as jest.Mock).mockReturnValue({
      selectedLocationId: 'loc1',
    });

    render(<ProductCard product={mockProduct} />);

    const addButton = screen.getByRole('button', { name: /Add/i });
    fireEvent.click(addButton);
    expect(mockAddToCart).toHaveBeenCalled();
  });
});
