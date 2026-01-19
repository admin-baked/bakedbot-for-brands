
import { render, screen, fireEvent } from '@testing-library/react';
import { ProductSection } from '@/components/demo/product-section';
import { Product } from '@/types/domain';

const mockProducts: Product[] = [
  {
    id: 'prod-1',
    name: 'Product 1',
    category: 'Flower',
    price: 10,
    imageUrl: '/1.jpg'
  },
  {
    id: 'prod-2',
    name: 'Product 2',
    category: 'Edible',
    price: 20,
    imageUrl: '/2.jpg'
  }
];

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  ChevronLeft: () => <div data-testid="icon-chevron-left" />,
  ChevronRight: () => <div data-testid="icon-chevron-right" />,
  ArrowRight: () => <div data-testid="icon-arrow-right" />,
  Plus: () => <div data-testid="icon-plus" />,
  Minus: () => <div data-testid="icon-minus" />,
  Heart: () => <div data-testid="icon-heart" />,
  ShoppingCart: () => <div data-testid="icon-cart" />,
  Leaf: () => <div data-testid="icon-leaf" />, 
  Zap: () => <div data-testid="icon-zap" />
}));

describe('ProductSection', () => {
  it('should render a list of products', () => {
    render(
      <ProductSection
        title="Featured"
        products={mockProducts}
        onAddToCart={jest.fn()}
        getCartQuantity={() => 0}
      />
    );
    expect(screen.getByText('Featured')).toBeInTheDocument();
    expect(screen.getByText('Product 1')).toBeInTheDocument();
    expect(screen.getByText('Product 2')).toBeInTheDocument();
  });

  it('should pass interaction props to cards', () => {
    const mockOnProductClick = jest.fn();
    const mockOnFavorite = jest.fn();

    render(
      <ProductSection
        title="Featured"
        products={mockProducts}
        onAddToCart={jest.fn()}
        getCartQuantity={() => 0}
        onProductClick={mockOnProductClick}
        onFavorite={mockOnFavorite}
        favorites={new Set(['prod-1'])}
      />
    );

    fireEvent.click(screen.getByText('Product 1'));
    expect(mockOnProductClick).toHaveBeenCalledWith(mockProducts[0]);
  });
});
