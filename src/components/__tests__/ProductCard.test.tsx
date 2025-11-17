import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useStore } from '@/hooks/use-store';
import { useToast } from '@/hooks/use-toast';
import { ProductCard } from '@/components/product-card';
import type { Product } from '@/lib/types';
import { useRouter } from 'next/navigation';

// Mock the hooks and modules used by the component
jest.mock('@/hooks/use-store');
jest.mock('@/hooks/use-toast');
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

const mockUseStore = useStore as unknown as jest.Mock;
const mockToast = jest.fn();
const mockAddToCart = jest.fn();

const mockProduct: Product = {
  id: 'prod-1',
  name: 'Cosmic Caramels',
  category: 'Edibles',
  price: 25.00,
  prices: { 'loc1': 25.00 },
  imageUrl: 'https://picsum.photos/seed/1/600/400',
  imageHint: 'caramel',
  description: 'Chewy, rich caramels.',
  brandId: 'default' // Add brandId for the test
};

describe('ProductCard', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: jest.fn() });
    (useToast as jest.Mock).mockReturnValue({ toast: mockToast });
    mockUseStore.mockReturnValue({
      selectedLocationId: null,
      addToCart: mockAddToCart,
    });
  });

  it('should render product information and correct link', () => {
    render(<ProductCard product={mockProduct} />);

    expect(screen.getByText('Cosmic Caramels')).toBeInTheDocument();
    expect(screen.getByText('$25.00')).toBeInTheDocument();
    
    const image = screen.getByRole('img', { name: 'Cosmic Caramels' });
    expect(image).toBeInTheDocument();

    const link = screen.getByRole('link', { name: 'Cosmic Caramels' });
    expect(link).toHaveAttribute('href', `/menu/${mockProduct.brandId}/products/${mockProduct.id}`);
  });

  it('should show a destructive toast if no location is selected when adding to cart', () => {
    render(<ProductCard product={mockProduct} />);

    const addButton = screen.getByRole('button', { name: /Add/i });
    fireEvent.click(addButton);

    expect(mockAddToCart).not.toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith({
      variant: 'destructive',
      title: 'No Location Selected',
      description: 'Please select a dispensary location before adding items to your cart.',
    });
  });

  it('should add item to cart and show a success toast when a location is selected', () => {
    mockUseStore.mockReturnValue({
      selectedLocationId: 'loc1',
      addToCart: mockAddToCart,
    });

    render(<ProductCard product={mockProduct} />);

    const addButton = screen.getByRole('button', { name: /Add/i });
    fireEvent.click(addButton);

    expect(mockAddToCart).toHaveBeenCalledWith(mockProduct, 'loc1');
    expect(mockToast).toHaveBeenCalledWith({
        title: 'Added to Cart',
        description: 'Cosmic Caramels has been added to your cart.',
    });
  });
});
