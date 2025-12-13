import React from 'react';
import { render, screen } from '@testing-library/react';
import DispensaryDashboardClient from '@/app/dashboard/dispensary/dashboard-client';
import { useAgentChatStore } from '@/lib/store/agent-chat-store';

// Mock dependencies
jest.mock('@/lib/store/agent-chat-store', () => ({
    useAgentChatStore: jest.fn(),
}));

jest.mock('@/hooks/use-toast', () => ({
    useToast: () => ({ toast: jest.fn() })
}));

// Mock Lucide Icons (critical for Jest)
jest.mock('lucide-react', () => ({
    ShoppingBag: () => <div data-testid="icon-shopping-bag" />,
    DollarSign: () => <div data-testid="icon-dollar-sign" />,
    TrendingUp: () => <div data-testid="icon-trending-up" />,
    AlertTriangle: () => <div data-testid="icon-alert-triangle" />,
    CheckCircle: () => <div data-testid="icon-check-circle" />,
    Clock: () => <div data-testid="icon-clock" />,
    AlertCircle: () => <div data-testid="icon-alert-circle" />,
    CheckCircle2: () => <div data-testid="icon-check-circle-2" />,
    FileText: () => <div data-testid="icon-file-text" />,
    Zap: () => <div data-testid="icon-zap" />,
    Users: () => <div data-testid="icon-users" />,
    ShieldAlert: () => <div data-testid="icon-shield-alert" />,
    Plus: () => <div data-testid="icon-plus" />,
    Search: () => <div data-testid="icon-search" />,
    BarChart3: () => <div data-testid="icon-bar-chart-3" />,
    MapPin: () => <div data-testid="icon-map-pin" />,
    Power: () => <div data-testid="icon-power" />,
    User: () => <div data-testid="icon-user" />,
    Sparkles: () => <div data-testid="icon-sparkles" />,
    Play: () => <div data-testid="icon-play" />,
    Info: () => <div data-testid="icon-info" />,
    Loader2: () => <div data-testid="icon-loader" />,
    ArrowLeft: () => <div data-testid="icon-arrow-left" />,
    ChevronDown: () => <div data-testid="icon-chevron-down" />,
    ChevronUp: () => <div data-testid="icon-chevron-up" />,
    Mail: () => <div data-testid="icon-mail" />,
    FolderOpen: () => <div data-testid="icon-folder-open" />,
    Calendar: () => <div data-testid="icon-calendar" />,
    Globe: () => <div data-testid="icon-globe" />,
    Brain: () => <div data-testid="icon-brain" />,
    Rocket: () => <div data-testid="icon-rocket" />,
    Briefcase: () => <div data-testid="icon-briefcase" />,
    ShoppingCart: () => <div data-testid="icon-shopping-cart" />,
    Upload: () => <div data-testid="icon-upload" />,
    Settings: () => <div data-testid="icon-settings" />,
    Bot: () => <div data-testid="icon-bot" />,
}));

// Mock TaskletChat because it's complex and we're testing the wrapper
jest.mock('@/app/dashboard/ceo/components/tasklet-chat', () => ({
    TaskletChat: ({ promptSuggestions }: { promptSuggestions: string[] }) => (
        <div data-testid="tasklet-chat-mock">
            Mock Tasklet Chat
            {promptSuggestions.map(s => <div key={s} data-testid="prompt-chip">{s}</div>)}
        </div>
    )
}));

describe('DispensaryDashboardClient', () => {
    beforeEach(() => {
        (useAgentChatStore as unknown as jest.Mock).mockReturnValue({
            currentMessages: [],
            addMessage: jest.fn(),
            updateMessage: jest.fn(),
            createSession: jest.fn()
        });
    });

    it('renders the main dashboard structure', () => {
        render(<DispensaryDashboardClient brandId="test-brand-123" />);

        // Header
        expect(screen.getByText('Dispensary Console')).toBeInTheDocument();
        expect(screen.getByText(/Dispensary Mode/)).toBeInTheDocument();

        // KPIs
        expect(screen.getByText('Orders Today')).toBeInTheDocument();
        expect(screen.getByText('Revenue Today')).toBeInTheDocument();

        // Chat Widget
        expect(screen.getByText('Ask Smokey (Dispensary)')).toBeInTheDocument();
        expect(screen.getByTestId('tasklet-chat-mock')).toBeInTheDocument();

        // Check for prompt chips passed to TaskletChat
        expect(screen.getByText('What’s hurting conversion today?')).toBeInTheDocument();

        // Right Sidebar
        expect(screen.getByText('Active Alerts')).toBeInTheDocument();
        expect(screen.getByText('Quick Actions')).toBeInTheDocument(); // Might match multiple?

        // Playbooks
        expect(screen.getByText('Menu Health Monitor')).toBeInTheDocument();

        // Sticky Footer
        expect(screen.getByText(/critical alerts/)).toBeInTheDocument();
    });
});
