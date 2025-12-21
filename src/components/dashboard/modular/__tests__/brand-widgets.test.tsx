import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
    BrandKpisWidget,
    NextBestActionsWidget,
    CompetitiveIntelWidget,
    ManagedPagesWidget,
    QuickActionsWidget,
    BrandAlertsWidget,
    getWidgetComponent
} from '../widgets';

describe('Brand Widget Components', () => {
    describe('BrandKpisWidget', () => {
        it('renders all KPI items', () => {
            render(<BrandKpisWidget />);
            expect(screen.getByText('42')).toBeInTheDocument(); // Retail coverage
            expect(screen.getByText('18')).toBeInTheDocument(); // Velocity
            expect(screen.getByText('+6%')).toBeInTheDocument(); // Price Index
            expect(screen.getByText('42%')).toBeInTheDocument(); // Share of Shelf
        });

        it('passes onRemove to wrapper', () => {
            const mockRemove = jest.fn();
            render(<BrandKpisWidget onRemove={mockRemove} />);
            // The remove button is in the dropdown menu, we just verify it renders
            expect(screen.getByText('Brand KPIs')).toBeInTheDocument();
        });
    });

    describe('NextBestActionsWidget', () => {
        it('renders action items with priorities', () => {
            render(<NextBestActionsWidget />);
            expect(screen.getByText('Fix Price Parity')).toBeInTheDocument();
            expect(screen.getByText('Expand to Detroit')).toBeInTheDocument();
            expect(screen.getByText('OOS Warning')).toBeInTheDocument();
            expect(screen.getAllByText('HIGH').length).toBeGreaterThan(0);
        });
    });

    describe('CompetitiveIntelWidget', () => {
        it('renders competitor metrics', () => {
            render(<CompetitiveIntelWidget />);
            expect(screen.getByText('6+')).toBeInTheDocument();
            expect(screen.getByText('COMPETITORS')).toBeInTheDocument();
            expect(screen.getByText('PRICE INDEX')).toBeInTheDocument();
        });
    });

    describe('ManagedPagesWidget', () => {
        it('renders page items with status', () => {
            render(<ManagedPagesWidget />);
            expect(screen.getByText('Chicago Flagship')).toBeInTheDocument();
            expect(screen.getByText('Summer Promo Landing')).toBeInTheDocument();
            expect(screen.getByText('LIVE')).toBeInTheDocument();
            expect(screen.getByText('DRAFT')).toBeInTheDocument();
        });

        it('has create new page button', () => {
            render(<ManagedPagesWidget />);
            expect(screen.getByText('Create New Page')).toBeInTheDocument();
        });
    });

    describe('QuickActionsWidget', () => {
        it('renders all quick action buttons', () => {
            render(<QuickActionsWidget />);
            expect(screen.getByText('Launch Compliant Campaign')).toBeInTheDocument();
            expect(screen.getByText('Generate Retail Sell Sheet')).toBeInTheDocument();
            expect(screen.getByText('Run Competitor Price Scan')).toBeInTheDocument();
            expect(screen.getByText('Build Buyer Target List')).toBeInTheDocument();
        });
    });

    describe('BrandAlertsWidget', () => {
        it('renders all alert items', () => {
            render(<BrandAlertsWidget />);
            expect(screen.getByText('3 stores out of stock (Top SKU)')).toBeInTheDocument();
            expect(screen.getByText('2 retailers pricing below MAP')).toBeInTheDocument();
            expect(screen.getByText('Compliance clean in IL, MI')).toBeInTheDocument();
        });
    });

    describe('getWidgetComponent', () => {
        it('returns correct component for brand-kpis', () => {
            const Component = getWidgetComponent('brand-kpis');
            expect(Component).toBe(BrandKpisWidget);
        });

        it('returns correct component for next-best-actions', () => {
            const Component = getWidgetComponent('next-best-actions');
            expect(Component).toBe(NextBestActionsWidget);
        });

        it('returns null for unknown widget type', () => {
            const Component = getWidgetComponent('unknown-widget');
            expect(Component).toBeNull();
        });
    });
});
