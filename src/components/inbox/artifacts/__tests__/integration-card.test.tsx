/**
 * Integration Card Tests
 *
 * Unit tests for inline integration connection cards
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { InboxIntegrationCard } from '../integration-card';
import type { InboxArtifact } from '@/types/inbox';
import type { IntegrationRequest } from '@/types/service-integrations';

// Mock dependencies
jest.mock('@/lib/store/inbox-store', () => ({
    useInboxStore: () => ({
        updateArtifact: jest.fn(),
    }),
}));

jest.mock('@/hooks/use-toast', () => ({
    useToast: () => ({
        toast: jest.fn(),
    }),
}));

// Mock window.location
delete (window as any).location;
(window as any).location = { href: '' };

describe('InboxIntegrationCard', () => {
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
            threadId: 'thread-1',
        } as IntegrationRequest,
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (window as any).location.href = '';
    });

    describe('OAuth Integration (Gmail)', () => {
        it('should render Gmail integration card', () => {
            render(<InboxIntegrationCard artifact={mockGmailArtifact} />);

            expect(screen.getByText('Gmail')).toBeInTheDocument();
            expect(screen.getByText('Send and read emails from your personal Gmail account')).toBeInTheDocument();
            expect(screen.getByText('To send emails as you')).toBeInTheDocument();
        });

        it('should display OAuth auth method icon', () => {
            const { container } = render(<InboxIntegrationCard artifact={mockGmailArtifact} />);

            // Lock icon for OAuth
            const icons = container.querySelectorAll('svg');
            expect(icons.length).toBeGreaterThan(0);
        });

        it('should show workspace category badge', () => {
            render(<InboxIntegrationCard artifact={mockGmailArtifact} />);

            expect(screen.getByText('workspace')).toBeInTheDocument();
        });

        it('should display setup time', () => {
            render(<InboxIntegrationCard artifact={mockGmailArtifact} />);

            expect(screen.getByText('1 minute')).toBeInTheDocument();
        });

        it('should show enabled action if provided', () => {
            render(<InboxIntegrationCard artifact={mockGmailArtifact} />);

            expect(screen.getByText('send_gmail')).toBeInTheDocument();
        });

        it('should redirect to OAuth flow when connect button clicked', () => {
            render(<InboxIntegrationCard artifact={mockGmailArtifact} />);

            const connectButton = screen.getByRole('button', { name: /Connect with Gmail/i });
            fireEvent.click(connectButton);

            expect((window as any).location.href).toContain('/api/auth/google');
            expect((window as any).location.href).toContain('service=gmail');
            expect((window as any).location.href).toContain('thread-1');
        });

        it('should include returnTo parameter in OAuth URL', () => {
            render(<InboxIntegrationCard artifact={mockGmailArtifact} />);

            const connectButton = screen.getByRole('button', { name: /Connect with Gmail/i });
            fireEvent.click(connectButton);

            const url = (window as any).location.href;
            expect(url).toContain('redirect=');
            expect(url).toContain('inbox');
        });
    });

    describe('API Key Integration (Dutchie)', () => {
        it('should render Dutchie integration card', () => {
            render(<InboxIntegrationCard artifact={mockDutchieArtifact} />);

            expect(screen.getByText('Dutchie')).toBeInTheDocument();
            expect(screen.getByText('Connect your Dutchie menu for product sync')).toBeInTheDocument();
        });

        it('should show API key auth method', () => {
            render(<InboxIntegrationCard artifact={mockDutchieArtifact} />);

            expect(screen.getByText('api key')).toBeInTheDocument();
        });

        it('should show connect button initially (not form)', () => {
            render(<InboxIntegrationCard artifact={mockDutchieArtifact} />);

            expect(screen.getByRole('button', { name: /Connect Dutchie/i })).toBeInTheDocument();
            expect(screen.queryByLabelText(/API Key/i)).not.toBeInTheDocument();
        });

        it('should show API key form when connect button clicked', () => {
            render(<InboxIntegrationCard artifact={mockDutchieArtifact} />);

            const connectButton = screen.getByRole('button', { name: /Connect Dutchie/i });
            fireEvent.click(connectButton);

            expect(screen.getByLabelText(/API Key/i)).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /Connect/i })).toBeInTheDocument();
        });

        it('should show API secret field for api_key auth method', () => {
            render(<InboxIntegrationCard artifact={mockDutchieArtifact} />);

            const connectButton = screen.getByRole('button', { name: /Connect Dutchie/i });
            fireEvent.click(connectButton);

            expect(screen.getByLabelText(/API Secret/i)).toBeInTheDocument();
        });

        it('should disable submit button when API key is empty', () => {
            render(<InboxIntegrationCard artifact={mockDutchieArtifact} />);

            const connectButton = screen.getByRole('button', { name: /Connect Dutchie/i });
            fireEvent.click(connectButton);

            const submitButton = screen.getByRole('button', { name: /Connect/i });
            expect(submitButton).toBeDisabled();
        });

        it('should enable submit button when API key is entered', () => {
            render(<InboxIntegrationCard artifact={mockDutchieArtifact} />);

            const connectButton = screen.getByRole('button', { name: /Connect Dutchie/i });
            fireEvent.click(connectButton);

            const apiKeyInput = screen.getByLabelText(/API Key/i);
            fireEvent.change(apiKeyInput, { target: { value: 'test-api-key' } });

            const submitButton = screen.getByRole('button', { name: /Connect/i });
            expect(submitButton).not.toBeDisabled();
        });

        it('should hide form when cancel button clicked', () => {
            render(<InboxIntegrationCard artifact={mockDutchieArtifact} />);

            // Show form
            const connectButton = screen.getByRole('button', { name: /Connect Dutchie/i });
            fireEvent.click(connectButton);

            // Cancel
            const cancelButton = screen.getByRole('button', { name: /Cancel/i });
            fireEvent.click(cancelButton);

            expect(screen.queryByLabelText(/API Key/i)).not.toBeInTheDocument();
        });
    });

    describe('Credentials Integration', () => {
        const credentialsArtifact: InboxArtifact = {
            ...mockGmailArtifact,
            data: {
                provider: 'alleaves',
                reason: 'To sync inventory',
                authMethod: 'credentials',
                category: 'pos',
                setupTime: '5 minutes',
            } as IntegrationRequest,
        };

        it('should show username and password fields for credentials auth', () => {
            render(<InboxIntegrationCard artifact={credentialsArtifact} />);

            const connectButton = screen.getByRole('button', { name: /Connect/i });
            fireEvent.click(connectButton);

            expect(screen.getByLabelText(/Username/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
        });
    });

    describe('Settings Link', () => {
        it('should show "Or connect in Settings" link', () => {
            render(<InboxIntegrationCard artifact={mockGmailArtifact} />);

            expect(screen.getByText(/Or connect in Settings/i)).toBeInTheDocument();
        });

        it('should open settings in new tab when clicked', () => {
            const mockOpen = jest.fn();
            window.open = mockOpen;

            render(<InboxIntegrationCard artifact={mockGmailArtifact} />);

            const settingsButton = screen.getByRole('button', { name: /Or connect in Settings/i });
            fireEvent.click(settingsButton);

            expect(mockOpen).toHaveBeenCalledWith('/dashboard/integrations', '_blank');
        });
    });

    describe('Category Colors', () => {
        it('should apply correct color for workspace category', () => {
            const { container } = render(<InboxIntegrationCard artifact={mockGmailArtifact} />);

            const categoryBadge = screen.getByText('workspace');
            expect(categoryBadge).toHaveClass('bg-blue-100');
        });

        it('should apply correct color for pos category', () => {
            const { container } = render(<InboxIntegrationCard artifact={mockDutchieArtifact} />);

            const categoryBadge = screen.getByText('pos');
            expect(categoryBadge).toHaveClass('bg-green-100');
        });
    });

    describe('Documentation Link', () => {
        it('should show docs link when available in metadata', () => {
            render(<InboxIntegrationCard artifact={mockDutchieArtifact} />);

            // Show form to see docs link
            const connectButton = screen.getByRole('button', { name: /Connect Dutchie/i });
            fireEvent.click(connectButton);

            const docsLink = screen.getByText(/How to get your API key/i);
            expect(docsLink).toBeInTheDocument();
            expect(docsLink.closest('a')).toHaveAttribute('target', '_blank');
        });
    });

    describe('Accessibility', () => {
        it('should have proper ARIA labels on buttons', () => {
            render(<InboxIntegrationCard artifact={mockGmailArtifact} />);

            expect(screen.getByRole('button', { name: /Connect with Gmail/i })).toBeInTheDocument();
        });

        it('should have proper form labels', () => {
            render(<InboxIntegrationCard artifact={mockDutchieArtifact} />);

            const connectButton = screen.getByRole('button', { name: /Connect Dutchie/i });
            fireEvent.click(connectButton);

            expect(screen.getByLabelText(/API Key/i)).toBeInTheDocument();
        });
    });
});
