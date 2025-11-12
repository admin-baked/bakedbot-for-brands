
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import ProductDetailsClient from '../components/product-details-client';
import { useCart } from '@/hooks/use-cart';
import { useStore } from '@/hooks/use-store';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase/auth/use-user';
import * as Actions from '../actions';
import type { Product } from '@/lib/types';
import type { SummarizeReviewsOutput } from '@/ai/flows/summarize-reviews';
import React from 'react';

// Mock the dependencies
jest.mock('@/hooks/use-cart');
jest.mock('@/hooks/use-store');
jest.mock('@/hooks/use-toast');
jest.mock('@/firebase/auth/use-user');
jest.mock('../actions', () => ({
  ...jest.requireActual('../actions'), // import and retain all actual exports
  updateProductFeedback: jest.fn(), // mock this specific export
}));

const mockAddToCart = jest.fn();
const mockToast = jest.fn();
const mockUpdateProductFeedback = Actions.updateProductFeedback as jest.Mock;

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
    // Reset mocks before each test
    jest.clearAllMocks();

    // Setup default mock implementations
    (useCart as jest.Mock).mockReturnValue({ addToCart: mockAddToCart });
    (useToast as jest.Mock).mockReturnValue({ toast: mockToast });
    (useUser as jest.Mock).mockReturnValue({ user: null, isUserLoading: false });

    // Mock useTransition for the feedback test
    jest.spyOn(React, 'useTransition').mockImplementation(() => [false, jest.fn((callback) => callback())]);

    // Mock useFormState for feedback
    jest.spyOn(React, 'useFormState').mockImplementation(() => [{ message: '', error: false }, jest.fn()]);

    // Default state: no location selected
    (useStore as jest.Mock).mockReturnValue({ selectedLocationId: null });
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
    // Override the store mock for this test
    (useStore as jest.Mock).mockReturnValue({ selectedLocationId: 'loc1' });

    render(<ProductDetailsClient product={mockProduct} summary={mockSummary} />);
    
    const addToCartButton = screen.getByRole('button', { name: /Add to Cart/i });
    fireEvent.click(addToCartButton);

    expect(mockAddToCart).toHaveBeenCalledWith(mockProduct, 'loc1');
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Added to Cart!',
      description: 'Cosmic Caramels has been added to your cart.',
    });
  });

  it('calls updateProductFeedback when the like button is clicked by a logged-in user', async () => {
    // Mock user as logged in
    (useUser as jest.Mock).mockReturnValue({ user: mockUser, isUserLoading: false });
    
    // Mock the server action response
    mockUpdateProductFeedback.mockResolvedValue({ error: false, message: 'Feedback submitted!' });
    
    const { getByLabelText } = render(<ProductDetailsClient product={mockProduct} summary={mockSummary} />);

    const likeButton = getByLabelText('Like');
    fireEvent.click(likeButton);

    await waitFor(() => {
        expect(mockUpdateProductFeedback).toHaveBeenCalled();
        // We can inspect the FormData object that was passed
        const formData = mockUpdateProductFeedback.mock.calls[0][0];
        expect(formData.get('productId')).toBe('prod-1');
        expect(formData.get('feedbackType')).toBe('like');
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
