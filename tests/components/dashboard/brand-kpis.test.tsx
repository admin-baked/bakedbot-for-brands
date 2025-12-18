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

    it('displays data freshness indicators', () => {
        renderWithContext(<BrandKPIs />);

        // Check for "2m ago", "1h ago", etc based on the stub data in the component
        expect(screen.getByText('2m ago')).toBeInTheDocument();
        expect(screen.getByText('1h ago')).toBeInTheDocument();
        expect(screen.getByText('5m ago')).toBeInTheDocument();
        expect(screen.getByText('12m ago')).toBeInTheDocument();
        expect(screen.getByText('Real-time')).toBeInTheDocument();
    });

    it('displays trend indicators', () => {
        renderWithContext(<BrandKPIs />);

        expect(screen.getByText('+2')).toBeInTheDocument();
        expect(screen.getByText('+5%')).toBeInTheDocument();
        expect(screen.getByText('-16')).toBeInTheDocument();
    });

    it('shows compliance status correctly', () => {
        renderWithContext(<BrandKPIs />);

        // Based on stats.compliance.approved = 8 and blocked = 1
        expect(screen.getByText('8')).toBeInTheDocument();
        expect(screen.getByText('1 Blocked')).toBeInTheDocument();
    });

    it('renders info icons for tooltips', () => {
        renderWithContext(<BrandKPIs />);
        const infoIcons = screen.getAllByTestId('icon-info');
        expect(infoIcons.length).toBe(5);
    });
});
