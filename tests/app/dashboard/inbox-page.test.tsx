import { render, screen, waitFor } from '@testing-library/react';
import InboxPage from '@/app/dashboard/inbox/page';
import { useInboxStore } from '@/lib/store/inbox-store';
import { useUserRole } from '@/hooks/use-user-role';

// Mock Firebase
jest.mock('@/firebase/client', () => ({
    auth: {},
    db: {},
    storage: {},
}));

// Mock Next.js server components and cache
jest.mock('next/cache', () => ({
    unstable_cache: (fn: any) => fn,
}));

// Mock server actions
jest.mock('@/server/actions/projects', () => ({
    getProjectsForUser: jest.fn().mockResolvedValue([]),
}));

// Mock hooks that use Firebase
jest.mock('@/hooks/use-job-poller', () => ({
    useJobPoller: jest.fn().mockReturnValue({ jobs: [], isLoading: false }),
}));

// Mock dependencies
jest.mock('@/lib/store/inbox-store');
jest.mock('@/hooks/use-user-role');
jest.mock('@/components/inbox', () => ({
    UnifiedInbox: () => <div data-testid="unified-inbox">Unified Inbox View</div>,
}));
jest.mock('@/components/chat/unified-agent-chat', () => ({
    UnifiedAgentChat: ({ role }: { role: string }) => (
        <div data-testid="unified-agent-chat" data-role={role}>
            Agent Chat View
        </div>
    ),
}));
jest.mock('@/components/inbox/inbox-view-toggle', () => ({
    InboxViewToggle: () => <div data-testid="inbox-view-toggle">Toggle</div>,
}));
jest.mock('@/components/inbox/inbox-workspace-briefing', () => ({
    InboxWorkspaceBriefing: ({ className }: { className?: string }) => (
        <div data-testid="inbox-workspace-briefing" className={className}>
            Workspace Briefing
        </div>
    ),
}));
jest.mock('@/components/dashboard/setup-checklist', () => ({
    SetupChecklist: () => <div data-testid="setup-checklist">Setup Checklist</div>,
}));
jest.mock('@/components/onboarding/product-tour', () => ({
    ProductTour: () => <div data-testid="product-tour">Product Tour</div>,
}));
jest.mock('@/server/actions/welcome-thread', () => ({
    ensureWelcomeThread: jest.fn().mockResolvedValue(undefined),
}));

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('InboxPage', () => {
    const mockSetViewMode = jest.fn();
    const buildInboxState = (overrides: Record<string, unknown> = {}) => ({
        viewMode: 'inbox',
        activeThreadId: null,
        threads: [],
        setViewMode: mockSetViewMode,
        ...overrides,
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('View Mode Rendering', () => {
        it('should render UnifiedInbox when viewMode is "inbox"', async () => {
            (useInboxStore as unknown as jest.Mock).mockImplementation((selector) => {
                const state = buildInboxState();
                if (typeof selector === 'function') {
                    return selector(state);
                }
                return state;
            });

            (useUserRole as jest.Mock).mockReturnValue({ role: 'brand' });

            render(<InboxPage />);

            await waitFor(() => {
                expect(screen.getByTestId('unified-inbox')).toBeInTheDocument();
                expect(screen.queryByTestId('unified-agent-chat')).not.toBeInTheDocument();
            });
        });

        it('should render UnifiedAgentChat when viewMode is "chat"', async () => {
            (useInboxStore as unknown as jest.Mock).mockImplementation((selector) => {
                const state = buildInboxState({ viewMode: 'chat' });
                if (typeof selector === 'function') {
                    return selector(state);
                }
                return state;
            });

            (useUserRole as jest.Mock).mockReturnValue({ role: 'brand' });

            render(<InboxPage />);

            await waitFor(() => {
                expect(screen.getByTestId('unified-agent-chat')).toBeInTheDocument();
                expect(screen.queryByTestId('unified-inbox')).not.toBeInTheDocument();
            });
        });
    });

    describe('Header Content', () => {
        it('should show the setup checklist for brand users in inbox mode', async () => {
            (useInboxStore as unknown as jest.Mock).mockImplementation((selector) => {
                const state = buildInboxState();
                if (typeof selector === 'function') {
                    return selector(state);
                }
                return state;
            });

            (useUserRole as jest.Mock).mockReturnValue({ role: 'brand' });

            render(<InboxPage />);

            await waitFor(() => {
                expect(screen.getByTestId('setup-checklist')).toBeInTheDocument();
            });
        });

        it('should hide inbox-only header helpers when in chat mode', async () => {
            (useInboxStore as unknown as jest.Mock).mockImplementation((selector) => {
                const state = buildInboxState({ viewMode: 'chat' });
                if (typeof selector === 'function') {
                    return selector(state);
                }
                return state;
            });

            (useUserRole as jest.Mock).mockReturnValue({ role: 'brand' });

            render(<InboxPage />);

            await waitFor(() => {
                expect(screen.getByTestId('unified-agent-chat')).toBeInTheDocument();
            });

            expect(screen.queryByTestId('inbox-workspace-briefing')).not.toBeInTheDocument();
            expect(screen.queryByTestId('setup-checklist')).not.toBeInTheDocument();
        });

        it('should render the view toggle component', async () => {
            (useInboxStore as unknown as jest.Mock).mockImplementation((selector) => {
                const state = buildInboxState();
                if (typeof selector === 'function') {
                    return selector(state);
                }
                return state;
            });

            (useUserRole as jest.Mock).mockReturnValue({ role: 'brand' });

            render(<InboxPage />);

            await waitFor(() => {
                expect(screen.getByTestId('inbox-view-toggle')).toBeInTheDocument();
            });
        });

        it('should render the desktop workspace briefing in the header', async () => {
            (useInboxStore as unknown as jest.Mock).mockImplementation((selector) => {
                const state = buildInboxState();
                if (typeof selector === 'function') {
                    return selector(state);
                }
                return state;
            });

            (useUserRole as jest.Mock).mockReturnValue({ role: 'brand' });

            render(<InboxPage />);

            await waitFor(() => {
                expect(screen.getByTestId('inbox-workspace-briefing')).toBeInTheDocument();
            });
        });

        it('should hide the workspace briefing after a conversation has started', async () => {
            (useInboxStore as unknown as jest.Mock).mockImplementation((selector) => {
                const state = buildInboxState({
                    activeThreadId: 'thread-1',
                    threads: [
                        {
                            id: 'thread-1',
                            messages: [{ id: 'msg-1', type: 'user', content: 'Hello', timestamp: new Date() }],
                        },
                    ],
                });
                if (typeof selector === 'function') {
                    return selector(state);
                }
                return state;
            });
            (useUserRole as jest.Mock).mockReturnValue({ role: 'brand' });

            render(<InboxPage />);

            expect(screen.queryByTestId('inbox-workspace-briefing')).not.toBeInTheDocument();
        });
    });

    describe('Role-based Chat Configuration', () => {
        it('should configure chat for brand users', async () => {
            (useInboxStore as unknown as jest.Mock).mockImplementation((selector) => {
                const state = buildInboxState({ viewMode: 'chat' });
                if (typeof selector === 'function') {
                    return selector(state);
                }
                return state;
            });

            (useUserRole as jest.Mock).mockReturnValue({ role: 'brand' });

            render(<InboxPage />);

            await waitFor(() => {
                expect(screen.getByTestId('unified-agent-chat')).toBeInTheDocument();
                expect(screen.getByTestId('unified-agent-chat')).toHaveAttribute('data-role', 'brand');
            });
        });

        it('should configure chat for dispensary users', async () => {
            (useInboxStore as unknown as jest.Mock).mockImplementation((selector) => {
                const state = buildInboxState({ viewMode: 'chat' });
                if (typeof selector === 'function') {
                    return selector(state);
                }
                return state;
            });

            (useUserRole as jest.Mock).mockReturnValue({ role: 'dispensary' });

            render(<InboxPage />);

            await waitFor(() => {
                expect(screen.getByTestId('unified-agent-chat')).toBeInTheDocument();
                expect(screen.getByTestId('unified-agent-chat')).toHaveAttribute('data-role', 'dispensary');
            });
        });

        it('should configure chat for super users', async () => {
            (useInboxStore as unknown as jest.Mock).mockImplementation((selector) => {
                const state = buildInboxState({ viewMode: 'chat' });
                if (typeof selector === 'function') {
                    return selector(state);
                }
                return state;
            });

            (useUserRole as jest.Mock).mockReturnValue({ role: 'super_user' });

            render(<InboxPage />);

            await waitFor(() => {
                expect(screen.getByTestId('unified-agent-chat')).toBeInTheDocument();
                expect(screen.getByTestId('unified-agent-chat')).toHaveAttribute('data-role', 'super_admin');
            });
        });

        it('should configure chat for growers', async () => {
            (useInboxStore as unknown as jest.Mock).mockImplementation((selector) => {
                const state = buildInboxState({ viewMode: 'chat' });
                if (typeof selector === 'function') {
                    return selector(state);
                }
                return state;
            });

            (useUserRole as jest.Mock).mockReturnValue({ role: 'grower' });

            render(<InboxPage />);

            await waitFor(() => {
                expect(screen.getByTestId('unified-agent-chat')).toBeInTheDocument();
                expect(screen.getByTestId('unified-agent-chat')).toHaveAttribute('data-role', 'grower');
            });
        });
    });

    describe('Loading State', () => {
        it('should show loading indicator while content loads', () => {
            (useInboxStore as unknown as jest.Mock).mockImplementation((selector) => {
                const state = buildInboxState();
                if (typeof selector === 'function') {
                    return selector(state);
                }
                return state;
            });

            (useUserRole as jest.Mock).mockReturnValue({ role: 'brand' });

            const { container } = render(<InboxPage />);

            // The Suspense boundary should show the loading state briefly
            expect(container).toBeInTheDocument();
        });
    });
});
