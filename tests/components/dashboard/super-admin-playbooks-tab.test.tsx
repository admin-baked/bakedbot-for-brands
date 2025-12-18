import React from 'react';
import { render, screen } from '@testing-library/react';
import SuperAdminPlaybooksTab from '@/app/dashboard/ceo/components/super-admin-playbooks-tab';
import { useAgentChatStore } from '@/lib/store/agent-chat-store';

// Mock dependencies
jest.mock('@/lib/store/agent-chat-store', () => ({
    useAgentChatStore: jest.fn(),
}));

jest.mock('@/hooks/use-toast', () => ({
    useToast: () => ({ toast: jest.fn() })
}));

// Mock child components with FULL PATHS as they are usually resolved
jest.mock('@/app/dashboard/ceo/components/puff-chat', () => ({
    PuffChat: () => <div data-testid="puff-chat">Mock Puff Chat</div>
}));

jest.mock('@/app/dashboard/ceo/components/super-admin-right-sidebar', () => ({
    SuperAdminRightSidebar: () => <div data-testid="right-sidebar">Mock Sidebar</div>
}));

jest.mock('@/app/dashboard/ceo/agents/actions', () => ({
    executePlaybook: jest.fn()
}));

// Mock Lucide Icons
jest.mock('lucide-react', () => ({
    Zap: () => <div data-testid="icon-zap" />,
    Clock: () => <div data-testid="icon-clock" />,
    Bot: () => <div data-testid="icon-bot" />,
    Bug: () => <div data-testid="icon-bug" />,
    Sparkles: () => <div data-testid="icon-sparkles" />,
    Search: () => <div data-testid="icon-search" />,
    Plus: () => <div data-testid="icon-plus" />,
    BarChart3: () => <div data-testid="icon-barchart" />,
    Settings: () => <div data-testid="icon-settings" />,
    AlertCircle: () => <div data-testid="icon-alert" />,
    TrendingUp: () => <div data-testid="icon-trending" />,
    Play: () => <div data-testid="icon-play" />,
    Pause: () => <div data-testid="icon-pause" />,
    Users: () => <div data-testid="icon-users" />
}));

describe('SuperAdminPlaybooksTab', () => {
    beforeEach(() => {
        (useAgentChatStore as unknown as jest.Mock).mockReturnValue({
            activeSessionId: null,
            createSession: jest.fn()
        });
    });

    it('renders the dashboard statistics and chat', () => {
        render(<SuperAdminPlaybooksTab />);

        expect(screen.getByText('Active Playbooks')).toBeInTheDocument();
        expect(screen.getByText('Ask Baked HQ')).toBeInTheDocument();
        expect(screen.getByTestId('puff-chat')).toBeInTheDocument();
    });
});
