import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlaybookCardModern } from '@/app/dashboard/playbooks/components/playbook-card-modern';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
    MoreHorizontal: () => <div data-testid="icon-more" />,
    LineChart: () => <div data-testid="icon-linechart" />,
    FileText: () => <div data-testid="icon-filetext" />,
    AlertTriangle: () => <div data-testid="icon-alert" />,
    ShieldAlert: () => <div data-testid="icon-shield" />,
    BarChart3: () => <div data-testid="icon-barchart" />,
    Zap: () => <div data-testid="icon-zap" />,
    Brain: () => <div data-testid="icon-brain" />,
    Settings: () => <div data-testid="icon-settings" />,
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const mockPlaybook = {
    id: 'test-playbook-1',
    title: 'Daily Intelligence Snapshot',
    type: 'INTEL' as const,
    description: 'Daily brand/dispensary snapshot tracking placements and pricing.',
    tags: ['monitoring', 'market-sensors'],
    active: true,
    status: 'active' as const,
    prompt: 'Set up a daily intelligence snapshot',
};

describe('PlaybookCardModern', () => {
    describe('Rendering', () => {
        it('renders playbook title', () => {
            render(<PlaybookCardModern playbook={mockPlaybook} />);
            expect(screen.getByText('Daily Intelligence Snapshot')).toBeInTheDocument();
        });

        it('renders playbook description', () => {
            render(<PlaybookCardModern playbook={mockPlaybook} />);
            expect(screen.getByText(/Daily brand\/dispensary snapshot/)).toBeInTheDocument();
        });

        it('renders playbook type badge', () => {
            render(<PlaybookCardModern playbook={mockPlaybook} />);
            expect(screen.getByText('INTEL')).toBeInTheDocument();
        });

        it('renders schedule text for daily playbooks', () => {
            render(<PlaybookCardModern playbook={mockPlaybook} />);
            expect(screen.getByText('Runs daily')).toBeInTheDocument();
        });

        it('renders event-driven text for OPS playbooks', () => {
            const opsPlaybook = { ...mockPlaybook, type: 'OPS' as const };
            render(<PlaybookCardModern playbook={opsPlaybook} />);
            expect(screen.getByText('Event-driven')).toBeInTheDocument();
        });
    });

    describe('Toggle Switch', () => {
        it('renders toggle switch in enabled state', () => {
            render(<PlaybookCardModern playbook={mockPlaybook} />);
            const switches = screen.getAllByRole('switch');
            expect(switches.length).toBeGreaterThan(0);
            expect(switches[0]).toHaveAttribute('aria-checked', 'true');
        });

        it('renders toggle switch in disabled state', () => {
            const disabledPlaybook = { ...mockPlaybook, active: false };
            render(<PlaybookCardModern playbook={disabledPlaybook} />);
            const switches = screen.getAllByRole('switch');
            expect(switches[0]).toHaveAttribute('aria-checked', 'false');
        });

        it('calls onToggle when switch is clicked', () => {
            const onToggle = jest.fn();
            render(<PlaybookCardModern playbook={mockPlaybook} onToggle={onToggle} />);
            const switches = screen.getAllByRole('switch');
            fireEvent.click(switches[0]);
            expect(onToggle).toHaveBeenCalledWith('test-playbook-1', false);
        });
    });

    describe('Interactions', () => {
        it('calls onRun when card is clicked', () => {
            const onRun = jest.fn();
            render(<PlaybookCardModern playbook={mockPlaybook} onRun={onRun} />);
            const card = screen.getByText('Daily Intelligence Snapshot').closest('[class*="cursor-pointer"]');
            if (card) fireEvent.click(card);
            expect(onRun).toHaveBeenCalledWith(mockPlaybook);
        });
    });

    describe('Category Configurations', () => {
        const categories = ['INTEL', 'SEO', 'OPS', 'COMPLIANCE', 'FINANCE', 'AUTOMATION', 'REPORTING'] as const;

        categories.forEach((category) => {
            it(`renders ${category} playbook correctly`, () => {
                const playbook = { ...mockPlaybook, type: category };
                render(<PlaybookCardModern playbook={playbook} />);
                expect(screen.getByText(category)).toBeInTheDocument();
            });
        });
    });
});
