import React from 'react';
import { render, screen } from '@testing-library/react';
import { CustomerKPIs } from '../customer-kpi-grid';

// Mock UI components that might interfere with simple rendering
jest.mock('@/components/ui/card', () => ({
    Card: ({ children, className }: any) => <div className={className}>{children}</div>,
    CardHeader: ({ children }: any) => <div>{children}</div>,
    CardTitle: ({ children }: any) => <h4>{children}</h4>,
    CardContent: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('@/components/ui/progress', () => ({
    Progress: ({ value }: any) => <div data-testid="progress-bar" data-value={value} />,
}));

describe('CustomerKPIs', () => {
    const mockData = {
        rewards: { points: 750, discount: '$7.50 off', label: 'Silver Member' },
        deals: { count: 3, label: '3 new deals' },
        favorites: { inStock: 2, total: 5, label: '2 items available' },
        activeOrder: { status: 'Preparing', eta: '5-10 min', active: true },
        gamification: {
            streak: 5,
            badges: [
                { id: '1', name: 'Flower Connoisseur', icon: '🌸' },
                { id: '2', name: 'Early Bird', icon: '☀️' }
            ],
            tierProgress: 75,
            nextTier: 'Gold'
        }
    };

    it('renders basic KPI counts correctly', () => {
        render(<CustomerKPIs data={mockData} />);

        expect(screen.getByText('750')).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument();
        expect(screen.getByText('Preparing')).toBeInTheDocument();
    });

    it('renders gamification streak and badges', () => {
        render(<CustomerKPIs data={mockData} />);

        expect(screen.getByText('5 Day Streak')).toBeInTheDocument();
        expect(screen.getByText('🌸')).toBeInTheDocument();
        expect(screen.getByText('☀️')).toBeInTheDocument();
    });

    it('renders tier progress bar with correct value', () => {
        render(<CustomerKPIs data={mockData} />);

        const progressBar = screen.getByTestId('progress-bar');
        expect(progressBar).toHaveAttribute('data-value', '75');
        expect(screen.getByText('Progress to Gold')).toBeInTheDocument();
    });

    it('shows placeholder when no badges exist', () => {
        render(<CustomerKPIs data={{ ...mockData, gamification: { ...mockData.gamification, badges: [] } }} />);

        expect(screen.getByText('No badges yet')).toBeInTheDocument();
    });
});
