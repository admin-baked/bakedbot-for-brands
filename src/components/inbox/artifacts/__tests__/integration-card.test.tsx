/**
 * Integration Card Tests
 *
 * Unit tests for inline integration connection cards.
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import { InboxIntegrationCard } from '../integration-card';
import type { InboxArtifact } from '@/types/inbox';
import type { IntegrationRequest } from '@/types/service-integrations';

describe('InboxIntegrationCard', () => {
    const mockNavigate = jest.fn();

    const mockGmailArtifact: InboxArtifact = {
        id: 'artifact-1',
        threadId: 'thread-1',
        orgId: 'org-1',
        type: 'integration_request',
        status: 'draft',
        data: {
            provider: 'gmail',
            reason: 'To send emails as you',
            authMethod: 'oauth',
            category: 'workspace',
            setupTime: '1 minute',
            threadId: 'thread-1',
            enablesAction: 'send_gmail',
        } as IntegrationRequest,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-1',
    };

    const mockDutchieArtifact: InboxArtifact = {
        ...mockGmailArtifact,
        id: 'artifact-2',
        data: {
            provider: 'dutchie',
            reason: 'To sync your inventory',
            authMethod: 'api_key',
            category: 'pos',
            setupTime: '3 minutes',
        } as IntegrationRequest,
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders the Gmail card using current metadata and reason text', () => {
        render(<InboxIntegrationCard artifact={mockGmailArtifact} />);

        expect(screen.getByText('Gmail')).toBeInTheDocument();
        expect(screen.getByText('To send emails as you')).toBeInTheDocument();
        expect(screen.getByText('email')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /connect gmail/i })).toBeInTheDocument();
    });

    it('redirects OAuth integrations to the Google auth flow', () => {
        render(<InboxIntegrationCard artifact={mockGmailArtifact} onNavigate={mockNavigate} />);

        fireEvent.click(screen.getByRole('button', { name: /connect gmail/i }));

        expect(mockNavigate).toHaveBeenCalledWith(
            expect.stringContaining('/api/auth/google?service=gmail')
        );
        expect(mockNavigate).toHaveBeenCalledWith(
            expect.stringContaining(encodeURIComponent('/dashboard/inbox?thread=thread-1'))
        );
    });

    it('uses the inbox page as the fallback redirect when no threadId is present', () => {
        const artifactWithoutThread: InboxArtifact = {
            ...mockGmailArtifact,
            threadId: undefined,
            data: {
                ...mockGmailArtifact.data,
                threadId: undefined,
            } as IntegrationRequest,
        };

        render(<InboxIntegrationCard artifact={artifactWithoutThread} onNavigate={mockNavigate} />);

        fireEvent.click(screen.getByRole('button', { name: /connect gmail/i }));

        expect(mockNavigate).toHaveBeenCalledWith(
            expect.stringContaining(encodeURIComponent('/dashboard/inbox'))
        );
    });

    it('renders non-oauth integrations without redirect side effects', () => {
        render(<InboxIntegrationCard artifact={mockDutchieArtifact} onNavigate={mockNavigate} />);

        expect(screen.getByText('Dutchie')).toBeInTheDocument();
        expect(screen.getByText('To sync your inventory')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /connect dutchie/i })).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /connect dutchie/i }));

        expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('passes through the optional className to the card root', () => {
        const { container } = render(
            <InboxIntegrationCard artifact={mockGmailArtifact} className="test-card" />
        );

        expect(container.firstChild).toHaveClass('test-card');
    });
});
