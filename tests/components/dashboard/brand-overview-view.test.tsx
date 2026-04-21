/**
 * Unit Tests for Brand Overview View Component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrandOverviewView } from '@/app/dashboard/brand/components/brand-overview-view';

// Mock child components
jest.mock('@/app/dashboard/brand/components/brand-kpi-grid', () => ({
    BrandKPIs: () => <div data-testid="brand-kpis">BrandKPIs</div>,
}));

jest.mock('@/app/dashboard/brand/components/brand-chat-widget', () => ({
    BrandChatWidget: () => <div data-testid="brand-chat">BrandChatWidget</div>,
}));

jest.mock('@/app/dashboard/brand/components/brand-right-sidebar', () => ({
    BrandRightRail: () => <div data-testid="brand-right-rail">BrandRightRail</div>,
}));

jest.mock('@/app/dashboard/brand/components/competitive-intel-snapshot', () => ({
    CompetitiveIntelSnapshot: () => <div data-testid="competitive-intel">CompetitiveIntelSnapshot</div>,
}));

jest.mock('@/app/dashboard/brand/components/next-best-actions', () => ({
    NextBestActions: () => <div data-testid="next-best-actions">NextBestActions</div>,
}));

// Mock DataImportDropdown — it calls useFirebase internally (requires FirebaseProvider)
jest.mock('@/components/dashboard/data-import-dropdown', () => ({
    DataImportDropdown: () => <div data-testid="data-import-dropdown" />,
}));

// Mock ManagedPagesList — has an undefined sub-component import in the test environment
jest.mock('@/components/dashboard/managed-pages-list', () => ({
    ManagedPagesList: () => <div data-testid="managed-pages-list" />,
}));

// Mock the brand dashboard data action — it's a server action that hits Firestore
jest.mock('@/app/dashboard/brand/actions', () => ({
    getBrandDashboardData: jest.fn().mockResolvedValue(null),
}));

// Mock Lucide Icons
jest.mock('lucide-react', () => ({
    Activity: () => <div data-testid="icon-activity" />,
    Globe: () => <div data-testid="icon-globe" />,
}));

describe('BrandOverviewView Component', () => {
    const defaultProps = {
        brandId: 'test-brand',
    };

    it('renders the BRAND CONSOLE header', () => {
        render(<BrandOverviewView {...defaultProps} />);

        expect(screen.getByText('BRAND CONSOLE')).toBeInTheDocument();
    });

    it('displays the brand ID badge', () => {
        render(<BrandOverviewView {...defaultProps} />);

        expect(screen.getByText('TEST-BRAND')).toBeInTheDocument();
    });

    it('shows system health indicator', () => {
        render(<BrandOverviewView {...defaultProps} />);

        expect(screen.getByText('System Healthy')).toBeInTheDocument();
    });

    it('shows live data indicator', () => {
        render(<BrandOverviewView {...defaultProps} />);

        expect(screen.getByText('Live Data ON')).toBeInTheDocument();
    });

    it('renders BrandKPIs component', () => {
        render(<BrandOverviewView {...defaultProps} />);

        expect(screen.getByTestId('brand-kpis')).toBeInTheDocument();
    });

    it('renders NextBestActions component', () => {
        render(<BrandOverviewView {...defaultProps} />);

        expect(screen.getByTestId('next-best-actions')).toBeInTheDocument();
    });

    it('renders CompetitiveIntelSnapshot component', () => {
        render(<BrandOverviewView {...defaultProps} />);

        expect(screen.getByTestId('competitive-intel')).toBeInTheDocument();
    });

    it('renders BrandChatWidget component', () => {
        render(<BrandOverviewView {...defaultProps} />);

        expect(screen.getByTestId('brand-chat')).toBeInTheDocument();
    });

    it('renders BrandRightRail component', () => {
        render(<BrandOverviewView {...defaultProps} />);

        expect(screen.getByTestId('brand-right-rail')).toBeInTheDocument();
    });

    it('displays active retailers count that defaults to 0 before data loads', () => {
        render(<BrandOverviewView {...defaultProps} />);

        // liveData starts as null; coverage.value falls back to 0
        expect(screen.getByText('Active Retailers: 0')).toBeInTheDocument();
    });

    it('renders market filter dropdown', () => {
        render(<BrandOverviewView {...defaultProps} />);

        expect(screen.getByText('All Markets')).toBeInTheDocument();
    });
});
