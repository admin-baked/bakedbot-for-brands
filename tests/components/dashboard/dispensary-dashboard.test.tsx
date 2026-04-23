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
jest.mock('lucide-react', () => new Proxy({}, {
    get: (_target, prop) => {
        const Icon = () => <div data-testid={`icon-${String(prop).replace(/[A-Z]/g, (m, i) => `${i ? '-' : ''}${m.toLowerCase()}`)}`} />;
        return Icon;
    },
}));

// Mock PuffChat because it's complex and we're testing the wrapper
jest.mock('@/app/dashboard/ceo/components/puff-chat', () => ({
    PuffChat: ({ promptSuggestions }: { promptSuggestions: string[] }) => (
        <div data-testid="puff-chat-mock">
            Mock Puff Chat
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
        expect(screen.getByText('Money Mike')).toBeInTheDocument();
        expect(screen.getByTestId('puff-chat-mock')).toBeInTheDocument();

        // Right Sidebar
        expect(screen.getByText('Active Alerts')).toBeInTheDocument();
        expect(screen.getByText('Quick Actions')).toBeInTheDocument(); // Might match multiple?

        // Playbooks
        expect(screen.getByText('Playbooks')).toBeInTheDocument();

        // Sticky Footer
        expect(screen.getByText(/critical alerts/)).toBeInTheDocument();
    });
});
