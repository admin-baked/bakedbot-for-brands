
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useStore } from '@/hooks/use-store';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase/auth/use-user';
import * as Actions from '../actions';
import type { Product } from '@/lib/types';
import type { SummarizeReviewsOutput } from '@/ai/flows/summarize-reviews';
import React from 'react';
import ProductDetailsClient from '../components/product-details-client';

// Mock dependencies
jest.mock('@/hooks/use-store');
jest.mock('@/hooks/use-toast');
jest.mock('@/firebase/auth/use-user');
jest.mock('../actions', () => ({
  ...jest.requireActual('../actions'), // import and retain all actual exports
  updateProductFeedback: jest.fn(), // mock this specific export
}));

const mockUseStore = useStore as jest.Mock;
const mockToast = jest.fn();
const mockUpdateProductFeedback = Actions.updateProductFeedback as jest.Mock;
const mockAddToCart = jest.fn();

const mockProduct: Product = {
  id: 'prod-1',
  name: 'Cosmic Caramels',
  category: 'Edibles',
  price: 25.00,
  prices: { loc1: 25.00 },
  imageUrl: '/placeholder.jpg',
  imageHint: 'caramel',
  description: 'Chewy, rich caramels.',
  likes: 10,
  dislikes: 2,
};

const mockSummary: SummarizeReviewsOutput = {
  summary: 'A great product for relaxing.',
  pros: ['Tasty', 'Potent'],
  cons: ['A bit pricey'],
  reviewCount: 5,
};

// Mock user for feedback test
const mockUser = {
  uid: 'test-user-123',
  email: 'test@example.com',
  getIdToken: async () => 'test-token',
};


describe('ProductDetailsClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (useToast as jest.Mock).mockReturnValue({ toast: mockToast });
    (useUser as jest.Mock).mockReturnValue({ user: null, isUserLoading: false });
    
    mockUseStore.mockReturnValue({
      selectedLocationId: null,
      addToCart: mockAddToCart,
    });
  });

  it('renders product details correctly', () => {
    render(<ProductDetailsClient product={mockProduct} summary={mockSummary} />);
    expect(screen.getByText('Cosmic Caramels')).toBeInTheDocument();
    expect(screen.getByText('$25.00')).toBeInTheDocument();
    expect(screen.getByText('Chewy, rich caramels.')).toBeInTheDocument();
    expect(screen.getByText('10 Likes')).toBeInTheDocument();
  });

  it('shows a toast if trying to add to cart without a location selected', () => {
    render(<ProductDetailsClient product={mockProduct} summary={mockSummary} />);
    
    const addToCartButton = screen.getByRole('button', { name: /Add to Cart/i });
    fireEvent.click(addToCartButton);

    expect(mockAddToCart).not.toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith({
      variant: 'destructive',
      title: 'No Location Selected',
      description: 'Please select a dispensary location before adding items to your cart.',
    });
  });

  it('adds item to cart and shows success toast when a location is selected', () => {
    mockUseStore.mockReturnValue({
      selectedLocationId: 'loc1',
      addToCart: mockAddToCart,
    });

    render(<ProductDetailsClient product={mockProduct} summary={mockSummary} />);
    
    const addToCartButton = screen.getByRole('button', { name: /Add to Cart/i });
    fireEvent.click(addToCartButton);

    expect(mockAddToCart).toHaveBeenCalledWith(mockProduct, 'loc1');
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Added to Cart!',
      description: 'Cosmic Caramels has been added to your cart.',
    });
  });

  it('shows a toast if a non-logged-in user tries to give feedback', () => {
    render(<ProductDetailsClient product={mockProduct} summary={mockSummary} />);

    const likeButton = screen.getByLabelText('Like');
    fireEvent.click(likeButton);

    expect(mockUpdateProductFeedback).not.toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith({
        variant: 'destructive',
        title: 'Authentication Required',
        description: 'You must be signed in to leave feedback.',
    });
  });
});
