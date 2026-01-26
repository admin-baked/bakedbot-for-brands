
import React from 'react';
import { render, screen } from '@testing-library/react';
import AgenticCommandCenter from '@/app/dashboard/page';

// Mock the hook
jest.mock('@/hooks/use-agentic-dashboard', () => ({
    useAgenticDashboard: () => ({
        agentSquad: [],
        messages: [
            {
                id: '1',
                agent: { name: 'Test Agent', role: 'Tester', img: '' },
                message: 'Test Message Content',
                time: '10:00 AM',
                actions: false
            }
        ],
        taskFeed: {
            agent: { name: 'Worker Agent', role: 'Worker', img: '' },
            task: 'Performing important task',
            progress: 50,
            status: 'live'
        },
        inputValue: '',
        setInputValue: jest.fn(),
        sendMessage: jest.fn()
    }),
    AGENT_SQUAD: []
}));

// Mock UI components that might cause issues in JSDOM
jest.mock('@/components/ui/scroll-area', () => ({
    ScrollArea: ({ children }: { children: React.ReactNode }) => <div data-testid="scroll-area">{children}</div>,
    ScrollBar: () => null
}));

jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, className }: any) => <div className={className}>{children}</div>
    }
}));

// Mock Lucide Icons
jest.mock('lucide-react', () => ({
    ChevronLeft: () => <span data-testid="icon-chevron-left" />,
    Check: () => <span data-testid="icon-check" />,
    Send: () => <span data-testid="icon-send" />,
    Smile: () => <span data-testid="icon-smile" />,
    MoreHorizontal: () => <span data-testid="icon-more-horizontal" />,
    Edit2: () => <span data-testid="icon-edit2" />,
    Share: () => <span data-testid="icon-share" />,
    Trash2: () => <span data-testid="icon-trash2" />,
    ThumbsUp: () => <span data-testid="icon-thumbs-up" />,
    ChevronRight: () => <span data-testid="icon-chevron-right" />,
    ArrowUpRight: () => <span data-testid="icon-arrow-up-right" />,
    HelpCircle: () => <span data-testid="icon-help-circle" />,
    Bell: () => <span data-testid="icon-bell" />,
}));

describe('AgenticCommandCenter', () => {
    it('renders the main layout structure', () => {
        render(<AgenticCommandCenter />);

        // This title is in the sub-header which is still part of the page component
        // "Agentic Command Center" title was removed from page.tsx (now in layout), 
        // but "Create 4/20 Promotion" is in the page.
        const titles = screen.getAllByText('Create 4/20 Promotion');
        expect(titles.length).toBeGreaterThan(0);
        const pendingBadges = screen.getAllByText('Pending Review');
        expect(pendingBadges.length).toBeGreaterThan(0);
    });

    it('renders conversation thread and messages', () => {
        render(<AgenticCommandCenter />);
        expect(screen.getByText('Conversation Thread')).toBeInTheDocument();
        expect(screen.getByText('Test Message Content')).toBeInTheDocument();
        expect(screen.getByText('Test Agent')).toBeInTheDocument();
    });

    it('renders task feed', () => {
        render(<AgenticCommandCenter />);
        expect(screen.getByText('Task Feed')).toBeInTheDocument();
        expect(screen.getByText('Performing important task')).toBeInTheDocument();
    });

    it('renders artifacts section', () => {
        render(<AgenticCommandCenter />);
        expect(screen.getByText('Artifacts')).toBeInTheDocument();
        expect(screen.getByText('Carousel Draft')).toBeInTheDocument();
    });
});
