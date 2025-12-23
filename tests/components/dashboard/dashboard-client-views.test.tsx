
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BrandDashboardClient from '@/app/dashboard/brand/dashboard-client';
import { getBrandDashboardData } from '@/app/dashboard/brand/actions';

// Mock dependencies
jest.mock('@/app/dashboard/brand/actions', () => ({
    getBrandDashboardData: jest.fn(),
}));

jest.mock('@/components/ui/tabs', () => ({
    Tabs: ({ children, onValueChange, value }: any) => (
        <div data-testid="tabs" data-value={value} onClick={(e: any) => {
            const val = e.target.getAttribute('data-value');
            if (val) onValueChange(val);
        }}>
            {children}
        </div>
    ),
    TabsList: ({ children }: any) => <div>{children}</div>,
    TabsTrigger: ({ children, value }: any) => (
        <button data-testid={`tab-${value}`} data-value={value}>
            {children}
        </button>
    ),
    TabsContent: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('@/components/dashboard/modular/modular-dashboard', () => ({
    ModularDashboard: ({ isEditable, role }: any) => (
        <div data-testid="modular-dashboard" data-editable={isEditable} data-role={role}>
            ModularDashboard
        </div>
    ),
}));

jest.mock('@/components/dashboard/setup-health', () => ({
    SetupHealth: () => <div data-testid="setup-health">SetupHealth</div>,
}));

jest.mock('@/components/dashboard/quick-start-cards', () => ({
    QuickStartCards: () => <div data-testid="quick-start-cards">QuickStartCards</div>,
}));

jest.mock('@/components/dashboard/task-feed', () => ({
    TaskFeed: () => <div data-testid="task-feed">TaskFeed</div>,
}));

jest.mock('@/components/dashboard/data-import-dropdown', () => ({
    DataImportDropdown: () => <div data-testid="data-import">DataImport</div>,
}));

// Mock localStorage
const localStorageMock = (function() {
    let store: Record<string, string> = {};
    return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => { store[key] = value.toString(); },
        clear: () => { store = {}; }
    };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('BrandDashboardClient Views', () => {
    const brandId = 'test-brand';

    beforeEach(() => {
        jest.clearAllMocks();
        localStorageMock.clear();
        (getBrandDashboardData as jest.Mock).mockResolvedValue({ some: 'data' });
    });

    it('renders Command Center (HQ) by default', async () => {
        render(<BrandDashboardClient brandId={brandId} />);

        await waitFor(() => {
            expect(screen.getByTestId('setup-health')).toBeInTheDocument();
            expect(screen.getByTestId('quick-start-cards')).toBeInTheDocument();
            expect(screen.getByTestId('task-feed')).toBeInTheDocument();
        });

        const modular = screen.getByTestId('modular-dashboard');
        expect(modular).toBeInTheDocument();
        expect(modular.getAttribute('data-editable')).toBe('false');
    });

    it('switches to Classic view', async () => {
        render(<BrandDashboardClient brandId={brandId} />);

        const classicTrigger = screen.getByTestId('tab-classic');
        fireEvent.click(classicTrigger);

        await waitFor(() => {
            expect(screen.queryByTestId('setup-health')).not.toBeInTheDocument();
        });
        expect(screen.getByTestId('modular-dashboard')).toBeInTheDocument();
        
        expect(localStorageMock.getItem(`dash_view_${brandId}`)).toBe('classic');
    });

    it('switches to Customize view', async () => {
        render(<BrandDashboardClient brandId={brandId} />);

        const customizeTrigger = screen.getByTestId('tab-customize');
        fireEvent.click(customizeTrigger);

        await waitFor(() => {
            const modular = screen.getByTestId('modular-dashboard');
            expect(modular.getAttribute('data-editable')).toBe('true');
        });
        
        // Customize view should not persist to localStorage as the 'default'
        expect(localStorageMock.getItem(`dash_view_${brandId}`)).not.toBe('customize');
    });

    it('persists view preference from localStorage', async () => {
        localStorageMock.setItem(`dash_view_${brandId}`, 'classic');
        
        render(<BrandDashboardClient brandId={brandId} />);

        await waitFor(() => {
            expect(screen.queryByTestId('setup-health')).not.toBeInTheDocument();
        });
        expect(screen.getByTestId('modular-dashboard')).toBeInTheDocument();
    });
});
