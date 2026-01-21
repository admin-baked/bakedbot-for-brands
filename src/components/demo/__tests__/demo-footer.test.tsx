import React from 'react';
import { render, screen } from '@testing-library/react';
import { DemoFooter } from '../demo-footer';
import '@testing-library/jest-dom';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
    Leaf: ({ className }: { className?: string }) => <span data-testid="leaf-icon" className={className}>🌿</span>,
    MapPin: ({ className }: { className?: string }) => <span data-testid="map-pin-icon" className={className}>📍</span>,
    Phone: ({ className }: { className?: string }) => <span data-testid="phone-icon" className={className}>📞</span>,
    Mail: ({ className }: { className?: string }) => <span data-testid="mail-icon" className={className}>✉️</span>,
    Clock: ({ className }: { className?: string }) => <span data-testid="clock-icon" className={className}>🕐</span>,
    Facebook: ({ className }: { className?: string }) => <span data-testid="facebook-icon" className={className}>f</span>,
    Instagram: ({ className }: { className?: string }) => <span data-testid="instagram-icon" className={className}>📷</span>,
    Twitter: ({ className }: { className?: string }) => <span data-testid="twitter-icon" className={className}>🐦</span>,
    ArrowRight: ({ className }: { className?: string }) => <span data-testid="arrow-icon" className={className}>→</span>,
    Shield: ({ className }: { className?: string }) => <span data-testid="shield-icon" className={className}>🛡️</span>,
    Award: ({ className }: { className?: string }) => <span data-testid="award-icon" className={className}>🏆</span>,
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

describe('DemoFooter', () => {
    describe('Local Pickup Mode (default)', () => {
        it('renders brand name', () => {
            render(<DemoFooter brandName="Test Brand" />);
            expect(screen.getByText('Test Brand')).toBeInTheDocument();
        });

        it('shows "Fast Delivery" trust badge for local_pickup', () => {
            render(<DemoFooter purchaseModel="local_pickup" />);
            expect(screen.getByText('Fast Delivery')).toBeInTheDocument();
        });

        it('shows "Same-day delivery available" description', () => {
            render(<DemoFooter purchaseModel="local_pickup" />);
            expect(screen.getByText('Same-day delivery available')).toBeInTheDocument();
        });

        it('shows dispensary shop links (Flower, Pre-Rolls, Vapes)', () => {
            render(<DemoFooter purchaseModel="local_pickup" />);
            expect(screen.getByText('Flower')).toBeInTheDocument();
            expect(screen.getByText('Pre-Rolls')).toBeInTheDocument();
            expect(screen.getByText('Vapes')).toBeInTheDocument();
        });

        it('shows Locations link for local_pickup', () => {
            render(<DemoFooter purchaseModel="local_pickup" />);
            expect(screen.getByText('Locations')).toBeInTheDocument();
        });
    });

    describe('Online Only Mode (hemp e-commerce)', () => {
        it('shows "Free Shipping" trust badge for online_only', () => {
            render(<DemoFooter purchaseModel="online_only" />);
            expect(screen.getByText('Free Shipping')).toBeInTheDocument();
        });

        it('shows "Free shipping on all orders" description', () => {
            render(<DemoFooter purchaseModel="online_only" />);
            expect(screen.getByText('Free shipping on all orders')).toBeInTheDocument();
        });

        it('shows hemp-appropriate shop links for online_only', () => {
            render(<DemoFooter purchaseModel="online_only" />);
            expect(screen.getByText('Edibles')).toBeInTheDocument();
            expect(screen.getByText('Merchandise')).toBeInTheDocument();
            expect(screen.getByText('Best Sellers')).toBeInTheDocument();
        });

        it('hides Locations link for online_only', () => {
            render(<DemoFooter purchaseModel="online_only" />);
            expect(screen.queryByText('Locations')).not.toBeInTheDocument();
        });

        it('shows Shipping Info link for online_only', () => {
            render(<DemoFooter purchaseModel="online_only" />);
            expect(screen.getByText('Shipping Info')).toBeInTheDocument();
        });
    });

    describe('Custom location display', () => {
        it('displays custom address when provided', () => {
            render(
                <DemoFooter
                    purchaseModel="online_only"
                    location={{
                        address: '25690 Frampton Ave #422',
                        city: 'Harbor City',
                        state: 'CA',
                        zip: '90710',
                    }}
                />
            );
            expect(screen.getByText(/25690 Frampton Ave/i)).toBeInTheDocument();
            expect(screen.getByText(/Harbor City/i)).toBeInTheDocument();
        });

        it('displays email when provided', () => {
            render(
                <DemoFooter
                    location={{
                        email: 'test@example.com',
                    }}
                />
            );
            expect(screen.getByText('test@example.com')).toBeInTheDocument();
        });

        it('displays phone when provided', () => {
            render(
                <DemoFooter
                    location={{
                        phone: '(555) 123-4567',
                    }}
                />
            );
            expect(screen.getByText('(555) 123-4567')).toBeInTheDocument();
        });
    });

    describe('Trust badges', () => {
        it('shows Lab Tested badge', () => {
            render(<DemoFooter />);
            expect(screen.getByText('Lab Tested')).toBeInTheDocument();
        });

        it('shows Rewards Program badge', () => {
            render(<DemoFooter />);
            expect(screen.getByText('Rewards Program')).toBeInTheDocument();
        });
    });

    describe('Legal links', () => {
        it('shows Privacy Policy link', () => {
            render(<DemoFooter />);
            expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
        });

        it('shows Terms of Service link', () => {
            render(<DemoFooter />);
            expect(screen.getByText('Terms of Service')).toBeInTheDocument();
        });
    });

    describe('Custom shop links', () => {
        it('uses custom shop links when provided', () => {
            render(
                <DemoFooter
                    customShopLinks={[
                        { label: 'Custom Link 1', href: '#custom1' },
                        { label: 'Custom Link 2', href: '#custom2' },
                    ]}
                />
            );
            expect(screen.getByText('Custom Link 1')).toBeInTheDocument();
            expect(screen.getByText('Custom Link 2')).toBeInTheDocument();
        });
    });
});
