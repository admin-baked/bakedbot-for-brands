import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import BrandDashboardClient from '@/app/dashboard/brand/dashboard-client';
import { getBrandDashboardData } from '@/app/dashboard/brand/actions';

jest.mock('lucide-react', () => ({
    Activity: () => <span data-testid="icon-activity" />,
    Globe: () => <span data-testid="icon-globe" />,
    CheckCircle: () => <span data-testid="icon-check-circle" />,
    AlertCircle: () => <span data-testid="icon-alert-circle" />,
    Clock: () => <span data-testid="icon-clock" />,
    Inbox: () => <span data-testid="icon-inbox" />,
}));

jest.mock('@/app/dashboard/brand/actions', () => ({
    getBrandDashboardData: jest.fn(),
}));

jest.mock('@/components/dashboard/sync-toggle', () => ({
    SyncToggle: jest.fn(() => <div data-testid="sync-toggle">Sync Toggle</div>),
}));

jest.mock('@/components/dashboard/data-import-dropdown', () => ({
    DataImportDropdown: jest.fn(() => <div data-testid="data-import">Data Import</div>),
}));

jest.mock('@/components/dashboard/setup-checklist', () => ({
    SetupChecklist: jest.fn(() => <div data-testid="setup-checklist">Setup Checklist</div>),
}));

jest.mock('@/components/dashboard/managed-pages-list', () => ({
    ManagedPagesList: jest.fn(() => <div data-testid="managed-pages">Managed Pages</div>),
}));

jest.mock('@/app/dashboard/brand/components/brand-kpi-grid', () => ({
    BrandKPIs: jest.fn(() => <div data-testid="brand-kpis">Brand KPIs</div>),
}));

jest.mock('@/app/dashboard/brand/components/brand-chat-widget', () => ({
    BrandChatWidget: jest.fn(() => <div data-testid="brand-chat">Brand Chat</div>),
}));

jest.mock('@/app/dashboard/brand/components/brand-right-sidebar', () => ({
    BrandRightRail: jest.fn(() => <div data-testid="brand-right-rail">Right Rail</div>),
}));

jest.mock('@/app/dashboard/brand/components/brand-playbooks-list', () => ({
    BrandPlaybooksList: jest.fn(() => <div data-testid="playbooks-list">Playbooks List</div>),
}));

jest.mock('@/components/ui/sheet', () => ({
    Sheet: ({ children, open }: any) => (
        <div data-testid="sheet" data-open={String(open)}>
            {open ? children : null}
        </div>
    ),
    SheetContent: ({ children }: any) => <div data-testid="sheet-content">{children}</div>,
    SheetHeader: ({ children }: any) => <div data-testid="sheet-header">{children}</div>,
    SheetTitle: ({ children }: any) => <h2 data-testid="sheet-title">{children}</h2>,
    SheetDescription: ({ children }: any) => <p data-testid="sheet-description">{children}</p>,
}));

describe('BrandDashboardClient Views', () => {
    const brandId = 'test-brand';

    beforeEach(() => {
        jest.clearAllMocks();
        (getBrandDashboardData as jest.Mock).mockResolvedValue({
            meta: { name: 'Test Brand', state: 'IL' },
            sync: { products: 50, competitors: 5, lastSynced: Date.now() },
            alerts: { critical: 0 },
            coverage: { value: 12 },
        });
    });

    it('renders the current brand dashboard shell and widgets', async () => {
        render(<BrandDashboardClient brandId={brandId} />);

        await waitFor(() => {
            expect(screen.getByText('Brand Console')).toBeInTheDocument();
            expect(getBrandDashboardData).toHaveBeenCalledWith(brandId);
        });

        expect(screen.getByTestId('brand-dashboard-client')).toBeInTheDocument();
        expect(screen.getByTestId('data-import')).toBeInTheDocument();
        expect(screen.getByTestId('sync-toggle')).toBeInTheDocument();
        expect(screen.getByTestId('setup-checklist')).toBeInTheDocument();
        expect(screen.getByTestId('brand-kpis')).toBeInTheDocument();
        expect(screen.getByTestId('brand-chat')).toBeInTheDocument();
        expect(screen.getByTestId('managed-pages')).toBeInTheDocument();
        expect(screen.getByTestId('playbooks-list')).toBeInTheDocument();
        expect(screen.getByTestId('brand-right-rail')).toBeInTheDocument();
    });

    it('displays loaded brand metadata in the header and sticky footer', async () => {
        render(<BrandDashboardClient brandId={brandId} />);

        await waitFor(() => {
            expect(screen.getByText('Test Brand')).toBeInTheDocument();
            expect(screen.getByText('0 critical alerts')).toBeInTheDocument();
            expect(screen.getByText('12 active retailers')).toBeInTheDocument();
            expect(screen.getByText('System Healthy')).toBeInTheDocument();
        });
    });

    it('opens the review queue sheet', async () => {
        render(<BrandDashboardClient brandId={brandId} />);

        fireEvent.click(await screen.findByText('Review Queue'));

        await waitFor(() => {
            expect(screen.getByTestId('sheet')).toHaveAttribute('data-open', 'true');
            expect(screen.getByText('All caught up!')).toBeInTheDocument();
            expect(screen.getByText('No items need your review right now.')).toBeInTheDocument();
        });
    });

    it('falls back to the brand id badge when live data is unavailable', async () => {
        (getBrandDashboardData as jest.Mock).mockResolvedValue(null);

        render(<BrandDashboardClient brandId={brandId} />);

        await waitFor(() => {
            expect(screen.getByText('Brand Console')).toBeInTheDocument();
            expect(screen.getByText(/Brand Mode/i)).toBeInTheDocument();
        });
    });
});
