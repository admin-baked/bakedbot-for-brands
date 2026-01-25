import React from 'react';
import { render, screen } from '@testing-library/react';
import { ActivityLog } from '@/components/brand/creative/activity-log';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
    MoreHorizontal: () => <div data-testid="icon-more" />,
    Sparkles: () => <div data-testid="icon-sparkles" />,
    CheckCircle2: () => <div data-testid="icon-check" />,
    AlertTriangle: () => <div data-testid="icon-alert" />,
    Edit3: () => <div data-testid="icon-edit" />,
    Clock: () => <div data-testid="icon-clock" />,
    ImageIcon: () => <div data-testid="icon-image" />,
    MessageSquare: () => <div data-testid="icon-message" />,
}));

// Mock date-fns
jest.mock('date-fns', () => ({
    formatDistanceToNow: () => '5 minutes ago',
}));

describe('ActivityLog', () => {
    describe('Rendering', () => {
        it('renders panel title', () => {
            render(<ActivityLog />);
            expect(screen.getByText('Activity Log')).toBeInTheDocument();
        });

        it('renders View Full History button', () => {
            render(<ActivityLog />);
            expect(screen.getByText('View Full Activity History')).toBeInTheDocument();
        });
    });

    describe('Demo Activities', () => {
        it('shows demo activities when no activities provided', () => {
            render(<ActivityLog />);
            // Demo activities include Craig (appears multiple times) and Deebo
            expect(screen.getAllByText('Craig').length).toBeGreaterThan(0);
        });

        it('shows activity descriptions', () => {
            render(<ActivityLog />);
            expect(screen.getByText(/Generated Instagram post/)).toBeInTheDocument();
        });

        it('shows timestamps', () => {
            render(<ActivityLog />);
            expect(screen.getAllByText('5 minutes ago').length).toBeGreaterThan(0);
        });
    });

    describe('Custom Activities', () => {
        const customActivities = [
            {
                id: '1',
                type: 'generate' as const,
                agent: { name: 'Test Agent', initials: 'TA' },
                description: 'Generated test content',
                timestamp: new Date(),
            },
        ];

        it('renders custom activities', () => {
            render(<ActivityLog activities={customActivities} />);
            expect(screen.getByText('Test Agent')).toBeInTheDocument();
            expect(screen.getByText('Generated test content')).toBeInTheDocument();
        });
    });

    describe('ScrollArea', () => {
        it('respects maxHeight prop', () => {
            const { container } = render(<ActivityLog maxHeight="400px" />);
            const scrollArea = container.querySelector('[style*="height"]');
            expect(scrollArea).toHaveStyle({ height: '400px' });
        });

        it('uses default maxHeight when not provided', () => {
            const { container } = render(<ActivityLog />);
            const scrollArea = container.querySelector('[style*="height"]');
            expect(scrollArea).toHaveStyle({ height: '320px' });
        });
    });
});
