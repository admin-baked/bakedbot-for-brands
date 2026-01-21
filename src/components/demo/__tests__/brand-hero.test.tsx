import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrandHero } from '../brand-hero';
import '@testing-library/jest-dom';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
    MapPin: ({ className }: { className?: string }) => <span data-testid="map-pin-icon" className={className}>📍</span>,
    ArrowRight: ({ className }: { className?: string }) => <span data-testid="arrow-right-icon" className={className}>→</span>,
    CheckCircle: ({ className }: { className?: string }) => <span data-testid="check-circle-icon" className={className}>✓</span>,
    Star: ({ className }: { className?: string }) => <span data-testid="star-icon" className={className}>⭐</span>,
    Leaf: ({ className }: { className?: string }) => <span data-testid="leaf-icon" className={className}>🌿</span>,
    Truck: ({ className }: { className?: string }) => <span data-testid="truck-icon" className={className}>🚚</span>,
    ShoppingCart: ({ className }: { className?: string }) => <span data-testid="cart-icon" className={className}>🛒</span>,
}));

// Mock next/image
jest.mock('next/image', () => ({
    __esModule: true,
    default: ({ src, alt, ...props }: { src: string; alt: string }) => (
        <img src={src} alt={alt} {...props} />
    ),
}));

describe('BrandHero', () => {
    const mockOnFindNearMe = jest.fn();
    const mockOnShopNow = jest.fn();

    const defaultProps = {
        brandName: 'Test Brand',
        onFindNearMe: mockOnFindNearMe,
        onShopNow: mockOnShopNow,
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Local Pickup Mode (default)', () => {
        it('renders brand name', () => {
            render(<BrandHero {...defaultProps} />);
            expect(screen.getByText('Test Brand')).toBeInTheDocument();
        });

        it('shows "Find Near Me" button for local_pickup', () => {
            render(<BrandHero {...defaultProps} purchaseModel="local_pickup" />);
            expect(screen.getByRole('button', { name: /find near me/i })).toBeInTheDocument();
        });

        it('shows dispensary pickup messaging', () => {
            render(<BrandHero {...defaultProps} purchaseModel="local_pickup" />);
            expect(screen.getByText(/Order Online, Pickup In Store/i)).toBeInTheDocument();
        });

        it('calls onFindNearMe when Find Near Me is clicked', () => {
            render(<BrandHero {...defaultProps} purchaseModel="local_pickup" />);
            const button = screen.getByRole('button', { name: /find near me/i });
            fireEvent.click(button);
            expect(mockOnFindNearMe).toHaveBeenCalled();
        });

        it('shows default description for dispensary pickup', () => {
            render(<BrandHero {...defaultProps} purchaseModel="local_pickup" />);
            expect(screen.getByText(/Order online and pick up at a dispensary near you/i)).toBeInTheDocument();
        });
    });

    describe('Online Only Mode (hemp e-commerce)', () => {
        it('hides "Find Near Me" button for online_only', () => {
            render(<BrandHero {...defaultProps} purchaseModel="online_only" />);
            expect(screen.queryByRole('button', { name: /find near me/i })).not.toBeInTheDocument();
        });

        it('shows shipping messaging for online_only', () => {
            render(<BrandHero {...defaultProps} purchaseModel="online_only" />);
            expect(screen.getByText(/Shop Online, Shipped Direct/i)).toBeInTheDocument();
        });

        it('shows "Ships Nationwide" when shipsNationwide is true', () => {
            render(<BrandHero {...defaultProps} purchaseModel="online_only" shipsNationwide={true} />);
            expect(screen.getByText(/Ships Nationwide/i)).toBeInTheDocument();
        });

        it('shows updated description for online_only', () => {
            render(<BrandHero {...defaultProps} purchaseModel="online_only" />);
            expect(screen.getByText(/Shop online and get them shipped directly to your door/i)).toBeInTheDocument();
        });

        it('shows "Shop Products" as primary CTA', () => {
            render(<BrandHero {...defaultProps} purchaseModel="online_only" />);
            expect(screen.getByRole('button', { name: /shop products/i })).toBeInTheDocument();
        });

        it('calls onShopNow when Shop Products is clicked', () => {
            render(<BrandHero {...defaultProps} purchaseModel="online_only" />);
            const button = screen.getByRole('button', { name: /shop products/i });
            fireEvent.click(button);
            expect(mockOnShopNow).toHaveBeenCalled();
        });
    });

    describe('Brand stats display', () => {
        it('displays product count from stats', () => {
            render(
                <BrandHero
                    {...defaultProps}
                    stats={{ products: 25, retailers: 10, rating: 4.8 }}
                />
            );
            // Component shows "{count}+" format
            expect(screen.getByText('25+')).toBeInTheDocument();
        });

        it('displays rating from stats', () => {
            render(
                <BrandHero
                    {...defaultProps}
                    stats={{ products: 25, retailers: 10, rating: 4.8 }}
                />
            );
            expect(screen.getByText('4.8')).toBeInTheDocument();
        });
    });

    describe('Custom branding', () => {
        it('displays custom tagline', () => {
            render(<BrandHero {...defaultProps} tagline="Premium Hemp Products" />);
            expect(screen.getByText('Premium Hemp Products')).toBeInTheDocument();
        });

        it('displays brand logo when provided', () => {
            render(<BrandHero {...defaultProps} brandLogo="https://example.com/logo.png" />);
            const logo = document.querySelector('img[src="https://example.com/logo.png"]');
            expect(logo).toBeInTheDocument();
        });
    });
});
