import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrandPlaybooksView } from '../brand-playbooks-view';
import { createPlaybook } from '@/server/actions/playbooks';
import '@testing-library/jest-dom';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
    BookOpen: () => <span data-testid="icon-book-open" />,
    History: () => <span data-testid="icon-history" />,
    Settings2: () => <span data-testid="icon-settings2" />,
    CheckCircle2: () => <span data-testid="icon-check-circle" />,
    XCircle: () => <span data-testid="icon-x-circle" />,
    Clock: () => <span data-testid="icon-clock" />,
    ChevronDown: () => <span data-testid="icon-chevron-down" />,
    ChevronUp: () => <span data-testid="icon-chevron-up" />,
    AlertCircle: () => <span data-testid="icon-alert-circle" />
}));

// Mock dependencies
jest.mock('@/hooks/use-toast', () => ({
    useToast: () => ({ toast: jest.fn() })
}));

jest.mock('@/server/actions/playbooks', () => ({
    createPlaybook: jest.fn()
}));

// Mock BrandPlaybooksList component
jest.mock('../brand-playbooks-list', () => ({
    BrandPlaybooksList: jest.fn(() => <div data-testid="mock-playbooks-list">Playbooks List</div>)
}));

// Mock CreatePlaybookDialog component
jest.mock('../../../playbooks/components/create-playbook-dialog', () => ({
    CreatePlaybookDialog: jest.fn(({ onCreateFromScratch, onCloneTemplate }) => (
        <div data-testid="mock-create-dialog">
            <button
                data-testid="create-from-scratch-btn"
                onClick={() => onCreateFromScratch({
                    name: 'Test Playbook',
                    description: 'Test description',
                    agent: 'craig',
                    category: 'marketing'
                })}
            >
                Create from Scratch
            </button>
            <button
                data-testid="clone-template-btn"
                onClick={() => onCloneTemplate('daily_intel')}
            >
                Clone Template
            </button>
        </div>
    ))
}));

// Mock Collapsible components
jest.mock('@/components/ui/collapsible', () => ({
    Collapsible: ({ children, open, onOpenChange }: any) => (
        <div data-testid="collapsible" data-open={open}>
            {children}
        </div>
    ),
    CollapsibleContent: ({ children }: any) => (
        <div data-testid="collapsible-content">{children}</div>
    ),
    CollapsibleTrigger: ({ children, asChild }: any) => (
        <div data-testid="collapsible-trigger">{children}</div>
    )
}));

describe('BrandPlaybooksView', () => {
    const mockBrandId = 'test-brand-123';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('View switching', () => {
        it('renders with library view by default', () => {
            render(<BrandPlaybooksView brandId={mockBrandId} />);

            expect(screen.getByText('OPERATIONAL PLAYBOOKS')).toBeInTheDocument();
            expect(screen.getByTestId('mock-playbooks-list')).toBeInTheDocument();
            expect(screen.getByText('View Run History')).toBeInTheDocument();
        });

        it('switches to history view when clicking View Run History', () => {
            render(<BrandPlaybooksView brandId={mockBrandId} />);

            fireEvent.click(screen.getByText('View Run History'));

            expect(screen.getByText('Recent Activity Log')).toBeInTheDocument();
            expect(screen.getByText('View Library')).toBeInTheDocument();
        });

        it('switches back to library view from history', () => {
            render(<BrandPlaybooksView brandId={mockBrandId} />);

            // Switch to history
            fireEvent.click(screen.getByText('View Run History'));
            expect(screen.getByText('Recent Activity Log')).toBeInTheDocument();

            // Switch back to library
            fireEvent.click(screen.getByText('View Library'));
            expect(screen.getByTestId('mock-playbooks-list')).toBeInTheDocument();
        });
    });

    describe('Create Playbook functionality', () => {
        it('renders CreatePlaybookDialog', () => {
            render(<BrandPlaybooksView brandId={mockBrandId} />);

            expect(screen.getByTestId('mock-create-dialog')).toBeInTheDocument();
        });

        it('calls createPlaybook when creating from scratch', async () => {
            (createPlaybook as jest.Mock).mockResolvedValue({ success: true });

            render(<BrandPlaybooksView brandId={mockBrandId} />);

            fireEvent.click(screen.getByTestId('create-from-scratch-btn'));

            await waitFor(() => {
                expect(createPlaybook).toHaveBeenCalledWith(mockBrandId, {
                    name: 'Test Playbook',
                    description: 'Test description',
                    agent: 'craig',
                    category: 'marketing',
                    triggers: [],
                    steps: []
                });
            });
        });

        it('calls createPlaybook with template data when cloning', async () => {
            (createPlaybook as jest.Mock).mockResolvedValue({ success: true });

            render(<BrandPlaybooksView brandId={mockBrandId} />);

            fireEvent.click(screen.getByTestId('clone-template-btn'));

            await waitFor(() => {
                expect(createPlaybook).toHaveBeenCalledWith(mockBrandId, expect.objectContaining({
                    name: 'Daily Intelligence Snapshot',
                    agent: 'ezal',
                    category: 'intel'
                }));
            });
        });
    });

    describe('Run History view', () => {
        it('displays run history items with status indicators', () => {
            render(<BrandPlaybooksView brandId={mockBrandId} />);

            fireEvent.click(screen.getByText('View Run History'));

            // Should show mock run history items
            expect(screen.getByText('Retail Coverage Builder')).toBeInTheDocument();
            expect(screen.getByText('OOS / Restock Nudge')).toBeInTheDocument();
            expect(screen.getByText('Velocity Watch')).toBeInTheDocument();
        });

        it('shows error details for failed runs', () => {
            render(<BrandPlaybooksView brandId={mockBrandId} />);

            fireEvent.click(screen.getByText('View Run History'));

            // The failed run should show API error
            expect(screen.getByText('API Error: Retailer #402')).toBeInTheDocument();
        });

        it('has expandable Details buttons', () => {
            render(<BrandPlaybooksView brandId={mockBrandId} />);

            fireEvent.click(screen.getByText('View Run History'));

            // Multiple Details buttons should exist (one per run)
            const detailsButtons = screen.getAllByText('Details');
            expect(detailsButtons.length).toBeGreaterThan(0);
        });
    });

    describe('Batch actions', () => {
        it('shows batch action buttons in library view', () => {
            render(<BrandPlaybooksView brandId={mockBrandId} />);

            expect(screen.getByText('Batch Actions:')).toBeInTheDocument();
            expect(screen.getByText('Enable All')).toBeInTheDocument();
            expect(screen.getByText('Disable All')).toBeInTheDocument();
            expect(screen.getByText('Clear Cache')).toBeInTheDocument();
        });
    });
});
