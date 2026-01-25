import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { WorkflowLifecycle } from '@/components/brand/creative/workflow-lifecycle';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
    Clock: () => <div data-testid="icon-clock" />,
    CheckCircle2: () => <div data-testid="icon-check" />,
    MoreHorizontal: () => <div data-testid="icon-more" />,
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('WorkflowLifecycle', () => {
    const defaultProps = {
        currentStatus: 'pending' as const,
        onApprove: jest.fn(),
        onSchedule: jest.fn(),
        agentName: 'Craig',
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Rendering', () => {
        it('renders panel title', () => {
            render(<WorkflowLifecycle {...defaultProps} />);
            expect(screen.getByText('Workflow & Approval Lifecycle')).toBeInTheDocument();
        });

        it('renders all workflow steps', () => {
            render(<WorkflowLifecycle {...defaultProps} />);
            expect(screen.getByText('Draft')).toBeInTheDocument();
            expect(screen.getByText('Pending Review')).toBeInTheDocument();
            expect(screen.getByText('Under Revision')).toBeInTheDocument();
            expect(screen.getByText('Approved')).toBeInTheDocument();
            expect(screen.getByText('Scheduled')).toBeInTheDocument();
        });
    });

    describe('Status Display', () => {
        it('shows draft status badge', () => {
            render(<WorkflowLifecycle {...defaultProps} currentStatus="draft" />);
            expect(screen.getByText('Draft - Pending Submission')).toBeInTheDocument();
        });

        it('shows pending status badge', () => {
            render(<WorkflowLifecycle {...defaultProps} currentStatus="pending" />);
            expect(screen.getByText('Awaiting Review')).toBeInTheDocument();
        });

        it('shows revision status badge with agent name', () => {
            render(<WorkflowLifecycle {...defaultProps} currentStatus="revision" />);
            expect(screen.getByText('Craig is revising...')).toBeInTheDocument();
        });

        it('shows approved status badge', () => {
            render(<WorkflowLifecycle {...defaultProps} currentStatus="approved" />);
            expect(screen.getByText('Ready to Schedule')).toBeInTheDocument();
        });

        it('shows scheduled status badge', () => {
            render(<WorkflowLifecycle {...defaultProps} currentStatus="scheduled" />);
            expect(screen.getByText('Scheduled for Publishing')).toBeInTheDocument();
        });
    });

    describe('Action Buttons', () => {
        it('shows Approve button when pending', () => {
            render(<WorkflowLifecycle {...defaultProps} currentStatus="pending" />);
            expect(screen.getByText('Approve')).toBeInTheDocument();
        });

        it('shows Approve button when in revision', () => {
            render(<WorkflowLifecycle {...defaultProps} currentStatus="revision" />);
            expect(screen.getByText('Approve')).toBeInTheDocument();
        });

        it('shows Approve & Schedule button when approved', () => {
            render(<WorkflowLifecycle {...defaultProps} currentStatus="approved" />);
            expect(screen.getByText('Approve & Schedule')).toBeInTheDocument();
        });

        it('shows View Schedule button when scheduled', () => {
            render(<WorkflowLifecycle {...defaultProps} currentStatus="scheduled" />);
            expect(screen.getByText('View Schedule')).toBeInTheDocument();
        });

        it('calls onApprove when Approve button clicked', () => {
            render(<WorkflowLifecycle {...defaultProps} currentStatus="pending" />);
            fireEvent.click(screen.getByText('Approve'));
            expect(defaultProps.onApprove).toHaveBeenCalled();
        });

        it('calls onSchedule when Schedule button clicked', () => {
            render(<WorkflowLifecycle {...defaultProps} currentStatus="approved" />);
            fireEvent.click(screen.getByText('Approve & Schedule'));
            expect(defaultProps.onSchedule).toHaveBeenCalled();
        });
    });

    describe('Agent Display', () => {
        it('shows agent name during revision', () => {
            render(<WorkflowLifecycle {...defaultProps} currentStatus="revision" agentName="Nano Banana" />);
            expect(screen.getByText('Nano Banana is revising...')).toBeInTheDocument();
        });
    });
});
