import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrandMenuHeader } from '../brand-menu-header';
import '@testing-library/jest-dom';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
    Menu: ({ className }: { className?: string }) => <span data-testid="menu-icon" className={className}>☰</span>,
    Search: ({ className }: { className?: string }) => <span data-testid="search-icon" className={className}>🔍</span>,
    ShoppingCart: ({ className }: { className?: string }) => <span data-testid="cart-icon" className={className}>🛒</span>,
    MapPin: ({ className }: { className?: string }) => <span data-testid="map-pin-icon" className={className}>📍</span>,
    User: ({ className }: { className?: string }) => <span data-testid="user-icon" className={className}>👤</span>,
    Leaf: ({ className }: { className?: string }) => <span data-testid="leaf-icon" className={className}>🌿</span>,
    CheckCircle: ({ className }: { className?: string }) => <span data-testid="check-icon" className={className}>✓</span>,
    X: ({ className }: { className?: string }) => <span data-testid="x-icon" className={className}>✕</span>,
    ArrowRight: ({ className }: { className?: string }) => <span data-testid="arrow-icon" className={className}>→</span>,
    Heart: ({ className }: { className?: string }) => <span data-testid="heart-icon" className={className}>♥</span>,
    Store: ({ className }: { className?: string }) => <span data-testid="store-icon" className={className}>🏪</span>,
    Truck: ({ className }: { className?: string }) => <span data-testid="truck-icon" className={className}>🚚</span>,
}));

// Mock next/image
jest.mock('next/image', () => ({
    __esModule: true,
    default: ({ src, alt, ...props }: { src: string; alt: string }) => (
        <img src={src} alt={alt} {...props} />
    ),
}));

// Mock next/link
jest.mock('next/link', () => ({
    __esModule: true,
    default: ({ children, href }: { children: React.ReactNode; href: string }) => (
        <a href={href}>{children}</a>
    ),
}));

// Mock Sheet components
jest.mock('@/components/ui/sheet', () => ({
    Sheet: ({ children }: { children: React.ReactNode }) => <div data-testid="sheet">{children}</div>,
    SheetContent: ({ children }: { children: React.ReactNode }) => <div data-testid="sheet-content">{children}</div>,
    SheetTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => (
        <div data-testid="sheet-trigger">{children}</div>
    ),
    SheetHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SheetTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

describe('BrandMenuHeader', () => {
    const mockOnSearch = jest.fn();
    const mockOnCartClick = jest.fn();
    const mockOnLocationClick = jest.fn();

    const defaultProps = {
        brandName: 'Test Brand',
        onSearch: mockOnSearch,
        onCartClick: mockOnCartClick,
        onLocationClick: mockOnLocationClick,
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Brand display', () => {
        it('renders brand name', () => {
            render(<BrandMenuHeader {...defaultProps} />);
            // Brand name appears in multiple places (header and mobile sheet)
            expect(screen.getAllByText('Test Brand').length).toBeGreaterThan(0);
        });

        it('renders verified badge when verified', () => {
            render(<BrandMenuHeader {...defaultProps} verified={true} />);
            expect(screen.getAllByTestId('check-icon').length).toBeGreaterThan(0);
        });
    });

    describe('Local Pickup Mode (default)', () => {
        it('shows "Order Online, Pickup at Dispensary" in top bar', () => {
            render(<BrandMenuHeader {...defaultProps} purchaseModel="local_pickup" />);
            expect(screen.getByText(/Order Online, Pickup at Dispensary/i)).toBeInTheDocument();
        });

        it('shows "500+ Retail Partners" message', () => {
            render(<BrandMenuHeader {...defaultProps} purchaseModel="local_pickup" />);
            expect(screen.getByText(/500\+ Retail Partners/i)).toBeInTheDocument();
        });

        it('shows "Find Near Me" nav link', () => {
            render(<BrandMenuHeader {...defaultProps} purchaseModel="local_pickup" />);
            // "Find Near Me" appears in both desktop nav and mobile menu
            expect(screen.getAllByText('Find Near Me').length).toBeGreaterThan(0);
        });
    });

    describe('Online Only Mode (hemp e-commerce)', () => {
        it('shows "Free Shipping" in top bar for online_only', () => {
            render(<BrandMenuHeader {...defaultProps} purchaseModel="online_only" />);
            expect(screen.getByText(/Free Shipping/i)).toBeInTheDocument();
        });

        it('shows "Ships Nationwide" when shipsNationwide is true', () => {
            render(<BrandMenuHeader {...defaultProps} purchaseModel="online_only" shipsNationwide={true} />);
            expect(screen.getByText(/Ships Nationwide/i)).toBeInTheDocument();
        });

        it('hides "500+ Retail Partners" for online_only', () => {
            render(<BrandMenuHeader {...defaultProps} purchaseModel="online_only" />);
            expect(screen.queryByText(/500\+ Retail Partners/i)).not.toBeInTheDocument();
        });

        it('hides "Find Near Me" nav link for online_only', () => {
            render(<BrandMenuHeader {...defaultProps} purchaseModel="online_only" />);
            // Check that Find Near Me doesn't exist in nav links
            const links = screen.getAllByRole('link');
            const findNearMeLink = links.find(link => link.textContent?.includes('Find Near Me'));
            expect(findNearMeLink).toBeUndefined();
        });
    });

    describe('Cart functionality', () => {
        it('displays cart item count', () => {
            render(<BrandMenuHeader {...defaultProps} cartItemCount={3} />);
            expect(screen.getByText('3')).toBeInTheDocument();
        });

        it('calls onCartClick when cart is clicked', () => {
            render(<BrandMenuHeader {...defaultProps} cartItemCount={2} />);
            const cartButton = screen.getAllByTestId('cart-icon')[0].closest('button');
            if (cartButton) {
                fireEvent.click(cartButton);
                expect(mockOnCartClick).toHaveBeenCalled();
            }
        });
    });

    describe('Selected dispensary display', () => {
        it('shows selected dispensary info for local_pickup', () => {
            render(
                <BrandMenuHeader
                    {...defaultProps}
                    purchaseModel="local_pickup"
                    selectedDispensary={{
                        name: 'Green Leaf Dispensary',
                        city: 'Los Angeles',
                        state: 'CA',
                    }}
                />
            );
            // Dispensary name appears in both desktop header and mobile menu
            expect(screen.getAllByText('Green Leaf Dispensary').length).toBeGreaterThan(0);
        });
    });

    describe('Navigation links', () => {
        it('shows Products link', () => {
            render(<BrandMenuHeader {...defaultProps} />);
            // Products appears in both desktop nav and mobile menu
            expect(screen.getAllByText('Products').length).toBeGreaterThan(0);
        });

        it('shows About link', () => {
            render(<BrandMenuHeader {...defaultProps} />);
            // About appears in both desktop nav and mobile menu
            expect(screen.getAllByText('About').length).toBeGreaterThan(0);
        });
    });
});
