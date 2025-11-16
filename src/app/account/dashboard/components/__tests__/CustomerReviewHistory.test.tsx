
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CustomerReviewHistory from '../customer-review-history';
import { useMenuData } from '@/hooks/use-menu-data';
import type { Review, Product } from '@/firebase/converters';

// Mock the useMenuData hook
jest.mock('@/hooks/use-menu-data');
const mockUseMenuData = useMenuData as jest.Mock;

// Mock next/link
jest.mock('next/link', () => {
    return ({ children, href }: { children: React.ReactNode, href: string }) => {
        return <a href={href}>{children}</a>;
    };
});

const mockProducts: Partial<Product>[] = [
    { id: 'prod1', name: 'Cosmic Caramels', brandId: 'default' },
    { id: 'prod2', name: 'Giggle Gummies', brandId: 'default' },
];

const mockReviews: Partial<Review>[] = [
    { id: 'rev1', productId: 'prod1', rating: 5, text: 'Absolutely amazing, best sleep ever!' },
    { id: 'rev2', productId: 'prod2', rating: 3, text: 'Pretty good, but a bit too sweet for me.' },
];

describe('CustomerReviewHistory', () => {
    beforeEach(() => {
        // Reset mocks before each test
        jest.clearAllMocks();
        // Default mock implementation
        mockUseMenuData.mockReturnValue({
            products: mockProducts,
            isLoading: false,
        });
    });

    it('should render the loading state with skeletons', () => {
        render(<CustomerReviewHistory reviews={null} isLoading={true} />);

        expect(screen.getByText('Your Reviews')).toBeInTheDocument();
        expect(screen.getAllByRole('generic').some(el => el.classList.contains('animate-pulse'))).toBe(true);
    });

    it('should render the empty state when no reviews are provided', () => {
        render(<CustomerReviewHistory reviews={[]} isLoading={false} />);

        expect(screen.getByText("You haven't left any reviews yet.")).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Leave your first review' })).toBeInTheDocument();
    });

    it('should render a list of reviews correctly', async () => {
        render(<CustomerReviewHistory reviews={mockReviews} isLoading={false} />);

        // Check for review 1
        await waitFor(() => expect(screen.getByText('Cosmic Caramels')).toBeInTheDocument());
        expect(screen.getByText(/"Absolutely amazing, best sleep ever!"/)).toBeInTheDocument();
        
        // Check for review 2
        expect(screen.getByText('Giggle Gummies')).toBeInTheDocument();
        expect(screen.getByText(/"Pretty good, but a bit too sweet for me."/)).toBeInTheDocument();
    });

    it('should render the correct star rating for each review', () => {
        render(<CustomerReviewHistory reviews={mockReviews} isLoading={false} />);
        
        const review1Container = screen.getByText('Cosmic Caramels').closest('div');
        const review2Container = screen.getByText('Giggle Gummies').closest('div');

        // Review 1 has 5 stars
        const filledStars1 = review1Container!.querySelectorAll('.fill-yellow-400');
        expect(filledStars1.length).toBe(5);

        // Review 2 has 3 stars
        const filledStars2 = review2Container!.querySelectorAll('.fill-yellow-400');
        expect(filledStars2.length).toBe(3);
    });

    it('should link to the correct product page', () => {
        render(<CustomerReviewHistory reviews={mockReviews} isLoading={false} />);
        
        const link1 = screen.getByText('Cosmic Caramels');
        expect(link1).toHaveAttribute('href', '/menu/default/products/prod1');

        const link2 = screen.getByText('Giggle Gummies');
        expect(link2).toHaveAttribute('href', '/menu/default/products/prod2');
    });
});
