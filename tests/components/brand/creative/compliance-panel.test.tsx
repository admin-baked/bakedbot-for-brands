import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CompliancePanel } from '@/components/brand/creative/compliance-panel';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
    ShieldAlert: () => <div data-testid="icon-shield-alert" />,
    ShieldCheck: () => <div data-testid="icon-shield-check" />,
    XCircle: () => <div data-testid="icon-x-circle" />,
    AlertTriangle: () => <div data-testid="icon-alert" />,
    MoreHorizontal: () => <div data-testid="icon-more" />,
    CheckCircle2: () => <div data-testid="icon-check" />,
    ArrowRight: () => <div data-testid="icon-arrow" />,
}));

describe('CompliancePanel', () => {
    const defaultProps = {
        score: 85,
        status: 'warning' as const,
        issues: [],
        onApplyFixes: jest.fn(),
        onDismiss: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Rendering', () => {
        it('renders panel title', () => {
            render(<CompliancePanel {...defaultProps} />);
            expect(screen.getByText('Deebo Redline & Compliance')).toBeInTheDocument();
        });

        it('renders compliance score', () => {
            render(<CompliancePanel {...defaultProps} />);
            expect(screen.getByText('Compliance Score: 85%')).toBeInTheDocument();
        });

        it('renders progress bar', () => {
            const { container } = render(<CompliancePanel {...defaultProps} />);
            expect(container.querySelector('[role="progressbar"]')).toBeInTheDocument();
        });
    });

    describe('Status States', () => {
        it('shows active status for score >= 95', () => {
            render(<CompliancePanel {...defaultProps} score={100} status="active" />);
            expect(screen.getByText('Compliance Score: 100%')).toBeInTheDocument();
        });

        it('shows warning status for score between 70-95', () => {
            render(<CompliancePanel {...defaultProps} score={85} status="warning" />);
            expect(screen.getByText('Compliance Score: 85%')).toBeInTheDocument();
        });

        it('shows review_needed status for score < 70', () => {
            render(<CompliancePanel {...defaultProps} score={60} status="review_needed" />);
            expect(screen.getByText('Compliance Score: 60%')).toBeInTheDocument();
        });
    });

    describe('With Issues', () => {
        const issues = [
            {
                id: '1',
                flaggedText: 'Feel the force of relaxation.',
                reason: 'Implied Health Claim',
                suggestion: 'Experience our premium selection.',
                severity: 'error' as const,
            },
            {
                id: '2',
                flaggedText: 'Cures anxiety',
                reason: 'Medical Claim',
                suggestion: 'May promote calmness',
                severity: 'error' as const,
            },
        ];

        it('displays issue count badge', () => {
            render(<CompliancePanel {...defaultProps} issues={issues} />);
            expect(screen.getByText('2 Issues Found')).toBeInTheDocument();
        });

        it('displays flagged content', () => {
            render(<CompliancePanel {...defaultProps} issues={issues} />);
            expect(screen.getByText(/Feel the force of relaxation/)).toBeInTheDocument();
        });

        it('displays issue reason', () => {
            render(<CompliancePanel {...defaultProps} issues={issues} />);
            expect(screen.getByText('Implied Health Claim')).toBeInTheDocument();
        });

        it('displays suggestion', () => {
            render(<CompliancePanel {...defaultProps} issues={issues} />);
            expect(screen.getByText('Experience our premium selection.')).toBeInTheDocument();
        });

        it('shows Apply Fixes button when issues exist', () => {
            render(<CompliancePanel {...defaultProps} issues={issues} />);
            expect(screen.getByText('Apply Fixes')).toBeInTheDocument();
        });

        it('calls onApplyFixes when button clicked', () => {
            render(<CompliancePanel {...defaultProps} issues={issues} />);
            fireEvent.click(screen.getByText('Apply Fixes'));
            expect(defaultProps.onApplyFixes).toHaveBeenCalled();
        });
    });

    describe('No Issues (Compliant)', () => {
        it('shows compliant message when no issues', () => {
            render(<CompliancePanel {...defaultProps} issues={[]} />);
            expect(screen.getByText('Content is compliant and ready to publish')).toBeInTheDocument();
        });

        it('does not show Apply Fixes button when compliant', () => {
            render(<CompliancePanel {...defaultProps} issues={[]} />);
            expect(screen.queryByText('Apply Fixes')).not.toBeInTheDocument();
        });
    });

    describe('Compliance Checks', () => {
        const checks = [
            { checkType: 'Age Gate', passed: true, checkedAt: Date.now() },
            { checkType: 'Health Claims', passed: false, checkedAt: Date.now() },
        ];

        it('displays passed checks', () => {
            render(<CompliancePanel {...defaultProps} checks={checks} />);
            expect(screen.getByText('Age Gate')).toBeInTheDocument();
        });

        it('displays failed checks', () => {
            render(<CompliancePanel {...defaultProps} checks={checks} />);
            expect(screen.getByText('Health Claims')).toBeInTheDocument();
        });
    });
});
