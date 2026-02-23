/**
 * Unit tests for GoalsClient
 *
 * Focuses on the Feb 2026 bug fix:
 *   After createGoal() succeeds, the new goal must appear in the list
 *   (optimistic state update via setGoals).
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { GoalsClient } from '../goals-client';
import * as goalsActions from '@/server/actions/goals';
import type { OrgGoal } from '@/types/goals';

// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock('@/server/actions/goals', () => ({
    createGoal: jest.fn(),
    updateGoalStatus: jest.fn().mockResolvedValue({ success: true }),
    deleteGoal: jest.fn().mockResolvedValue({ success: true }),
    achieveGoal: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock('@/lib/logger', () => ({
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// Mock child components that are not relevant to this test
jest.mock('@/components/dashboard/goals/goal-card', () => ({
    GoalCard: ({ goal }: { goal: OrgGoal }) => (
        <div data-testid={`goal-card-${goal.id}`}>{goal.title}</div>
    ),
}));

jest.mock('@/components/dashboard/goals/goal-creation-dialog', () => ({
    GoalCreationDialog: ({
        open,
        onCreateGoal,
    }: {
        open: boolean;
        onCreateGoal: (goal: Omit<OrgGoal, 'id' | 'createdAt' | 'updatedAt' | 'lastProgressUpdatedAt'>) => Promise<void>;
    }) =>
        open ? (
            <div data-testid="goal-creation-dialog">
                <button
                    data-testid="submit-goal"
                    onClick={() =>
                        onCreateGoal({
                            orgId: 'org_test',
                            createdBy: '',
                            title: 'Increase Monthly Revenue',
                            description: 'Hit $50k this month',
                            category: 'revenue',
                            timeframe: 'monthly',
                            startDate: new Date(),
                            endDate: new Date(),
                            status: 'active',
                            progress: 0,
                            metrics: [],
                            playbookIds: [],
                            suggestedPlaybookIds: [],
                            milestones: [],
                        })
                    }
                >
                    Create
                </button>
            </div>
        ) : null,
}));

jest.mock('@/components/dashboard/goals/suggested-goal-card', () => ({
    SuggestedGoalCard: () => <div data-testid="suggested-goal-card" />,
}));

jest.mock('@/components/ui/tabs', () => ({
    Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    TabsTrigger: ({ children, value }: { children: React.ReactNode; value: string }) => (
        <button role="tab" data-value={value}>
            {children}
        </button>
    ),
    TabsContent: ({ children, value }: { children: React.ReactNode; value: string }) => (
        <div role="tabpanel" data-value={value}>
            {children}
        </div>
    ),
}));

jest.mock('@/components/ui/empty-state', () => ({
    EmptyState: ({ title }: { title: string }) => <div data-testid="empty-state">{title}</div>,
}));

jest.mock('@/components/ui/button', () => ({
    Button: ({ children, onClick, disabled }: any) => (
        <button onClick={onClick} disabled={disabled}>
            {children}
        </button>
    ),
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockExistingGoal: OrgGoal = {
    id: 'goal-existing-1',
    orgId: 'org_test',
    createdBy: 'user1',
    title: 'Grow Foot Traffic',
    description: '',
    category: 'foot_traffic',
    timeframe: 'weekly',
    startDate: new Date(),
    endDate: new Date(),
    status: 'active',
    progress: 20,
    metrics: [],
    playbookIds: [],
    suggestedPlaybookIds: [],
    milestones: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    lastProgressUpdatedAt: new Date(),
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('GoalsClient', () => {
    const mockCreateGoal = goalsActions.createGoal as jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders existing goals on mount', () => {
        render(<GoalsClient orgId="org_test" initialGoals={[mockExistingGoal]} />);
        expect(screen.getByTestId('goal-card-goal-existing-1')).toBeInTheDocument();
    });

    it('shows empty state when no goals exist', () => {
        render(<GoalsClient orgId="org_test" initialGoals={[]} />);
        // Without goals, tabs are hidden; but "New Goal" button should be present
        expect(screen.getByText('New Goal')).toBeInTheDocument();
    });

    describe('optimistic goal creation (Feb 2026 fix)', () => {
        it('appends the new goal to the list immediately after createGoal succeeds', async () => {
            mockCreateGoal.mockResolvedValue({ success: true, goalId: 'goal-new-1' });

            render(<GoalsClient orgId="org_test" initialGoals={[mockExistingGoal]} />);

            // Open the creation dialog
            fireEvent.click(screen.getByText('New Goal'));

            // Submit the goal via the mocked dialog
            await waitFor(() =>
                expect(screen.getByTestId('goal-creation-dialog')).toBeInTheDocument()
            );
            fireEvent.click(screen.getByTestId('submit-goal'));

            // The new goal should appear in the list
            await waitFor(() =>
                expect(screen.getByTestId('goal-card-goal-new-1')).toBeInTheDocument()
            );
        });

        it('shows the new goal title in the list', async () => {
            mockCreateGoal.mockResolvedValue({ success: true, goalId: 'goal-revenue-1' });

            render(<GoalsClient orgId="org_test" initialGoals={[]} />);
            fireEvent.click(screen.getByText('New Goal'));

            await waitFor(() =>
                expect(screen.getByTestId('goal-creation-dialog')).toBeInTheDocument()
            );
            fireEvent.click(screen.getByTestId('submit-goal'));

            await waitFor(() =>
                expect(screen.getByText('Increase Monthly Revenue')).toBeInTheDocument()
            );
        });

        it('does NOT add goal when createGoal returns success=false', async () => {
            mockCreateGoal.mockResolvedValue({ success: false, error: 'Permission denied' });

            render(<GoalsClient orgId="org_test" initialGoals={[mockExistingGoal]} />);
            fireEvent.click(screen.getByText('New Goal'));

            await waitFor(() =>
                expect(screen.getByTestId('goal-creation-dialog')).toBeInTheDocument()
            );
            fireEvent.click(screen.getByTestId('submit-goal'));

            // Only the original goal should remain
            await waitFor(() => {
                expect(screen.queryByTestId('goal-card-goal-new-1')).not.toBeInTheDocument();
                expect(screen.getByTestId('goal-card-goal-existing-1')).toBeInTheDocument();
            });
        });

        it('does NOT add goal when createGoal throws', async () => {
            mockCreateGoal.mockRejectedValue(new Error('Network error'));

            render(<GoalsClient orgId="org_test" initialGoals={[mockExistingGoal]} />);
            fireEvent.click(screen.getByText('New Goal'));

            await waitFor(() =>
                expect(screen.getByTestId('goal-creation-dialog')).toBeInTheDocument()
            );
            fireEvent.click(screen.getByTestId('submit-goal'));

            await waitFor(() => {
                expect(screen.queryByTestId('goal-card-goal-new-1')).not.toBeInTheDocument();
            });
        });

        it('preserves existing goals after adding a new one', async () => {
            mockCreateGoal.mockResolvedValue({ success: true, goalId: 'goal-new-99' });

            render(<GoalsClient orgId="org_test" initialGoals={[mockExistingGoal]} />);
            fireEvent.click(screen.getByText('New Goal'));

            await waitFor(() =>
                expect(screen.getByTestId('goal-creation-dialog')).toBeInTheDocument()
            );
            fireEvent.click(screen.getByTestId('submit-goal'));

            await waitFor(() => {
                expect(screen.getByTestId('goal-card-goal-new-99')).toBeInTheDocument();
                // Existing goal still present
                expect(screen.getByTestId('goal-card-goal-existing-1')).toBeInTheDocument();
            });
        });
    });
});
