/**
 * Unit Tests: Chat Components
 * 
 * Tests for role-based chat widgets and components.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock the PuffChat component since it has complex dependencies
jest.mock('@/app/dashboard/ceo/components/puff-chat', () => ({
    PuffChat: ({ initialTitle, promptSuggestions }: { initialTitle: string; promptSuggestions: string[] }) => (
        <div data-testid="mock-puff-chat">
            <div data-testid="chat-title">{initialTitle}</div>
            <div data-testid="suggestions-count">{promptSuggestions?.length || 0}</div>
        </div>
    )
}));

// Mock the chat config
jest.mock('@/lib/chat/role-chat-config', () => ({
    EDITOR_CHAT_CONFIG: {
        role: 'editor',
        title: 'Content Assistant',
        subtitle: 'AI-powered content editing',
        promptSuggestions: ['Review SEO', 'Check compliance', 'Optimize content'],
        themeColor: 'purple',
        iconName: 'edit'
    },
    CUSTOMER_CHAT_CONFIG: {
        role: 'customer',
        title: 'Cannabis Concierge',
        subtitle: 'Your personal budtender',
        promptSuggestions: ['Sleep products', 'Best deals', 'Build cart'],
        themeColor: 'emerald',
        iconName: 'shopping-cart'
    },
    getChatConfigForRole: (role: string) => {
        if (role === 'editor') {
            return {
                role: 'editor',
                title: 'Content Assistant',
                subtitle: 'AI-powered content editing',
                promptSuggestions: ['Review SEO'],
                themeColor: 'purple',
                iconName: 'edit'
            };
        }
        if (role === 'customer') {
            return {
                role: 'customer',
                title: 'Cannabis Concierge',
                subtitle: 'Your personal budtender',
                promptSuggestions: ['Sleep products'],
                themeColor: 'emerald',
                iconName: 'shopping-cart'
            };
        }
        return {
            role: 'owner',
            title: 'Command Center',
            subtitle: 'Full platform control',
            promptSuggestions: ['Platform health'],
            themeColor: 'primary',
            iconName: 'shield'
        };
    }
}));

// Mock utils
jest.mock('@/lib/utils', () => ({
    cn: (...args: any[]) => args.filter(Boolean).join(' ')
}));

describe('EditorChatWidget', () => {
    let EditorChatWidget: any;

    beforeAll(async () => {
        const module = await import('@/components/chat/editor-chat-widget');
        EditorChatWidget = module.EditorChatWidget;
    });

    it('should render the chat widget', () => {
        render(<EditorChatWidget />);

        // Title appears in both header and PuffChat, so use getAllByText
        const titles = screen.getAllByText('Content Assistant');
        expect(titles.length).toBeGreaterThan(0);
    });

    it('should display subtitle', () => {
        render(<EditorChatWidget />);

        expect(screen.getByText('AI-powered content editing')).toBeInTheDocument();
    });

    it('should show quick tool buttons', () => {
        render(<EditorChatWidget />);

        expect(screen.getByText('SEO Check')).toBeInTheDocument();
        expect(screen.getByText('Compliance')).toBeInTheDocument();
        expect(screen.getByText('Optimize')).toBeInTheDocument();
        expect(screen.getByText('Grammar')).toBeInTheDocument();
    });

    it('should include Content Tools badge', () => {
        render(<EditorChatWidget />);

        expect(screen.getByText('Content Tools')).toBeInTheDocument();
    });

    it('should render PuffChat component', () => {
        render(<EditorChatWidget />);

        expect(screen.getByTestId('mock-puff-chat')).toBeInTheDocument();
    });
});

describe('CustomerChatWidget', () => {
    let CustomerChatWidget: any;

    beforeAll(async () => {
        const module = await import('@/app/dashboard/customer/components/customer-chat-widget');
        CustomerChatWidget = module.CustomerChatWidget;
    });

    it('should render the chat widget', () => {
        render(<CustomerChatWidget />);

        // Title appears in both header and PuffChat, so use getAllByText
        const titles = screen.getAllByText('Cannabis Concierge');
        expect(titles.length).toBeGreaterThan(0);
    });

    it('should display subtitle', () => {
        render(<CustomerChatWidget />);

        expect(screen.getByText('Your personal budtender')).toBeInTheDocument();
    });

    it('should show quick intent buttons', () => {
        render(<CustomerChatWidget />);

        expect(screen.getByText('Sleep')).toBeInTheDocument();
        expect(screen.getByText('Energy')).toBeInTheDocument();
        expect(screen.getByText('Relax')).toBeInTheDocument();
        expect(screen.getByText('Pain')).toBeInTheDocument();
    });

    it('should include Personal Budtender badge', () => {
        render(<CustomerChatWidget />);

        expect(screen.getByText('Personal Budtender')).toBeInTheDocument();
    });

    it('should render PuffChat component', () => {
        render(<CustomerChatWidget />);

        expect(screen.getByTestId('mock-puff-chat')).toBeInTheDocument();
    });

    it('should show "I want:" label', () => {
        render(<CustomerChatWidget />);

        expect(screen.getByText('I want:')).toBeInTheDocument();
    });
});

describe('RoleBasedAgentChat', () => {
    let RoleBasedAgentChat: any;

    beforeAll(async () => {
        const module = await import('@/components/chat/role-based-agent-chat');
        RoleBasedAgentChat = module.RoleBasedAgentChat;
    });

    it('should render for editor role', () => {
        render(<RoleBasedAgentChat role="editor" />);

        const titles = screen.getAllByText('Content Assistant');
        expect(titles.length).toBeGreaterThan(0);
    });

    it('should render for customer role', () => {
        render(<RoleBasedAgentChat role="customer" />);

        const titles = screen.getAllByText('Cannabis Concierge');
        expect(titles.length).toBeGreaterThan(0);
    });

    it('should render for owner role', () => {
        render(<RoleBasedAgentChat role="owner" />);

        const titles = screen.getAllByText('Command Center');
        expect(titles.length).toBeGreaterThan(0);
    });

    it('should show role badge', () => {
        render(<RoleBasedAgentChat role="editor" />);

        expect(screen.getByText('Editor Mode')).toBeInTheDocument();
    });

    it('should render PuffChat', () => {
        render(<RoleBasedAgentChat role="editor" />);

        expect(screen.getByTestId('mock-puff-chat')).toBeInTheDocument();
    });

    it('should render compact mode without full header', () => {
        const { container } = render(<RoleBasedAgentChat role="editor" compact />);

        // In compact mode, subtitle should not be visible
        expect(screen.queryByText('AI-powered content editing')).not.toBeInTheDocument();
    });

    it('should apply custom className', () => {
        const { container } = render(
            <RoleBasedAgentChat role="editor" className="custom-class" />
        );

        expect(container.firstChild).toHaveClass('custom-class');
    });

    it('should apply custom height', () => {
        const { container } = render(
            <RoleBasedAgentChat role="editor" height="h-[600px]" />
        );

        expect(container.firstChild).toHaveClass('h-[600px]');
    });
});
