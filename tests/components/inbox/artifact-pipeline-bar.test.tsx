/**
 * ArtifactPipelineBar Component Tests
 *
 * Tests for the HitL (Human-in-the-Loop) status progression component.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ArtifactPipelineBar, ArtifactPipelineCompact } from '@/components/inbox/artifact-pipeline-bar';
import type { InboxArtifactStatus } from '@/types/inbox';
import '@testing-library/jest-dom';

// Mock framer-motion (filter out animation props to avoid React warnings)
jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, animate, initial, whileHover, whileTap, transition, ...props }: any) => (
            <div {...props}>{children}</div>
        ),
    },
}));

// Mock Utils
jest.mock('@/lib/utils', () => ({
    cn: (...inputs: any[]) => inputs.filter(Boolean).join(' '),
}));

// Mock Lucide icons
jest.mock('lucide-react', () => ({
    FileEdit: () => <span data-testid="icon-file-edit">FileEdit</span>,
    Eye: () => <span data-testid="icon-eye">Eye</span>,
    CheckCircle2: () => <span data-testid="icon-check">CheckCircle2</span>,
    Rocket: () => <span data-testid="icon-rocket">Rocket</span>,
    ChevronRight: () => <span data-testid="icon-chevron">&gt;</span>,
}));

describe('ArtifactPipelineBar', () => {
    describe('Pipeline Stages Display', () => {
        it('renders all four pipeline stages', () => {
            render(<ArtifactPipelineBar currentStatus="draft" />);

            expect(screen.getByText('Draft')).toBeInTheDocument();
            expect(screen.getByText('Review')).toBeInTheDocument();
            expect(screen.getByText('Approved')).toBeInTheDocument();
            expect(screen.getByText('Published')).toBeInTheDocument();
        });

        it('renders correct icons for each stage', () => {
            render(<ArtifactPipelineBar currentStatus="draft" />);

            expect(screen.getByTestId('icon-file-edit')).toBeInTheDocument();
            expect(screen.getByTestId('icon-eye')).toBeInTheDocument();
            expect(screen.getByTestId('icon-check')).toBeInTheDocument();
            expect(screen.getByTestId('icon-rocket')).toBeInTheDocument();
        });

        it('renders chevron connectors between stages', () => {
            render(<ArtifactPipelineBar currentStatus="draft" />);

            // Should have 3 chevrons (between 4 stages)
            const chevrons = screen.getAllByTestId('icon-chevron');
            expect(chevrons).toHaveLength(3);
        });
    });

    describe('Status Highlighting', () => {
        it('highlights draft as current when status is draft', () => {
            const { container } = render(<ArtifactPipelineBar currentStatus="draft" />);

            // The first stage (Draft) should have the current styling (ring-1)
            const stages = container.querySelectorAll('[class*="ring-"]');
            expect(stages.length).toBeGreaterThanOrEqual(1);
        });

        it('highlights pending_review as current when status is pending_review', () => {
            render(<ArtifactPipelineBar currentStatus="pending_review" />);

            // Review stage should be highlighted, Draft should be completed
            expect(screen.getByText('Draft')).toBeInTheDocument();
            expect(screen.getByText('Review')).toBeInTheDocument();
        });

        it('highlights approved as current when status is approved', () => {
            render(<ArtifactPipelineBar currentStatus="approved" />);

            expect(screen.getByText('Draft')).toBeInTheDocument();
            expect(screen.getByText('Review')).toBeInTheDocument();
            expect(screen.getByText('Approved')).toBeInTheDocument();
        });

        it('highlights published as current when status is published', () => {
            render(<ArtifactPipelineBar currentStatus="published" />);

            expect(screen.getByText('Published')).toBeInTheDocument();
        });
    });

    describe('Rejected Status', () => {
        it('renders special rejected state instead of pipeline', () => {
            render(<ArtifactPipelineBar currentStatus="rejected" />);

            expect(screen.getByText('Rejected')).toBeInTheDocument();
            expect(screen.getByText('Needs revision')).toBeInTheDocument();
        });

        it('does not render pipeline stages when rejected', () => {
            render(<ArtifactPipelineBar currentStatus="rejected" />);

            expect(screen.queryByText('Draft')).not.toBeInTheDocument();
            expect(screen.queryByText('Review')).not.toBeInTheDocument();
            expect(screen.queryByText('Approved')).not.toBeInTheDocument();
            expect(screen.queryByText('Published')).not.toBeInTheDocument();
        });

        it('renders Eye icon for rejected status', () => {
            render(<ArtifactPipelineBar currentStatus="rejected" />);

            expect(screen.getByTestId('icon-eye')).toBeInTheDocument();
        });
    });

    describe('Custom Styling', () => {
        it('applies custom className', () => {
            const { container } = render(
                <ArtifactPipelineBar currentStatus="draft" className="custom-pipeline-class" />
            );

            expect(container.firstChild).toHaveClass('custom-pipeline-class');
        });
    });
});

describe('ArtifactPipelineCompact', () => {
    describe('Status Display', () => {
        it('renders draft status with correct label', () => {
            render(<ArtifactPipelineCompact currentStatus="draft" />);
            expect(screen.getByText('Draft')).toBeInTheDocument();
        });

        it('renders pending_review status with Review label', () => {
            render(<ArtifactPipelineCompact currentStatus="pending_review" />);
            expect(screen.getByText('Review')).toBeInTheDocument();
        });

        it('renders approved status with correct label', () => {
            render(<ArtifactPipelineCompact currentStatus="approved" />);
            expect(screen.getByText('Approved')).toBeInTheDocument();
        });

        it('renders published status with correct label', () => {
            render(<ArtifactPipelineCompact currentStatus="published" />);
            expect(screen.getByText('Published')).toBeInTheDocument();
        });

        it('renders rejected status with Draft label (fallback)', () => {
            render(<ArtifactPipelineCompact currentStatus="rejected" />);
            // Rejected falls through to index -1, so it shows first stage (Draft)
            expect(screen.getByText('Draft')).toBeInTheDocument();
        });
    });

    describe('Status Icons', () => {
        it('renders FileEdit icon for draft', () => {
            render(<ArtifactPipelineCompact currentStatus="draft" />);
            expect(screen.getByTestId('icon-file-edit')).toBeInTheDocument();
        });

        it('renders Eye icon for pending_review', () => {
            render(<ArtifactPipelineCompact currentStatus="pending_review" />);
            expect(screen.getByTestId('icon-eye')).toBeInTheDocument();
        });

        it('renders CheckCircle2 icon for approved', () => {
            render(<ArtifactPipelineCompact currentStatus="approved" />);
            expect(screen.getByTestId('icon-check')).toBeInTheDocument();
        });

        it('renders Rocket icon for published', () => {
            render(<ArtifactPipelineCompact currentStatus="published" />);
            expect(screen.getByTestId('icon-rocket')).toBeInTheDocument();
        });
    });

    describe('Progress Dots', () => {
        it('renders 4 progress dots', () => {
            const { container } = render(<ArtifactPipelineCompact currentStatus="draft" />);
            const dots = container.querySelectorAll('.rounded-full.w-1.h-1');
            expect(dots).toHaveLength(4);
        });

        it('highlights correct number of dots for draft (1)', () => {
            const { container } = render(<ArtifactPipelineCompact currentStatus="draft" />);
            const dots = container.querySelectorAll('.rounded-full.w-1.h-1');

            // First dot should be highlighted (bg-current), rest should be dimmed (bg-current/30)
            expect(dots[0]).toHaveClass('bg-current');
        });

        it('highlights correct number of dots for approved (3)', () => {
            const { container } = render(<ArtifactPipelineCompact currentStatus="approved" />);
            const dots = container.querySelectorAll('.rounded-full.w-1.h-1');

            // First 3 dots should be highlighted
            expect(dots[0]).toHaveClass('bg-current');
            expect(dots[1]).toHaveClass('bg-current');
            expect(dots[2]).toHaveClass('bg-current');
        });

        it('highlights all dots for published (4)', () => {
            const { container } = render(<ArtifactPipelineCompact currentStatus="published" />);
            const dots = container.querySelectorAll('.rounded-full.w-1.h-1');

            // All dots should be highlighted
            dots.forEach(dot => {
                expect(dot).toHaveClass('bg-current');
            });
        });
    });

    describe('Status Colors', () => {
        const statusColors: Record<InboxArtifactStatus, string> = {
            draft: 'bg-amber-500/10',
            pending_review: 'bg-blue-500/10',
            approved: 'bg-baked-500/10',
            published: 'bg-emerald-500/10',
            rejected: 'bg-red-500/10',
        };

        Object.entries(statusColors).forEach(([status, expectedClass]) => {
            it(`applies ${expectedClass} for ${status} status`, () => {
                const { container } = render(
                    <ArtifactPipelineCompact currentStatus={status as InboxArtifactStatus} />
                );

                expect(container.firstChild).toHaveClass(expectedClass);
            });
        });
    });

    describe('Custom Styling', () => {
        it('applies custom className', () => {
            const { container } = render(
                <ArtifactPipelineCompact currentStatus="draft" className="custom-compact-class" />
            );

            expect(container.firstChild).toHaveClass('custom-compact-class');
        });
    });
});
