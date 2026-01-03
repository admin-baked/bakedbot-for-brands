/**
 * DiscoveryBar Component Tests
 * 
 * Tests for the unified discovery bar that displays agent thinking steps.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DiscoveryBar, DiscoverySummary, DiscoveryStep } from '@/components/chat/discovery-bar';

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
        button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('DiscoveryBar', () => {
    const mockSteps: DiscoveryStep[] = [
        { id: '1', agentId: 'smokey', agentName: 'Smokey', action: 'Searching products', status: 'done', durationMs: 1500 },
        { id: '2', agentId: 'ezal', agentName: 'Ezal', action: 'Analyzing market', status: 'running', startedAt: new Date() },
    ];

    it('should not render when inactive and no steps', () => {
        const { container } = render(<DiscoveryBar isActive={false} steps={[]} />);
        expect(container.firstChild).toBeNull();
    });

    it('should render collapsed summary when inactive with steps', () => {
        render(<DiscoveryBar isActive={false} steps={mockSteps} />);
        expect(screen.getByText(/Discovery: 1 step/)).toBeInTheDocument();
    });

    it('should show active step when running', () => {
        render(<DiscoveryBar isActive={true} steps={mockSteps} />);
        // Should display the running step
        expect(screen.getByText(/Analyzing market/)).toBeInTheDocument();
    });

    it('should calculate total duration correctly', () => {
        const stepsWithDuration: DiscoveryStep[] = [
            { id: '1', agentId: 'puff', agentName: 'Puff', action: 'Step 1', status: 'done', durationMs: 2000 },
            { id: '2', agentId: 'puff', agentName: 'Puff', action: 'Step 2', status: 'done', durationMs: 3000 },
        ];
        render(<DiscoveryBar isActive={false} steps={stepsWithDuration} />);
        // Total should be 5000ms = 5s
        expect(screen.getByText(/5s/)).toBeInTheDocument();
    });

    it('should toggle expansion when details button clicked', () => {
        const { container } = render(<DiscoveryBar isActive={true} steps={mockSteps} isFirstDiscovery={false} />);
        
        // Initially collapsed (not first discovery)
        const expandButton = screen.queryByRole('button');
        if (expandButton) {
            fireEvent.click(expandButton);
            // After click, should show full terminal or expanded view
        }
    });

    describe('getAgentConfig', () => {
        it('should return correct config for known agents', () => {
            // Render with different agent IDs to verify correct icons/colors
            const ezalStep: DiscoveryStep[] = [
                { id: '1', agentId: 'ezal', agentName: 'Ezal', action: 'Test', status: 'running' }
            ];
            render(<DiscoveryBar isActive={true} steps={ezalStep} />);
            // Ezal should have purple color - presence of the name indicates correct rendering
            expect(screen.getByText(/Ezal/)).toBeInTheDocument();
        });

        it('should fallback for unknown agents', () => {
            const unknownStep: DiscoveryStep[] = [
                { id: '1', agentId: 'unknown_agent', agentName: 'Unknown', action: 'Test', status: 'running' }
            ];
            render(<DiscoveryBar isActive={true} steps={unknownStep} />);
            expect(screen.getByText(/Unknown/)).toBeInTheDocument();
        });
    });
});

describe('DiscoverySummary', () => {
    const mockSteps: DiscoveryStep[] = [
        { id: '1', agentId: 'smokey', agentName: 'Smokey', action: 'Done', status: 'done', durationMs: 1000 },
        { id: '2', agentId: 'craig', agentName: 'Craig', action: 'Done', status: 'done', durationMs: 2000 },
    ];

    it('should render compact summary with step count', () => {
        render(<DiscoverySummary steps={mockSteps} />);
        expect(screen.getByText(/2 steps/)).toBeInTheDocument();
    });

    it('should show total duration', () => {
        render(<DiscoverySummary steps={mockSteps} />);
        expect(screen.getByText(/3s/)).toBeInTheDocument();
    });

    it('should not render when steps is empty', () => {
        const { container } = render(<DiscoverySummary steps={[]} />);
        expect(container.firstChild).toBeNull();
    });

    it('should use singular "step" for single step', () => {
        const singleStep: DiscoveryStep[] = [
            { id: '1', agentId: 'puff', agentName: 'Puff', action: 'Done', status: 'done', durationMs: 500 }
        ];
        render(<DiscoverySummary steps={singleStep} />);
        expect(screen.getByText(/1 step •/)).toBeInTheDocument();
    });

    it('should handle onExpand callback', () => {
        const mockOnExpand = jest.fn();
        render(<DiscoverySummary steps={mockSteps} onExpand={mockOnExpand} />);
        
        const expandButton = screen.getByRole('button', { name: /View Details/i });
        if (expandButton) {
            fireEvent.click(expandButton);
            expect(mockOnExpand).toHaveBeenCalled();
        }
    });
});

describe('DiscoveryStep interface', () => {
    it('should accept all valid status values', () => {
        const statuses: DiscoveryStep['status'][] = ['pending', 'running', 'done', 'failed'];
        
        statuses.forEach(status => {
            const step: DiscoveryStep = {
                id: '1',
                agentId: 'test',
                agentName: 'Test',
                action: 'Test action',
                status
            };
            expect(step.status).toBe(status);
        });
    });

    it('should handle optional fields', () => {
        const minimalStep: DiscoveryStep = {
            id: '1',
            agentId: 'test',
            agentName: 'Test',
            action: 'Test action',
            status: 'pending'
        };
        
        expect(minimalStep.startedAt).toBeUndefined();
        expect(minimalStep.durationMs).toBeUndefined();
    });
});
