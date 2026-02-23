/**
 * Unit tests for GoalCreationDialog
 *
 * Focuses on the Feb 2026 feature: Step 3 (playbooks) fetches active
 * org playbooks from getDispensaryPlaybookAssignments and renders them
 * as selectable checkboxes.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { GoalCreationDialog } from '../goal-creation-dialog';
import type { OrgGoal } from '@/types/goals';

// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock('@/server/actions/dispensary-playbooks', () => ({
    getDispensaryPlaybookAssignments: jest.fn(),
}));

// Mock config/playbooks so tests don't need the full registry
jest.mock('@/config/playbooks', () => ({
    PLAYBOOKS: {
        'birthday-loyalty-reminder': {
            id: 'birthday-loyalty-reminder',
            name: 'Birthday Loyalty Reminder',
            description: 'Monthly birthday cohort email with a loyalty reward offer.',
        },
        'win-back-sequence': {
            id: 'win-back-sequence',
            name: 'Win-Back Sequence',
            description: '3-touch re-engagement sequence for 30-day inactive customers.',
        },
        'welcome-sequence': {
            id: 'welcome-sequence',
            name: 'Welcome Sequence',
            description: '3-touch email sequence for new customers.',
        },
    },
}));

jest.mock('@/lib/utils', () => ({
    cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

// Minimal UI component mocks
jest.mock('@/components/ui/dialog', () => ({
    Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
        open ? <div data-testid="dialog">{children}</div> : null,
    DialogContent: ({ children }: { children: React.ReactNode }) => (
        <div data-testid="dialog-content">{children}</div>
    ),
    DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
    DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
    DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/button', () => ({
    Button: ({ children, onClick, disabled }: any) => (
        <button onClick={onClick} disabled={disabled}>
            {children}
        </button>
    ),
}));

jest.mock('@/components/ui/input', () => ({
    Input: (props: any) => <input {...props} />,
}));

jest.mock('@/components/ui/textarea', () => ({
    Textarea: (props: any) => <textarea {...props} />,
}));

jest.mock('@/components/ui/label', () => ({
    Label: ({ children, htmlFor }: any) => <label htmlFor={htmlFor}>{children}</label>,
}));

jest.mock('@/components/ui/radio-group', () => ({
    RadioGroup: ({ children, onValueChange }: any) => (
        <div onChange={(e: any) => onValueChange?.(e.target.value)}>{children}</div>
    ),
    RadioGroupItem: ({ value, id }: any) => <input type="radio" value={value} id={id} />,
}));

jest.mock('@/components/ui/badge', () => ({
    Badge: ({ children }: any) => <span>{children}</span>,
}));

jest.mock('@/components/ui/checkbox', () => ({
    Checkbox: ({ checked, onCheckedChange, className }: any) => (
        <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onCheckedChange?.(e.target.checked)}
            className={className}
        />
    ),
}));

jest.mock('@/types/goals', () => ({
    GOAL_CATEGORIES: [
        {
            id: 'revenue',
            label: 'Revenue',
            description: 'Grow sales',
            defaultTimeframe: 'monthly',
            exampleGoals: ['Hit $50k this month'],
        },
    ],
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import { getDispensaryPlaybookAssignments } from '@/server/actions/dispensary-playbooks';

const mockGetAssignments = getDispensaryPlaybookAssignments as jest.Mock;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function renderDialog(props: Partial<Parameters<typeof GoalCreationDialog>[0]> = {}) {
    const onCreateGoal = jest.fn().mockResolvedValue(undefined);
    const onOpenChange = jest.fn();

    render(
        <GoalCreationDialog
            open={true}
            onOpenChange={onOpenChange}
            onCreateGoal={onCreateGoal}
            orgId="org_thrive_syracuse"
            {...props}
        />
    );

    return { onCreateGoal, onOpenChange };
}

function advanceToPlaybooksStep() {
    // Step 1: select a category
    fireEvent.click(screen.getByText('Revenue'));
    // Click Next to go to details
    fireEvent.click(screen.getByText(/Next/i));
}

function advanceToPlaybooksStepFromDetails() {
    // Fill in required details fields
    const titleInput = screen.getByPlaceholderText('Hit $50k this month');
    fireEvent.change(titleInput, { target: { value: 'My Revenue Goal' } });

    const targetInput = screen.getByPlaceholderText('e.g., 50');
    fireEvent.change(targetInput, { target: { value: '50000' } });

    // Click Next to move from details to playbooks
    fireEvent.click(screen.getAllByText(/Next/i)[0]);
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('GoalCreationDialog — Step 3 (playbooks)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('loading state', () => {
        it('shows a loading spinner while fetching playbooks', async () => {
            // Never resolves during this test
            mockGetAssignments.mockReturnValue(new Promise(() => {}));

            renderDialog();
            advanceToPlaybooksStep();
            advanceToPlaybooksStepFromDetails();

            await waitFor(() =>
                expect(screen.getByText(/Loading your playbooks/i)).toBeInTheDocument()
            );
        });
    });

    describe('when playbooks are available', () => {
        beforeEach(() => {
            mockGetAssignments.mockResolvedValue({
                activeIds: [
                    'birthday-loyalty-reminder',
                    'win-back-sequence',
                    'welcome-sequence',
                ],
                assignments: [],
                tierId: 'empire',
                totalAvailable: 3,
                totalActive: 3,
            });
        });

        it('renders playbook names as checkboxes', async () => {
            renderDialog();
            advanceToPlaybooksStep();
            advanceToPlaybooksStepFromDetails();

            await waitFor(() =>
                expect(screen.getByText('Birthday Loyalty Reminder')).toBeInTheDocument()
            );
            expect(screen.getByText('Win-Back Sequence')).toBeInTheDocument();
            expect(screen.getByText('Welcome Sequence')).toBeInTheDocument();
        });

        it('renders playbook descriptions', async () => {
            renderDialog();
            advanceToPlaybooksStep();
            advanceToPlaybooksStepFromDetails();

            await waitFor(() =>
                expect(
                    screen.getByText(/Monthly birthday cohort email/i)
                ).toBeInTheDocument()
            );
        });

        it('calls getDispensaryPlaybookAssignments with the orgId', async () => {
            renderDialog({ orgId: 'org_thrive_syracuse' });
            advanceToPlaybooksStep();
            advanceToPlaybooksStepFromDetails();

            await waitFor(() =>
                expect(mockGetAssignments).toHaveBeenCalledWith('org_thrive_syracuse')
            );
        });

        it('does not call getDispensaryPlaybookAssignments when orgId is undefined', async () => {
            renderDialog({ orgId: undefined });
            advanceToPlaybooksStep();
            advanceToPlaybooksStepFromDetails();

            await new Promise((r) => setTimeout(r, 100));
            expect(mockGetAssignments).not.toHaveBeenCalled();
        });

        it('toggles playbook selection when checkbox is clicked', async () => {
            renderDialog();
            advanceToPlaybooksStep();
            advanceToPlaybooksStepFromDetails();

            await waitFor(() =>
                expect(screen.getByText('Birthday Loyalty Reminder')).toBeInTheDocument()
            );

            const checkboxes = screen.getAllByRole('checkbox');
            fireEvent.click(checkboxes[0]);

            // After clicking, count text appears
            expect(screen.getByText(/1 playbook selected/i)).toBeInTheDocument();
        });

        it('shows selected count incrementally as checkboxes are toggled', async () => {
            renderDialog();
            advanceToPlaybooksStep();
            advanceToPlaybooksStepFromDetails();

            await waitFor(() =>
                expect(screen.getByText('Win-Back Sequence')).toBeInTheDocument()
            );

            const checkboxes = screen.getAllByRole('checkbox');
            fireEvent.click(checkboxes[0]);
            expect(screen.getByText(/1 playbook selected/i)).toBeInTheDocument();

            fireEvent.click(checkboxes[1]);
            expect(screen.getByText(/2 playbooks selected/i)).toBeInTheDocument();

            // Uncheck first
            fireEvent.click(checkboxes[0]);
            expect(screen.getByText(/1 playbook selected/i)).toBeInTheDocument();
        });

        it('does not fetch playbooks again on second visit to step (caches)', async () => {
            renderDialog();
            advanceToPlaybooksStep();
            advanceToPlaybooksStepFromDetails();

            await waitFor(() =>
                expect(screen.getByText('Birthday Loyalty Reminder')).toBeInTheDocument()
            );

            // Go back to details and then back to playbooks
            // Use role query to avoid matching "Win-Back Sequence" text
            fireEvent.click(screen.getByRole('button', { name: /Back/i }));
            fireEvent.click(screen.getAllByText(/Next/i)[0]);

            // Still only 1 call total
            await waitFor(() =>
                expect(mockGetAssignments).toHaveBeenCalledTimes(1)
            );
        });
    });

    describe('when no active playbooks exist', () => {
        it('shows empty state message', async () => {
            mockGetAssignments.mockResolvedValue({
                activeIds: [],
                assignments: [],
                tierId: 'empire',
                totalAvailable: 0,
                totalActive: 0,
            });

            renderDialog();
            advanceToPlaybooksStep();
            advanceToPlaybooksStepFromDetails();

            await waitFor(() =>
                expect(
                    screen.getByText(/No active playbooks found/i)
                ).toBeInTheDocument()
            );
        });
    });

    describe('when fetching playbooks fails', () => {
        it('shows empty state (graceful degradation)', async () => {
            mockGetAssignments.mockRejectedValue(new Error('Network error'));

            renderDialog();
            advanceToPlaybooksStep();
            advanceToPlaybooksStepFromDetails();

            await waitFor(() =>
                expect(
                    screen.getByText(/No active playbooks found/i)
                ).toBeInTheDocument()
            );
        });
    });

    describe('playbook IDs passed to onCreateGoal', () => {
        it('includes selected playbook IDs in the goal', async () => {
            mockGetAssignments.mockResolvedValue({
                activeIds: ['birthday-loyalty-reminder', 'win-back-sequence'],
                assignments: [],
                tierId: 'empire',
                totalAvailable: 2,
                totalActive: 2,
            });

            const { onCreateGoal } = renderDialog();
            advanceToPlaybooksStep();
            advanceToPlaybooksStepFromDetails();

            await waitFor(() =>
                expect(screen.getByText('Birthday Loyalty Reminder')).toBeInTheDocument()
            );

            // Select one playbook
            const checkboxes = screen.getAllByRole('checkbox');
            fireEvent.click(checkboxes[0]);

            // Click "Create Goal"
            fireEvent.click(screen.getByText('Create Goal'));

            await waitFor(() =>
                expect(onCreateGoal).toHaveBeenCalledWith(
                    expect.objectContaining({
                        playbookIds: ['birthday-loyalty-reminder'],
                    })
                )
            );
        });

        it('passes empty playbookIds when none are selected', async () => {
            mockGetAssignments.mockResolvedValue({
                activeIds: ['birthday-loyalty-reminder'],
                assignments: [],
                tierId: 'empire',
                totalAvailable: 1,
                totalActive: 1,
            });

            const { onCreateGoal } = renderDialog();
            advanceToPlaybooksStep();
            advanceToPlaybooksStepFromDetails();

            await waitFor(() =>
                expect(screen.getByText('Birthday Loyalty Reminder')).toBeInTheDocument()
            );

            // Do NOT select any playbooks — click Create directly
            fireEvent.click(screen.getByText('Create Goal'));

            await waitFor(() =>
                expect(onCreateGoal).toHaveBeenCalledWith(
                    expect.objectContaining({
                        playbookIds: [],
                    })
                )
            );
        });
    });
});
