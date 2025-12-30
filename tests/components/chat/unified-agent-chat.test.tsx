import React from 'react';
import { render, screen } from '@testing-library/react';
import { UnifiedAgentChat } from '@/components/chat/unified-agent-chat';
import '@testing-library/jest-dom';

// Mock PuffChat since it's a complex connected component
jest.mock('@/app/dashboard/ceo/components/puff-chat', () => ({
    PuffChat: ({ initialTitle }: { initialTitle: string }) => (
        <div data-testid="mock-puff-chat">
            Mocked PuffChat: {initialTitle}
        </div>
    )
}));

describe('UnifiedAgentChat', () => {
    it('renders with public demo config by default', () => {
        render(<UnifiedAgentChat />);
        
        expect(screen.getByText('Smokey Chat')).toBeInTheDocument();
        expect(screen.getByText('Demo')).toBeInTheDocument();
        expect(screen.getByTestId('mock-puff-chat')).toBeInTheDocument();
    });

    it('renders with super_admin role', () => {
        render(<UnifiedAgentChat role="super_admin" isSuperUser={true} />);
        
        expect(screen.getByText('Super Admin HQ')).toBeInTheDocument();
        expect(screen.getByText('Super Admin Mode')).toBeInTheDocument();
    });

    it('displays location info when provided', () => {
        const locationInfo = {
            dispensaryCount: 5,
            brandCount: 3,
            city: 'Denver'
        };

        render(<UnifiedAgentChat locationInfo={locationInfo} />);

        expect(screen.getByText(/Found 5 dispensaries & 3 brands near Denver/i)).toBeInTheDocument();
        // Should NOT show the default badge when location is present
        expect(screen.queryByText('Demo')).not.toBeInTheDocument();
    });

    it('renders in compact mode', () => {
        render(<UnifiedAgentChat compact={true} />);
        // In compact mode, subtitle is hidden, but title is shown
        expect(screen.getByText('Smokey Chat')).toBeInTheDocument();
        expect(screen.queryByText('Ask me anything about cannabis, products, or our platform')).not.toBeInTheDocument();
    });
});
