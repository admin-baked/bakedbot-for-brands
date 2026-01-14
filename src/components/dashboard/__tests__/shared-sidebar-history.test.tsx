import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SharedSidebarHistory } from '../shared-sidebar-history';
import { useAgentChatStore } from '@/lib/store/agent-chat-store';
import { useRouter, usePathname } from 'next/navigation';
import { useUserRole } from '@/hooks/use-user-role';

// Mocks
jest.mock('@/lib/store/agent-chat-store');
jest.mock('next/navigation', () => ({
    useRouter: jest.fn(),
    usePathname: jest.fn()
}));
jest.mock('@/hooks/use-user-role', () => ({
    useUserRole: jest.fn()
}));

describe('SharedSidebarHistory', () => {
    const mockRouterPush = jest.fn();
    const mockClearCurrentSession = jest.fn();
    const mockSetActiveSession = jest.fn();
    const mockSetCurrentRole = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        (useRouter as jest.Mock).mockReturnValue({ push: mockRouterPush });
        (useAgentChatStore as unknown as jest.Mock).mockReturnValue({
            setCurrentRole: mockSetCurrentRole,
            // Mock missing properties to satisfy interface
            sessions: [],
            currentMessages: [],
            currentRole: 'super-admin',
            currentProjectId: null,
            currentArtifacts: [],
            activeArtifactId: null,
            isArtifactPanelOpen: false,
            setCurrentProject: jest.fn(),
            createSession: jest.fn(),
            addMessage: jest.fn(),
            updateMessage: jest.fn(),
            hydrateSessions: jest.fn(),
            addArtifact: jest.fn(),
            updateArtifact: jest.fn(),
            removeArtifact: jest.fn(),
            setActiveArtifact: jest.fn(),
            setArtifactPanelOpen: jest.fn()
        });
    });

    it('navigates to /dashboard/playbooks for default role on New Chat', () => {
        (useUserRole as jest.Mock).mockReturnValue({ role: 'super-admin' });
        (usePathname as jest.Mock).mockReturnValue('/some-other-page');

        render(<SharedSidebarHistory />);

        fireEvent.click(screen.getByText('New Chat'));

        expect(mockClearCurrentSession).toHaveBeenCalled();
        expect(mockRouterPush).toHaveBeenCalledWith('/dashboard/playbooks');
    });

    it('navigates to /dashboard for BRAND role on New Chat', () => {
        (useUserRole as jest.Mock).mockReturnValue({ role: 'brand' });
        (usePathname as jest.Mock).mockReturnValue('/dashboard/products'); // Not main dashboard

        render(<SharedSidebarHistory />);

        fireEvent.click(screen.getByText('New Chat'));

        expect(mockClearCurrentSession).toHaveBeenCalled();
        expect(mockRouterPush).toHaveBeenCalledWith('/dashboard');
    });

    it('does not navigate if already on target page (Brand)', () => {
        (useUserRole as jest.Mock).mockReturnValue({ role: 'brand' });
        (usePathname as jest.Mock).mockReturnValue('/dashboard');

        render(<SharedSidebarHistory />);

        fireEvent.click(screen.getByText('New Chat'));

        expect(mockClearCurrentSession).toHaveBeenCalled();
        expect(mockRouterPush).not.toHaveBeenCalled();
    });
});
