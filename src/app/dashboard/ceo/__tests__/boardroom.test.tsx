
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock the PuffChat component
jest.mock('@/app/dashboard/ceo/components/puff-chat', () => ({
    PuffChat: ({ persona }: any) => <div data-testid="agent-chat">{persona}</div>
}));

// Mock AgentDebugPanel (added in recent refactor)
jest.mock('@/app/dashboard/ceo/components/agent-debug-panel', () => ({
    AgentDebugPanel: () => null,
    useAgentDebug: () => ({
        isDebugVisible: false,
        toggleDebug: jest.fn(),
        setDebugContext: jest.fn(),
    }),
}));

// Mock data actions — analytics load async; default to empty
jest.mock('@/app/dashboard/ceo/actions/data-actions', () => ({
    getPlatformAnalytics: jest.fn().mockResolvedValue({
        revenue: { mrr: 0, arr: 0, arpu: 0 },
        signups: { total: 0 },
        activeUsers: { daily: 0 },
    }),
}));

// Mock Gmail action (dynamic import inside useEffect)
jest.mock('@/server/actions/gmail', () => ({
    checkGmailConnection: jest.fn().mockResolvedValue({ isConnected: false }),
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
    useSearchParams: jest.fn().mockReturnValue({ get: jest.fn().mockReturnValue(null) }),
    usePathname: jest.fn().mockReturnValue('/dashboard/ceo'),
}));

// Mock lucide-react (only icons needed by boardroom-tab)
jest.mock('lucide-react', () => {
    const mockIcon = (name: string) => (props: any) => <svg data-testid={`icon-${name}`} {...props} />;
    return {
        Users: mockIcon('Users'),
        Rocket: mockIcon('Rocket'),
        Briefcase: mockIcon('Briefcase'),
        Wrench: mockIcon('Wrench'),
        Sparkles: mockIcon('Sparkles'),
        DollarSign: mockIcon('DollarSign'),
        BarChart3: mockIcon('BarChart3'),
        ShieldAlert: mockIcon('ShieldAlert'),
        Zap: mockIcon('Zap'),
        TrendingUp: mockIcon('TrendingUp'),
        CheckCircle2: mockIcon('CheckCircle2'),
        MessageSquare: mockIcon('MessageSquare'),
        Send: mockIcon('Send'),
        TrendingDown: mockIcon('TrendingDown'),
        BookOpen: mockIcon('BookOpen'),
        Scale: mockIcon('Scale'),
        Heart: mockIcon('Heart'),
        Megaphone: mockIcon('Megaphone'),
        Eye: mockIcon('Eye'),
        Shield: mockIcon('Shield'),
        ChevronRight: mockIcon('ChevronRight'),
    };
});

// Mock firebase auth
jest.mock('@/firebase/auth/use-user', () => ({
    useUser: () => ({ user: { uid: 'user-123' } })
}));

// Mock utils
jest.mock('@/lib/utils', () => ({
    cn: (...args: any[]) => args.filter(Boolean).join(' ')
}));

// Mock Badge and Card to avoid complex shadcn deps
jest.mock('@/components/ui/badge', () => ({
    Badge: ({ children, className }: any) => <span className={className}>{children}</span>,
}));

jest.mock('@/components/ui/card', () => ({
    Card: ({ children, className }: any) => <div className={className}>{children}</div>,
    CardContent: ({ children, className }: any) => <div className={className}>{children}</div>,
    CardHeader: ({ children, className }: any) => <div className={className}>{children}</div>,
    CardTitle: ({ children }: any) => <h3>{children}</h3>,
    CardDescription: ({ children }: any) => <p>{children}</p>,
}));

describe('BoardroomTab', () => {
    let BoardroomTab: any;

    beforeAll(async () => {
        const module = await import('../components/boardroom-tab');
        BoardroomTab = module.default;
    });

    it('should render the boardroom header', () => {
        render(<BoardroomTab />);
        expect(screen.getByText('Executive Boardroom')).toBeInTheDocument();
    });

    it('should render Leo and Jack in the agent team', () => {
        render(<BoardroomTab />);
        expect(screen.getAllByText('Leo').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Jack').length).toBeGreaterThan(0);
    });

    it('should default to Leo as the current speaker', () => {
        render(<BoardroomTab />);
        expect(screen.getByText(/Current Speaker: Leo/)).toBeInTheDocument();
        expect(screen.getByTestId('agent-chat').textContent).toBe('leo');
    });

    it('should switch agents when clicking on their button', () => {
        render(<BoardroomTab />);

        // Jack has multiple buttons (mobile strip + desktop sidebar) — click first one
        const jackButtons = screen.getAllByText('Jack');
        fireEvent.click(jackButtons[0].closest('button')!);

        expect(screen.getByText(/Current Speaker: Jack/)).toBeInTheDocument();
        expect(screen.getByTestId('agent-chat').textContent).toBe('jack');
    });
});
