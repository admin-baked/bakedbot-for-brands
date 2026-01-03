
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThinkingWindow } from '@/components/chat/thinking-window';
import { ToolCallStep } from '@/app/dashboard/ceo/components/puff-chat';

// Mock framer-motion to avoid issues with animations in Jest
jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
        span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock scrollIntoView for JSDOM
// @ts-ignore
window.HTMLElement.prototype.scrollIntoView = jest.fn();

// Mock Lucide icons
jest.mock('lucide-react', () => ({
    Terminal: () => <div data-testid="icon-terminal" />,
    Search: () => <div data-testid="icon-search" />,
    Leaf: () => <div data-testid="icon-leaf" />,
    Zap: () => <div data-testid="icon-zap" />,
    Globe: () => <div data-testid="icon-globe" />,
    CheckCircle2: () => <div data-testid="icon-check" />,
    Loader2: () => <div data-testid="icon-loader" />,
    Server: () => <div data-testid="icon-server" />,
    Cpu: () => <div data-testid="icon-cpu" />,
    MousePointer2: () => <div data-testid="icon-mouse" />,
    BarChart3: () => <div data-testid="icon-barchart" />,
    Megaphone: () => <div data-testid="icon-megaphone" />,
    ShieldAlert: () => <div data-testid="icon-shield" />,
    RefreshCw: () => <div data-testid="icon-refresh" />,
}));

const mockSteps: ToolCallStep[] = [
    { id: '1', toolName: 'Scraper', description: 'Connecting to source...', status: 'completed' },
    { id: '2', toolName: 'Google Search', description: 'Searching for pricing...', status: 'in-progress' }
];

describe('ThinkingWindow', () => {
    it('renders agent-specific headers and icons', () => {
        const { rerender } = render(<ThinkingWindow steps={[]} isThinking={true} agentName="ezal" />);
        // EZAL custom visual
        expect(screen.getByText(/BakedBot Discovery Active/i)).toBeInTheDocument();
        expect(screen.getAllByTestId('icon-zap').length).toBeGreaterThan(0);

        rerender(<ThinkingWindow steps={[]} isThinking={true} agentName="smokey" />);
        // SMOKEY custom visual
        expect(screen.getByText(/Catalog Sync/i)).toBeInTheDocument();
        expect(screen.getAllByTestId('icon-leaf').length).toBeGreaterThan(0);
        
        rerender(<ThinkingWindow steps={[]} isThinking={true} agentName="puff" />);
        // Generic agent visual uses config.label
        expect(screen.getByText(/System Core/i)).toBeInTheDocument();
        expect(screen.getByText(/Processing request.../i)).toBeInTheDocument();
    });

    it('renders execution logs from steps', () => {
        render(<ThinkingWindow steps={mockSteps} isThinking={true} />);
        
        expect(screen.getByText(/Connecting to source.../i)).toBeInTheDocument();
        expect(screen.getByText(/Searching for pricing.../i)).toBeInTheDocument();
        // Completed step should have checkmark or specific class
        expect(screen.getByText('✓')).toBeInTheDocument();
    });

    it('shows thinking state when active', () => {
        render(<ThinkingWindow steps={[]} isThinking={true} />);
        expect(screen.getByText(/Processing request.../i)).toBeInTheDocument();
    });

    it('returns null if not thinking and no steps', () => {
        const { container } = render(<ThinkingWindow steps={[]} isThinking={false} />);
        expect(container.firstChild).toBeNull();
    });
});
