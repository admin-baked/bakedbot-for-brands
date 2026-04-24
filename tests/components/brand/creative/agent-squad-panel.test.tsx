import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AgentSquadPanel } from '@/components/brand/creative/agent-squad-panel';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
    MoreHorizontal: () => <div data-testid="icon-more" />,
    Sparkles: () => <div data-testid="icon-sparkles" />,
    ShieldAlert: () => <div data-testid="icon-shield" />,
    Palette: () => <div data-testid="icon-palette" />,
    MessageSquare: () => <div data-testid="icon-message" />,
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
}));

// Mock agent registry
jest.mock('@/lib/agents/registry', () => ({
    AGENT_REGISTRY: {
        craig: { name: 'Craig', title: 'Marketer', visual: { color: 'blue', emoji: '' }, image: null },
        mrs_parker: { name: 'Mrs. Parker', title: 'Community Manager', visual: { color: 'pink', emoji: '' }, image: null },
        deebo: { name: 'Deebo', title: 'Enforcer', visual: { color: 'red', emoji: '' }, image: null },
    },
}));

// Mock AgentStatusIndicator
jest.mock('@/components/ui/agent-status-indicator', () => ({
    AgentStatusIndicator: () => <div data-testid="agent-status" />,
    agentText: () => '',
}));

// Mock cn utility
jest.mock('@/lib/utils', () => ({
    cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

describe('AgentSquadPanel', () => {
    describe('Rendering', () => {
        it('renders panel title', () => {
            render(<AgentSquadPanel />);
            expect(screen.getByText('Creative Squad')).toBeInTheDocument();
        });

        it('renders all creative agents', () => {
            render(<AgentSquadPanel />);
            expect(screen.getByText('Craig')).toBeInTheDocument();
            expect(screen.getByText('Mrs. Parker')).toBeInTheDocument();
            expect(screen.getByText('Deebo')).toBeInTheDocument();
        });

        it('renders agent roles', () => {
            render(<AgentSquadPanel />);
            expect(screen.getByText('Marketer')).toBeInTheDocument();
            expect(screen.getByText('Community Manager')).toBeInTheDocument();
            expect(screen.getByText('Enforcer')).toBeInTheDocument();
        });
    });

    describe('Agent Status', () => {
        it('shows Ready status for active agents', () => {
            render(<AgentSquadPanel />);
            expect(screen.getByText('Ready')).toBeInTheDocument();
        });

        it('shows Offline status for offline agents', () => {
            render(<AgentSquadPanel />);
            expect(screen.getByText('Offline')).toBeInTheDocument();
        });

        it('shows Working status for working agents', () => {
            render(<AgentSquadPanel />);
            expect(screen.getByText('Working')).toBeInTheDocument();
        });
    });

    describe('Capabilities', () => {
        it('renders capabilities section', () => {
            render(<AgentSquadPanel />);
            expect(screen.getByText('Active Capabilities')).toBeInTheDocument();
        });

        it('shows agent capabilities', () => {
            render(<AgentSquadPanel />);
            expect(screen.getByText('Caption Generation')).toBeInTheDocument();
        });
    });

    describe('Interactions', () => {
        it('calls onAgentSelect when agent is clicked', () => {
            const onAgentSelect = jest.fn();
            render(<AgentSquadPanel onAgentSelect={onAgentSelect} />);

            const craigCard = screen.getByText('Craig').closest('[class*="cursor-pointer"]');
            if (craigCard) {
                fireEvent.click(craigCard);
            }
            expect(onAgentSelect).toHaveBeenCalledWith('craig');
        });
    });
});
