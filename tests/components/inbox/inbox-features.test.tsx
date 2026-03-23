import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UnifiedInbox } from '@/components/inbox/unified-inbox';
import { useInboxStore, useActiveThread, useActiveThreadArtifacts } from '@/lib/store/inbox-store';
import { useUserRole } from '@/hooks/use-user-role';
import { createInboxThread, getInboxThreads } from '@/server/actions/inbox';
import { useSearchParams } from 'next/navigation';

// Mock the dependencies
jest.mock('@/lib/store/inbox-store');
jest.mock('@/hooks/use-user-role');
jest.mock('@/server/actions/inbox');
jest.mock('next/navigation');
jest.mock('@/components/inbox/inbox-sidebar', () => ({
    InboxSidebar: ({ className }: { className?: string }) => <div data-testid="inbox-sidebar" className={className} />,
}));
jest.mock('@/components/inbox/inbox-conversation', () => ({
    InboxConversation: ({ thread }: { thread: { title: string } }) => <div>{thread.title}</div>,
}));
jest.mock('@/components/inbox/inbox-artifact-panel', () => ({
    InboxArtifactPanel: () => <div data-testid="artifact-panel" />,
}));
jest.mock('@/components/inbox/inbox-empty-state', () => ({
    InboxEmptyState: () => <div>Welcome to your Inbox</div>,
}));
jest.mock('@/components/inbox/crm/crm-context-panel', () => ({
    CrmContextPanel: () => <div data-testid="crm-context-panel" />,
}));
jest.mock('@/hooks/use-mobile', () => ({
    useIsMobile: jest.fn().mockReturnValue(false),
}));

// Partially mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
    ...jest.requireActual('framer-motion'),
    AnimatePresence: ({ children }: any) => <>{children}</>,
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
}));

describe('UnifiedInbox Component', () => {
    const mockHydrateThreads = jest.fn();
    const mockSetCurrentRole = jest.fn();
    const mockSetCurrentOrgId = jest.fn();
    const mockSetLoading = jest.fn();
    const mockSetThreadFilter = jest.fn();
    const mockCreateThread = jest.fn();
    const mockSetActiveThread = jest.fn();

    const mockThreads = [
        {
            id: 't1',
            title: 'Test Thread',
            type: 'general',
            status: 'active',
            lastActivityAt: new Date().toISOString(),
            artifactIds: [],
            messages: [],
        }
    ];

    beforeEach(() => {
        (useInboxStore as unknown as jest.Mock).mockReturnValue({
            activeThreadId: null,
            isArtifactPanelOpen: false,
            isSidebarCollapsed: false,
            isLoading: false,
            threadFilter: { type: 'all' },
            setCurrentRole: mockSetCurrentRole,
            setCurrentOrgId: mockSetCurrentOrgId,
            hydrateThreads: mockHydrateThreads,
            setThreadFilter: mockSetThreadFilter,
            setLoading: mockSetLoading,
            createThread: mockCreateThread,
            setActiveThread: mockSetActiveThread,
            getFilteredThreads: () => mockThreads,
            getQuickActions: () => [],
        });

        (useActiveThread as jest.Mock).mockReturnValue(null);
        (useActiveThreadArtifacts as jest.Mock).mockReturnValue([]);
        (useUserRole as jest.Mock).mockReturnValue({ role: 'admin', orgId: 'org1' });
        (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams());
        (getInboxThreads as jest.Mock).mockResolvedValue({ success: true, threads: mockThreads });
        (createInboxThread as jest.Mock).mockResolvedValue({ success: true });
        mockCreateThread.mockReturnValue({
            id: 'seed-thread',
            title: 'Seeded Thread',
            type: 'general',
            status: 'active',
            lastActivityAt: new Date().toISOString(),
            artifactIds: [],
            messages: [],
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should hydrate threads on mount if role is present', async () => {
        render(<UnifiedInbox />);

        await waitFor(() => {
            expect(getInboxThreads).toHaveBeenCalledWith({ orgId: 'org1' });
            expect(mockHydrateThreads).toHaveBeenCalledWith(mockThreads);
        });
    });

    it('should show empty state when no thread is active', () => {
        (useInboxStore as unknown as jest.Mock).mockReturnValue({
            activeThreadId: null,
            isArtifactPanelOpen: false,
            isSidebarCollapsed: false,
            isLoading: false,
            threadFilter: { type: 'all' },
            setCurrentRole: mockSetCurrentRole,
            setCurrentOrgId: mockSetCurrentOrgId,
            hydrateThreads: mockHydrateThreads,
            setThreadFilter: mockSetThreadFilter,
            setLoading: mockSetLoading,
            getFilteredThreads: () => [],
            getQuickActions: () => [],
        });

        render(<UnifiedInbox />);
        expect(screen.getByText(/Welcome to your Inbox/i)).toBeInTheDocument();
    });

    it('should display active thread when one is selected', () => {
        (useActiveThread as jest.Mock).mockReturnValue(mockThreads[0]);
        render(<UnifiedInbox />);
        expect(screen.getAllByText('Test Thread').length).toBeGreaterThan(0);
    });

    it('should respect sidebar collapse state', () => {
        (useInboxStore as unknown as jest.Mock).mockReturnValue({
            activeThreadId: null,
            isArtifactPanelOpen: false,
            isSidebarCollapsed: true,
            isLoading: false,
            threadFilter: { type: 'all' },
            setCurrentRole: mockSetCurrentRole,
            setCurrentOrgId: mockSetCurrentOrgId,
            hydrateThreads: mockHydrateThreads,
            setThreadFilter: mockSetThreadFilter,
            setLoading: mockSetLoading,
            createThread: mockCreateThread,
            setActiveThread: mockSetActiveThread,
            getFilteredThreads: () => mockThreads,
            getQuickActions: () => [],
        });

        const { container } = render(<UnifiedInbox />);
        expect(container.querySelector('.w-16')).toBeInTheDocument();
    });

    it('should seed a prompt-driven thread from URL params', async () => {
        mockCreateThread.mockReturnValueOnce({
            id: 'seeded-outreach-thread',
            title: 'Draft a win-back campaign',
            type: 'outreach',
            status: 'active',
            lastActivityAt: new Date().toISOString(),
            artifactIds: [],
            messages: [],
        });
        (useSearchParams as jest.Mock).mockReturnValue(
            new URLSearchParams('newThread=outreach&agent=mrs_parker&prompt=Draft%20a%20win-back%20campaign')
        );

        render(<UnifiedInbox />);

        await waitFor(() => {
            expect(mockCreateThread).toHaveBeenCalledWith(
                'outreach',
                expect.objectContaining({
                    primaryAgent: 'mrs_parker',
                    initialMessage: expect.objectContaining({
                        type: 'user',
                        content: 'Draft a win-back campaign',
                    }),
                })
            );
            expect(mockSetActiveThread).toHaveBeenCalledWith('seeded-outreach-thread');
            expect(createInboxThread).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: 'seeded-outreach-thread',
                    type: 'outreach',
                    primaryAgent: 'mrs_parker',
                    initialMessage: expect.objectContaining({
                        content: 'Draft a win-back campaign',
                    }),
                })
            );
        });
    });
});
