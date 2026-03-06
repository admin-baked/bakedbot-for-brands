import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { PopsMetricsWidget } from '../pops-metrics-widget';
import { getPlatformAnalytics } from '../../actions/data-actions';

// Mock the action
jest.mock('../../actions/data-actions', () => ({
    getPlatformAnalytics: jest.fn()
}));

jest.mock('@/lib/logger', () => ({
    logger: {
        error: jest.fn(),
    },
}));

const mockAnalyticsData = {
    revenue: {
        mrr: 150000,
        arr: 1800000,
        arpu: 500
    },
    activeUsers: {
        weekly: 12000,
        trend: 15,
        trendUp: true
    }
};

describe('PopsMetricsWidget', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders loading state initially', () => {
        // Return unresolved promise to keep it in loading state
        (getPlatformAnalytics as jest.Mock).mockReturnValue(new Promise(() => { }));

        render(<PopsMetricsWidget />);

        expect(screen.getByText('Loading')).toBeInTheDocument();
        expect(screen.getByText('Loading metrics...')).toBeInTheDocument();
    });

    it('renders error state when API fails', async () => {
        (getPlatformAnalytics as jest.Mock).mockRejectedValue(new Error('API Error'));

        render(<PopsMetricsWidget />);

        await waitFor(() => {
            expect(screen.getByText('Unavailable')).toBeInTheDocument();
        });

        expect(screen.getByText('Metrics unavailable')).toBeInTheDocument();
        expect(screen.getByText('Analytics unavailable')).toBeInTheDocument();
    });

    it('renders data correctly when API succeeds', async () => {
        (getPlatformAnalytics as jest.Mock).mockResolvedValue(mockAnalyticsData);

        render(<PopsMetricsWidget />);

        await waitFor(() => {
            expect(screen.getByText('Live')).toBeInTheDocument();
        });

        // Assert revenue format
        expect(screen.getByText('$150,000')).toBeInTheDocument();
        expect(screen.getByText('ARR: $1,800,000 | ARPU: $500')).toBeInTheDocument();

        // Assert users and trend
        expect(screen.getByText('12,000')).toBeInTheDocument();
        expect(screen.getByText('15% vs last week')).toBeInTheDocument();
    });

    it('renders downward trend correctly', async () => {
        (getPlatformAnalytics as jest.Mock).mockResolvedValue({
            ...mockAnalyticsData,
            activeUsers: {
                weekly: 10000,
                trend: -5,
                trendUp: false
            }
        });

        render(<PopsMetricsWidget />);

        await waitFor(() => {
            expect(screen.getByText('5% vs last week')).toBeInTheDocument();
        });
    });
});
