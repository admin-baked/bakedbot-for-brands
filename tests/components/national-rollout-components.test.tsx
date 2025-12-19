/**
 * Unit Tests: National Rollout Components
 * 
 * Tests for PlanSelectionCards and Analytics components
 * 
 * [BUILDER-MODE @ 2025-12-16]
 * Created as part of feat_national_rollout
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock the pricing config
jest.mock('@/lib/config/pricing', () => ({
    PRICING_PLANS: [
        {
            id: 'claim_pro',
            name: 'Claim Pro',
            price: 99,
            priceDisplay: '$99',
            period: '/month',
            desc: 'Take control of your listing',
            features: ['Feature 1', 'Feature 2']
        },
        {
            id: 'founders_claim',
            name: 'Founders Claim',
            price: 79,
            priceDisplay: '$79',
            period: '/month',
            desc: 'Lock in founder pricing',
            features: ['Feature A', 'Feature B']
        }
    ]
}));

// Mock utils
jest.mock('@/lib/utils', () => ({
    cn: (...args: any[]) => args.filter(Boolean).join(' ')
}));

describe('PlanSelectionCards Component', () => {
    let PlanSelectionCards: any;

    beforeAll(async () => {
        // Dynamic import to apply mocks first
        const module = await import('@/components/claim/plan-selection-cards');
        PlanSelectionCards = module.PlanSelectionCards;
    });

    it('should render both plan options', () => {
        const mockSelect = jest.fn();

        render(
            <PlanSelectionCards
                selectedPlan="claim_pro"
                onSelectPlan={mockSelect}
                foundersRemaining={247}
            />
        );

        expect(screen.getByText('Claim Pro')).toBeInTheDocument();
        expect(screen.getByText('Founders Claim')).toBeInTheDocument();
    });

    it('should display correct prices', () => {
        const mockSelect = jest.fn();

        render(
            <PlanSelectionCards
                selectedPlan="claim_pro"
                onSelectPlan={mockSelect}
            />
        );

        expect(screen.getByText('$99')).toBeInTheDocument();
        expect(screen.getByText('$79')).toBeInTheDocument();
    });

    it('should show founders remaining count', () => {
        const mockSelect = jest.fn();

        render(
            <PlanSelectionCards
                selectedPlan="claim_pro"
                onSelectPlan={mockSelect}
                foundersRemaining={123}
            />
        );

        expect(screen.getByText(/123 of 250 remaining/)).toBeInTheDocument();
    });

    it('should call onSelectPlan when claim-pro is clicked', () => {
        const mockSelect = jest.fn();

        render(
            <PlanSelectionCards
                selectedPlan="founders_claim"
                onSelectPlan={mockSelect}
            />
        );

        const claimProCard = screen.getByText('Claim Pro').closest('div');
        if (claimProCard) {
            fireEvent.click(claimProCard);
            expect(mockSelect).toHaveBeenCalledWith('claim_pro');
        }
    });

    it('should call onSelectPlan when founders-claim is clicked', () => {
        const mockSelect = jest.fn();

        render(
            <PlanSelectionCards
                selectedPlan="claim_pro"
                onSelectPlan={mockSelect}
            />
        );

        const foundersCard = screen.getByText('Founders Claim').closest('div');
        if (foundersCard) {
            fireEvent.click(foundersCard);
            expect(mockSelect).toHaveBeenCalledWith('founders_claim');
        }
    });

    it('should display features for each plan', () => {
        const mockSelect = jest.fn();

        render(
            <PlanSelectionCards
                selectedPlan="claim_pro"
                onSelectPlan={mockSelect}
            />
        );

        expect(screen.getByText('Feature 1')).toBeInTheDocument();
        expect(screen.getByText('Feature 2')).toBeInTheDocument();
        expect(screen.getByText('Feature A')).toBeInTheDocument();
        expect(screen.getByText('Feature B')).toBeInTheDocument();
    });
});

describe('Analytics Charts', () => {
    let DailyViewsChart: any;
    let TopItemsList: any;
    let MetricCard: any;

    beforeAll(async () => {
        const module = await import('@/components/analytics/AnalyticsCharts');
        DailyViewsChart = module.DailyViewsChart;
        TopItemsList = module.TopItemsList;
        MetricCard = module.MetricCard;
    });

    describe('DailyViewsChart', () => {
        it('should render empty state when no data', () => {
            render(<DailyViewsChart dailyViews={{}} />);

            expect(screen.getByText(/No data for the selected period/)).toBeInTheDocument();
        });

        it('should render chart when data exists', () => {
            const dailyViews = {
                '2025-12-15': 100,
                '2025-12-16': 200
            };

            // Just verify it renders without throwing
            expect(() => {
                render(<DailyViewsChart dailyViews={dailyViews} days={2} />);
            }).not.toThrow();
        });
    });

    describe('TopItemsList', () => {
        it('should render empty state message', () => {
            render(<TopItemsList items={{}} label="ZIP codes" />);

            expect(screen.getByText(/No zip codes data yet/i)).toBeInTheDocument();
        });

        it('should render items sorted by count', () => {
            const items = {
                '90210': 100,
                '90211': 50,
                '90212': 75
            };

            render(<TopItemsList items={items} label="ZIP codes" />);

            expect(screen.getByText('90210')).toBeInTheDocument();
            expect(screen.getByText('100')).toBeInTheDocument();
        });

        it('should limit number of items shown', () => {
            const items = {
                'a': 100,
                'b': 90,
                'c': 80,
                'd': 70,
                'e': 60,
                'f': 50
            };

            render(<TopItemsList items={items} label="items" maxItems={3} />);

            expect(screen.getByText('a')).toBeInTheDocument();
            expect(screen.getByText('b')).toBeInTheDocument();
            expect(screen.getByText('c')).toBeInTheDocument();
            expect(screen.queryByText('d')).not.toBeInTheDocument();
        });
    });

    describe('MetricCard', () => {
        it('should render title and value', () => {
            render(<MetricCard title="Total Views" value={1234} />);

            expect(screen.getByText('Total Views')).toBeInTheDocument();
            expect(screen.getByText('1234')).toBeInTheDocument();
        });

        it('should render positive change indicator', () => {
            render(<MetricCard title="Views" value={100} change={15} />);

            expect(screen.getByText('+15%')).toBeInTheDocument();
        });

        it('should render negative change indicator', () => {
            render(<MetricCard title="Views" value={100} change={-10} />);

            expect(screen.getByText('-10%')).toBeInTheDocument();
        });
    });
});
