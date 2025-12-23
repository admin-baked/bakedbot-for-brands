import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TaskFeed } from '@/components/dashboard/task-feed';
import { useUserRole } from '@/hooks/use-user-role';
import type { Task } from '@/types/agent-workspace';
import '@testing-library/jest-dom';

// Mock useUserRole
jest.mock('@/hooks/use-user-role', () => ({
    useUserRole: jest.fn(),
}));

// Mock Lucide icons
jest.mock('lucide-react', () => ({
    Loader2: () => <div data-testid="loader" />,
    AlertCircle: () => <div data-testid="alert-icon" />,
    CheckCircle: () => <div data-testid="check-icon" />,
    ExternalLink: () => <div data-testid="ext-link" />,
    FileText: () => <div data-testid="file-icon" />,
    Link: () => <div data-testid="link-icon" />,
}));

const MOCK_TASKS: Task[] = [
    {
        taskId: 'task_1',
        userId: 'user_1',
        title: 'Running Task',
        status: 'running',
        type: 'menu_gen',
        createdAt: new Date('2023-01-01T10:00:00Z'),
        updatedAt: new Date('2023-01-01T10:00:00Z'),
        steps: ['Step 1', 'Step 2'],
        currentStep: 1,
        approvalRequired: false
    },
    {
        taskId: 'task_2',
        userId: 'user_1',
        title: 'Approval Task',
        status: 'needs_approval',
        type: 'email_outreach',
        createdAt: new Date('2023-01-01T11:00:00Z'),
        updatedAt: new Date('2023-01-01T11:00:00Z'),
        approvalRequired: true,
        approvalData: {
            actionType: 'send_email',
            details: { summary: 'Please review this email campaign' },
            estimatedUsage: {}
        }
    },
    {
        taskId: 'task_3',
        userId: 'user_1',
        title: 'Completed Task',
        status: 'completed',
        type: 'brand_audit',
        createdAt: new Date('2023-01-01T12:00:00Z'),
        updatedAt: new Date('2023-01-01T12:00:00Z'),
        approvalRequired: false,
        artifacts: [
            { label: 'Audit Report', url: '#', type: 'file' }
        ]
    }
];

describe('TaskFeed', () => {
    beforeEach(() => {
        (useUserRole as jest.Mock).mockReturnValue({ user: { uid: 'user_1' } });
    });

    it('renders loading state when no initial tasks provided', () => {
        render(<TaskFeed />);
        expect(screen.getByTestId('loader')).toBeInTheDocument();
    });

    it('renders empty states for all tabs when tasks are empty', async () => {
        render(<TaskFeed initialTasks={[]} />);
        
        // Running tab (default)
        expect(screen.getByText('No tasks running')).toBeInTheDocument();

        // Switch to Approvals
        fireEvent.click(screen.getByRole('tab', { name: /Approvals/i }));
        expect(await screen.findByText('No approvals needed')).toBeInTheDocument();

        // Switch to Completed
        fireEvent.click(screen.getByRole('tab', { name: /Completed/i }));
        expect(await screen.findByText('No completed tasks yet. Try a Quick Start!')).toBeInTheDocument();
    });

    it('renders running tasks and step info', () => {
        render(<TaskFeed initialTasks={MOCK_TASKS} />);
        
        expect(screen.getByText('Running Task')).toBeInTheDocument();
        expect(screen.getByText('Step 1 of 2')).toBeInTheDocument();
        expect(screen.getByText('Step 1')).toBeInTheDocument();
    });

    it('renders task counts in tab triggers', () => {
        render(<TaskFeed initialTasks={MOCK_TASKS} />);
        
        expect(screen.getByRole('tab', { name: /Running \(1\)/i })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /Approvals \(1\)/i })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /Completed \(1\)/i })).toBeInTheDocument();
    });

    it('renders approval task details and button', async () => {
        render(<TaskFeed initialTasks={MOCK_TASKS} />);
        
        fireEvent.click(screen.getByRole('tab', { name: /Approvals \(1\)/i }));
        
        expect(await screen.findByText('Approval Task')).toBeInTheDocument();
        expect(screen.getByText('Please review this email campaign')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Review & Approve/i })).toBeInTheDocument();
    });

    it('renders completed task with artifacts', async () => {
        render(<TaskFeed initialTasks={MOCK_TASKS} />);
        
        fireEvent.click(screen.getByRole('tab', { name: /Completed \(1\)/i }));
        
        expect(await screen.findByText('Completed Task')).toBeInTheDocument();
        expect(screen.getByText('Audit Report')).toBeInTheDocument();
        expect(screen.getByText('Audit Report')).toHaveAttribute('href', '#');
    });
});
