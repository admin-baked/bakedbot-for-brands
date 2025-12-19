/**
 * Unit tests for widget components
 * Tests rendering and props for all dashboard widgets
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import {
    TopZipsWidget,
    FootTrafficWidget,
    RevenueSummaryWidget,
    SeoHealthWidget,
    CrawlStatusWidget,
    AgentStatusWidget,
    PlaybookTrackerWidget,
    ClaimCtaWidget,
    NewDetectedWidget,
    CampaignMetricsWidget,
    RecentReviewsWidget,
    EditorRequestsWidget,
    ComplianceAlertsWidget,
    RuleChangesWidget,
    WIDGET_COMPONENTS,
    getWidgetComponent
} from '@/components/dashboard/modular/widgets';

// Mock the UI components
jest.mock('@/components/ui/card', () => ({
    Card: ({ children, className }: { children: React.ReactNode; className?: string }) =>
        <div data-testid="card" className={className}>{children}</div>,
    CardContent: ({ children }: { children: React.ReactNode }) =>
        <div data-testid="card-content">{children}</div>,
    CardHeader: ({ children, className }: { children: React.ReactNode; className?: string }) =>
        <div data-testid="card-header" className={className}>{children}</div>,
    CardTitle: ({ children, className }: { children: React.ReactNode; className?: string }) =>
        <h3 data-testid="card-title" className={className}>{children}</h3>
}));

jest.mock('@/components/ui/button', () => ({
    Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) =>
        <button onClick={onClick}>{children}</button>
}));

jest.mock('@/components/ui/dropdown-menu', () => ({
    DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DropdownMenuItem: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) =>
        <button onClick={onClick}>{children}</button>,
    DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

describe('Widget Components', () => {
    describe('WIDGET_COMPONENTS registry', () => {
        it('should have 14 registered widgets', () => {
            const count = Object.keys(WIDGET_COMPONENTS).length;
            expect(count).toBe(14);
        });

        it('should have all expected widget types', () => {
            const expectedTypes = [
                'top-zips',
                'foot-traffic',
                'revenue-summary',
                'seo-health',
                'crawl-status',
                'agent-status',
                'playbook-tracker',
                'claim-cta',
                'new-detected',
                'campaign-metrics',
                'recent-reviews',
                'editor-requests',
                'compliance-alerts',
                'rule-changes'
            ];

            expectedTypes.forEach(type => {
                expect(WIDGET_COMPONENTS).toHaveProperty(type);
                expect(typeof WIDGET_COMPONENTS[type]).toBe('function');
            });
        });
    });

    describe('getWidgetComponent', () => {
        it('should return component for valid type', () => {
            const component = getWidgetComponent('top-zips');
            expect(component).toBe(TopZipsWidget);
        });

        it('should return null for invalid type', () => {
            const component = getWidgetComponent('nonexistent');
            expect(component).toBeNull();
        });
    });

    describe('TopZipsWidget', () => {
        it('should render with title', () => {
            render(<TopZipsWidget />);
            expect(screen.getByText('Top Performing ZIPs')).toBeInTheDocument();
        });

        it('should display ZIP codes', () => {
            render(<TopZipsWidget />);
            expect(screen.getByText('60601')).toBeInTheDocument();
            expect(screen.getByText('60602')).toBeInTheDocument();
        });

        it('should display CTR percentages', () => {
            render(<TopZipsWidget />);
            expect(screen.getByText('4.2% CTR')).toBeInTheDocument();
        });
    });

    describe('FootTrafficWidget', () => {
        it('should render with title', () => {
            render(<FootTrafficWidget />);
            expect(screen.getByText('Foot Traffic Stats')).toBeInTheDocument();
        });

        it('should display page views', () => {
            render(<FootTrafficWidget />);
            expect(screen.getByText('24.5K')).toBeInTheDocument();
            expect(screen.getByText('Page Views')).toBeInTheDocument();
        });

        it('should display trend percentage', () => {
            render(<FootTrafficWidget />);
            expect(screen.getByText('+12%')).toBeInTheDocument();
        });
    });

    describe('RevenueSummaryWidget', () => {
        it('should render with title', () => {
            render(<RevenueSummaryWidget />);
            expect(screen.getByText('Revenue Summary')).toBeInTheDocument();
        });

        it('should display revenue amount', () => {
            render(<RevenueSummaryWidget />);
            expect(screen.getByText('$28,450')).toBeInTheDocument();
        });

        it('should display comparison percentage', () => {
            render(<RevenueSummaryWidget />);
            expect(screen.getByText('+18.5%')).toBeInTheDocument();
        });
    });

    describe('SeoHealthWidget', () => {
        it('should render with title', () => {
            render(<SeoHealthWidget />);
            expect(screen.getByText('SEO Health')).toBeInTheDocument();
        });

        it('should display health score', () => {
            render(<SeoHealthWidget />);
            expect(screen.getByText('92')).toBeInTheDocument();
        });

        it('should display indexed pages count', () => {
            render(<SeoHealthWidget />);
            expect(screen.getByText('1,383')).toBeInTheDocument();
        });
    });

    describe('AgentStatusWidget', () => {
        it('should render with title', () => {
            render(<AgentStatusWidget />);
            expect(screen.getByText('Agent Status')).toBeInTheDocument();
        });

        it('should display agent names', () => {
            render(<AgentStatusWidget />);
            expect(screen.getByText('Smokey')).toBeInTheDocument();
            expect(screen.getByText('Craig')).toBeInTheDocument();
            expect(screen.getByText('Deebo')).toBeInTheDocument();
            expect(screen.getByText('Pops')).toBeInTheDocument();
            expect(screen.getByText('Ezal')).toBeInTheDocument();
        });
    });

    describe('ClaimCtaWidget', () => {
        it('should render with title', () => {
            render(<ClaimCtaWidget />);
            expect(screen.getByText('Grow Your Coverage')).toBeInTheDocument();
        });

        it('should display unclaimed count', () => {
            render(<ClaimCtaWidget />);
            expect(screen.getByText('47')).toBeInTheDocument();
        });

        it('should have CTA button', () => {
            render(<ClaimCtaWidget />);
            expect(screen.getByText('Claim More ZIPs')).toBeInTheDocument();
        });
    });

    describe('RecentReviewsWidget', () => {
        it('should render with title', () => {
            render(<RecentReviewsWidget />);
            expect(screen.getByText('Recent Reviews')).toBeInTheDocument();
        });

        it('should display review snippets', () => {
            render(<RecentReviewsWidget />);
            expect(screen.getByText('Great selection and fast service!')).toBeInTheDocument();
        });
    });

    describe('ComplianceAlertsWidget', () => {
        it('should render with title', () => {
            render(<ComplianceAlertsWidget />);
            expect(screen.getByText('Compliance Alerts')).toBeInTheDocument();
        });

        it('should display violation counts', () => {
            render(<ComplianceAlertsWidget />);
            expect(screen.getByText('Active Violations')).toBeInTheDocument();
            expect(screen.getByText('2')).toBeInTheDocument();
        });
    });

    describe('Widget onRemove prop', () => {
        it('should pass onRemove to TopZipsWidget', () => {
            const onRemove = jest.fn();
            render(<TopZipsWidget onRemove={onRemove} />);
            // Widget renders without errors with onRemove
            expect(screen.getByText('Top Performing ZIPs')).toBeInTheDocument();
        });

        it('should pass onRemove to FootTrafficWidget', () => {
            const onRemove = jest.fn();
            render(<FootTrafficWidget onRemove={onRemove} />);
            expect(screen.getByText('Foot Traffic Stats')).toBeInTheDocument();
        });
    });
});

describe('Widget rendering consistency', () => {
    const widgetTests = [
        { name: 'TopZipsWidget', component: TopZipsWidget },
        { name: 'FootTrafficWidget', component: FootTrafficWidget },
        { name: 'RevenueSummaryWidget', component: RevenueSummaryWidget },
        { name: 'SeoHealthWidget', component: SeoHealthWidget },
        { name: 'CrawlStatusWidget', component: CrawlStatusWidget },
        { name: 'AgentStatusWidget', component: AgentStatusWidget },
        { name: 'PlaybookTrackerWidget', component: PlaybookTrackerWidget },
        { name: 'ClaimCtaWidget', component: ClaimCtaWidget },
        { name: 'NewDetectedWidget', component: NewDetectedWidget },
        { name: 'CampaignMetricsWidget', component: CampaignMetricsWidget },
        { name: 'RecentReviewsWidget', component: RecentReviewsWidget },
        { name: 'EditorRequestsWidget', component: EditorRequestsWidget },
        { name: 'ComplianceAlertsWidget', component: ComplianceAlertsWidget },
        { name: 'RuleChangesWidget', component: RuleChangesWidget }
    ];

    widgetTests.forEach(({ name, component: Component }) => {
        it(`${name} should render without errors`, () => {
            expect(() => render(<Component />)).not.toThrow();
        });

        it(`${name} should render Card structure`, () => {
            const { container } = render(<Component />);
            expect(container.querySelector('[data-testid="card"]')).toBeInTheDocument();
        });
    });
});
