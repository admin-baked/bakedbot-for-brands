import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BrandDashboardClient from '../dashboard-client';
import { getBrandDashboardData } from '../actions';
import '@testing-library/jest-dom';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
    Activity: () => <span data-testid="icon-activity" />,
    Globe: () => <span data-testid="icon-globe" />,
    CheckCircle: () => <span data-testid="icon-check-circle" />,
    AlertCircle: () => <span data-testid="icon-alert-circle" />,
    Clock: () => <span data-testid="icon-clock" />,
    Inbox: () => <span data-testid="icon-inbox" />
}));

// Mock getBrandDashboardData action
jest.mock('../actions', () => ({
    getBrandDashboardData: jest.fn()
}));

// Mock child components to simplify testing
jest.mock('@/components/dashboard/sync-toggle', () => ({
    SyncToggle: jest.fn(() => <div data-testid="sync-toggle">Sync Toggle</div>)
}));

jest.mock('@/components/dashboard/data-import-dropdown', () => ({
    DataImportDropdown: jest.fn(() => <div data-testid="data-import">Data Import</div>)
}));

jest.mock('@/components/dashboard/setup-checklist', () => ({
    SetupChecklist: jest.fn(() => <div data-testid="setup-checklist">Setup Checklist</div>)
}));

jest.mock('@/components/dashboard/managed-pages-list', () => ({
    ManagedPagesList: jest.fn(() => <div data-testid="managed-pages">Managed Pages</div>)
}));

jest.mock('../components/brand-kpi-grid', () => ({
    BrandKPIs: jest.fn(() => <div data-testid="brand-kpis">Brand KPIs</div>)
}));

jest.mock('../components/brand-chat-widget', () => ({
    BrandChatWidget: jest.fn(() => <div data-testid="brand-chat">Brand Chat</div>)
}));

jest.mock('../components/brand-right-sidebar', () => ({
    BrandRightRail: jest.fn(() => <div data-testid="brand-right-rail">Right Rail</div>)
}));

jest.mock('../components/brand-playbooks-list', () => ({
    BrandPlaybooksList: jest.fn(() => <div data-testid="playbooks-list">Playbooks List</div>)
}));

// Mock Sheet components
jest.mock('@/components/ui/sheet', () => ({
    Sheet: ({ children, open, onOpenChange }: any) => (
        <div data-testid="sheet" data-open={open}>
            {open && children}
        </div>
    ),
    SheetContent: ({ children }: any) => (
        <div data-testid="sheet-content">{children}</div>
    ),
    SheetHeader: ({ children }: any) => (
        <div data-testid="sheet-header">{children}</div>
    ),
    SheetTitle: ({ children }: any) => (
        <h2 data-testid="sheet-title">{children}</h2>
    ),
    SheetDescription: ({ children }: any) => (
        <p data-testid="sheet-description">{children}</p>
    )
}));

