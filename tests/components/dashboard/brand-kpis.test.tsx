import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrandKPIs } from '@/app/dashboard/brand/components/brand-kpi-grid';
import { TooltipProvider } from '@/components/ui/tooltip';

// Mock Lucide Icons
jest.mock('lucide-react', () => ({
    Store: () => <div data-testid="icon-store" />,
    TrendingUp: () => <div data-testid="icon-trending-up" />,
    DollarSign: () => <div data-testid="icon-dollar-sign" />,
    ShieldCheck: () => <div data-testid="icon-shield-check" />,
    AlertTriangle: () => <div data-testid="icon-alert-triangle" />,
    ArrowUpRight: () => <div data-testid="icon-arrow-up-right" />,
    ArrowDownRight: () => <div data-testid="icon-arrow-down-right" />,
    Info: () => <div data-testid="icon-info" />,
    Clock: () => <div data-testid="icon-clock" />,
    Target: () => <div data-testid="icon-target" />,
}));

describe('BrandKPIs Component', () => {
    const renderWithContext = (ui: React.ReactElement) => {
        return render(
            <TooltipProvider>
                {ui}
            </TooltipProvider>
        );
    };

    it('renders all 5 KPI cards', () => {
        renderWithContext(<BrandKPIs />);

        expect(screen.getByText('Retail Coverage')).toBeInTheDocument();
        expect(screen.getByText('Velocity')).toBeInTheDocument();
        expect(screen.getByText('Price Index')).toBeInTheDocument();
        expect(screen.getByText('Share of Shelf')).toBeInTheDocument();
        expect(screen.getByText('Compliance')).toBeInTheDocument();
    });

    it('displays data freshness indicators with default Live values', () => {
        renderWithContext(<BrandKPIs />);

        // When no data prop passed, all freshness labels default to 'Live' or 'Real-time'
        const liveElements = screen.getAllByText('Live');
        expect(liveElements.length).toBeGreaterThanOrEqual(4);
        expect(screen.getByText('Real-time')).toBeInTheDocument();
    });

    it('displays trend indicators from passed data', () => {
        renderWithContext(<BrandKPIs data={{
            coverage: { value: 12, trend: '+2' },
            velocity: { value: 8, trend: '+5%' },
        }} />);

        expect(screen.getByText('+2')).toBeInTheDocument();
        expect(screen.getByText('+5%')).toBeInTheDocument();
    });

    it('shows compliance status correctly from passed data', () => {
        renderWithContext(<BrandKPIs data={{
            compliance: { approved: 8, blocked: 1 },
        }} />);

        expect(screen.getByText('8')).toBeInTheDocument();
        expect(screen.getByText('1 Blocked')).toBeInTheDocument();
    });

    it('renders info icons for tooltips', () => {
        renderWithContext(<BrandKPIs />);
        const infoIcons = screen.getAllByTestId('icon-info');
        expect(infoIcons.length).toBe(5);
    });
});
