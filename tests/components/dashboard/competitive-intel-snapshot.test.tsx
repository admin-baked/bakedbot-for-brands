import React from 'react';
import { render, screen } from '@testing-library/react';
import { CompetitiveIntelSnapshot } from '@/app/dashboard/brand/components/competitive-intel-snapshot';

// Mock Lucide Icons
jest.mock('lucide-react', () => ({
    Users: () => <div data-testid="icon-users" />,
    ArrowUpRight: () => <div data-testid="icon-arrow-up-right" />,
    ArrowDownRight: () => <div data-testid="icon-arrow-down-right" />,
    Target: () => <div data-testid="icon-target" />,
    Tag: () => <div data-testid="icon-tag" />,
    LayoutGrid: () => <div data-testid="icon-layout-grid" />,
    ExternalLink: () => <div data-testid="icon-external-link" />,
    Plus: () => <div data-testid="icon-plus" />,
}));

// Mock Next.js Link
jest.mock('next/link', () => ({
    __esModule: true,
    default: ({ children, href }: { children: React.ReactNode; href: string }) => (
        <a href={href}>{children}</a>
    ),
}));

// Mock CannMenusAttribution
jest.mock('@/components/ui/cannmenus-attribution', () => ({
    CannMenusAttribution: () => <div data-testid="cannmenus-attribution" />,
}));

describe('CompetitiveIntelSnapshot Component', () => {
    const mockIntel = {
        competitorsTracked: 6,
        pricePosition: { delta: '+6%', status: 'above' },
        undercutters: 3,
        promoActivity: { competitorCount: 5, ownCount: 1 },
        shelfShareTrend: { added: 2, dropped: 1, delta: '+1' },
    };

    it('renders the header and section titles', () => {
        render(<CompetitiveIntelSnapshot intel={mockIntel} />);

        expect(screen.getByText('Competitive Intel (Ezal)')).toBeInTheDocument();
        expect(screen.getByText('Live Feed')).toBeInTheDocument();
        expect(screen.getByText('Competitors')).toBeInTheDocument();
        expect(screen.getByText('Price Index')).toBeInTheDocument();
    });

    it('displays the correct intel stats from data', () => {
        render(<CompetitiveIntelSnapshot intel={mockIntel} />);

        // Competitors count
        expect(screen.getByText('6')).toBeInTheDocument();

        // Price Position delta
        expect(screen.getByText('+6%')).toBeInTheDocument();

        // Undercutters
        expect(screen.getByText('3 Retailers')).toBeInTheDocument();
        expect(screen.getByText('Undercutters this week')).toBeInTheDocument();

        // Promo Gap
        expect(screen.getByText('Promo Gap detected')).toBeInTheDocument();
        expect(screen.getByText('5 vs 1')).toBeInTheDocument();

        // Shelf Share Trend
        expect(screen.getByText('Shelf Share Trend')).toBeInTheDocument();
        expect(screen.getByText('+1')).toBeInTheDocument();
    });

    it('has a link to the intelligence page', () => {
        render(<CompetitiveIntelSnapshot intel={mockIntel} />);
        const link = screen.getByRole('link', { name: /View Intel/i });
        expect(link).toHaveAttribute('href', '/dashboard/intelligence');
    });

    it('renders default zeros when no intel data passed', () => {
        render(<CompetitiveIntelSnapshot />);
        // Should render with default 0 values
        expect(screen.getByText('Competitive Intel (Ezal)')).toBeInTheDocument();
        expect(screen.getByText('0 Retailers')).toBeInTheDocument();
    });
});