describe('BrandDashboardClient', () => {
    const mockBrandId = 'test-brand-123';

    beforeEach(() => {
        jest.clearAllMocks();
        (getBrandDashboardData as jest.Mock).mockResolvedValue({
            meta: { name: 'Test Brand', state: 'IL' },
            sync: { products: 50, competitors: 5, lastSynced: Date.now() },
            alerts: { critical: 0 },
            coverage: { value: 12 }
        });
    });

    describe('Dashboard rendering', () => {
        it('renders all main components', async () => {
            render(<BrandDashboardClient brandId={mockBrandId} />);

            await waitFor(() => {
                expect(screen.getByText('Brand Console')).toBeInTheDocument();
            });

            expect(screen.getByTestId('setup-checklist')).toBeInTheDocument();
            expect(screen.getByTestId('brand-kpis')).toBeInTheDocument();
            expect(screen.getByTestId('brand-chat')).toBeInTheDocument();
            expect(screen.getByTestId('managed-pages')).toBeInTheDocument();
            expect(screen.getByTestId('playbooks-list')).toBeInTheDocument();
            expect(screen.getByTestId('brand-right-rail')).toBeInTheDocument();
        });

        it('fetches brand dashboard data on mount', async () => {
            render(<BrandDashboardClient brandId={mockBrandId} />);

            await waitFor(() => {
                expect(getBrandDashboardData).toHaveBeenCalledWith(mockBrandId);
            });
        });

        it('displays brand name from loaded data', async () => {
            render(<BrandDashboardClient brandId={mockBrandId} />);

            await waitFor(() => {
                expect(screen.getByText('Test Brand')).toBeInTheDocument();
            });
        });
    });

    describe('Sticky bottom bar', () => {
        it('displays critical alerts count', async () => {
            render(<BrandDashboardClient brandId={mockBrandId} />);

            await waitFor(() => {
                expect(screen.getByText('0 critical alerts')).toBeInTheDocument();
            });
        });

        it('displays active retailers count', async () => {
            render(<BrandDashboardClient brandId={mockBrandId} />);

            await waitFor(() => {
                expect(screen.getByText('12 active retailers')).toBeInTheDocument();
            });
        });

        it('shows green indicator when no critical alerts', async () => {
            render(<BrandDashboardClient brandId={mockBrandId} />);

            await waitFor(() => {
                const indicator = document.querySelector('.bg-green-500');
                expect(indicator).toBeInTheDocument();
            });
        });

        it('shows red pulsing indicator when critical alerts exist', async () => {
            (getBrandDashboardData as jest.Mock).mockResolvedValue({
                meta: { name: 'Test Brand' },
                alerts: { critical: 3 },
                coverage: { value: 10 }
            });

            render(<BrandDashboardClient brandId={mockBrandId} />);

            await waitFor(() => {
                expect(screen.getByText('3 critical alerts')).toBeInTheDocument();
            });

            const indicator = document.querySelector('.bg-red-500.animate-pulse');
            expect(indicator).toBeInTheDocument();
        });
    });

    describe('Review Queue functionality', () => {
        it('renders Review Queue button in bottom bar', async () => {
            render(<BrandDashboardClient brandId={mockBrandId} />);

            await waitFor(() => {
                expect(screen.getByText('Review Queue')).toBeInTheDocument();
            });
        });

        it('opens Review Queue sheet when button is clicked', async () => {
            render(<BrandDashboardClient brandId={mockBrandId} />);

            const reviewQueueButton = screen.getByText('Review Queue');
            fireEvent.click(reviewQueueButton);

            await waitFor(() => {
                const sheet = screen.getByTestId('sheet');
                expect(sheet).toHaveAttribute('data-open', 'true');
            });
        });

        it('shows "All caught up!" empty state when no review items', async () => {
            render(<BrandDashboardClient brandId={mockBrandId} />);

            fireEvent.click(screen.getByText('Review Queue'));

            await waitFor(() => {
                expect(screen.getByText('All caught up!')).toBeInTheDocument();
                expect(screen.getByText('No items need your review right now.')).toBeInTheDocument();
            });
        });

        it('displays sheet title and description', async () => {
            render(<BrandDashboardClient brandId={mockBrandId} />);

            fireEvent.click(screen.getByText('Review Queue'));

            await waitFor(() => {
                expect(screen.getByTestId('sheet-title')).toBeInTheDocument();
                expect(screen.getByText('Items requiring your review and approval')).toBeInTheDocument();
            });
        });
    });

    describe('Market filter dropdown', () => {
        it('renders market filter with "All Markets" by default', async () => {
            render(<BrandDashboardClient brandId={mockBrandId} />);

            await waitFor(() => {
                expect(screen.getByText('All Markets')).toBeInTheDocument();
            });
        });
    });

    describe('Error handling', () => {
        it('handles null data gracefully', async () => {
            (getBrandDashboardData as jest.Mock).mockResolvedValue(null);

            render(<BrandDashboardClient brandId={mockBrandId} />);

            // Should still render without crashing
            await waitFor(() => {
                expect(screen.getByText('Brand Console')).toBeInTheDocument();
            });

            // Should show fallback brand ID (may be truncated in UI)
            // Look for partial text match that handles truncation
            expect(screen.getByText(/test-bra/)).toBeInTheDocument();
        });
    });
});
