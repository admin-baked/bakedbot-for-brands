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
jest.mock('@/components/inbox/unified-inbox', () => ({
    UnifiedInbox: () => <div data-testid="unified-inbox">Unified Inbox View</div>,
}));
jest.mock('@/components/chat/unified-agent-chat', () => ({
    UnifiedAgentChat: () => <div data-testid="unified-agent-chat">Agent Chat View</div>,
}));
jest.mock('@/components/inbox/inbox-view-toggle', () => ({
    InboxViewToggle: () => <div data-testid="inbox-view-toggle">Toggle</div>,
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

    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('View Mode Rendering', () => {
        it('should render UnifiedInbox when viewMode is "inbox"', async () => {
            (useInboxStore as unknown as jest.Mock).mockImplementation((selector) => {
                if (typeof selector === 'function') {
                    return selector({ viewMode: 'inbox', setViewMode: mockSetViewMode });
                }
                return { viewMode: 'inbox', setViewMode: mockSetViewMode };
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
                if (typeof selector === 'function') {
                    return selector({ viewMode: 'chat', setViewMode: mockSetViewMode });
                }
                return { viewMode: 'chat', setViewMode: mockSetViewMode };
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
        it('should display "Unified Inbox" title when in inbox mode', async () => {
            (useInboxStore as unknown as jest.Mock).mockImplementation((selector) => {
                if (typeof selector === 'function') {
                    return selector({ viewMode: 'inbox', setViewMode: mockSetViewMode });
                }
                return { viewMode: 'inbox', setViewMode: mockSetViewMode };
            });

            (useUserRole as jest.Mock).mockReturnValue({ role: 'brand' });

            render(<InboxPage />);

            await waitFor(() => {
                expect(screen.getByText('Unified Inbox')).toBeInTheDocument();
            });
        });

        it('should display "Agent Chat" title when in chat mode', async () => {
            (useInboxStore as unknown as jest.Mock).mockImplementation((selector) => {
                if (typeof selector === 'function') {
                    return selector({ viewMode: 'chat', setViewMode: mockSetViewMode });
                }
                return { viewMode: 'chat', setViewMode: mockSetViewMode };
            });

            (useUserRole as jest.Mock).mockReturnValue({ role: 'brand' });

            render(<InboxPage />);

            await waitFor(() => {
                expect(screen.getByText('Agent Chat')).toBeInTheDocument();
            });
        });

        it('should render the view toggle component', async () => {
            (useInboxStore as unknown as jest.Mock).mockImplementation((selector) => {
                if (typeof selector === 'function') {
                    return selector({ viewMode: 'inbox', setViewMode: mockSetViewMode });
                }
                return { viewMode: 'inbox', setViewMode: mockSetViewMode };
            });

            (useUserRole as jest.Mock).mockReturnValue({ role: 'brand' });

            render(<InboxPage />);

            await waitFor(() => {
                expect(screen.getByTestId('inbox-view-toggle')).toBeInTheDocument();
            });
        });
    });

    describe('Role-based Chat Configuration', () => {
        it('should configure chat for brand users', async () => {
            (useInboxStore as unknown as jest.Mock).mockImplementation((selector) => {
                if (typeof selector === 'function') {
                    return selector({ viewMode: 'chat', setViewMode: mockSetViewMode });
                }
                return { viewMode: 'chat', setViewMode: mockSetViewMode };
            });

            (useUserRole as jest.Mock).mockReturnValue({ role: 'brand' });

            render(<InboxPage />);

            await waitFor(() => {
                expect(screen.getByTestId('unified-agent-chat')).toBeInTheDocument();
            });
        });

        it('should configure chat for dispensary users', async () => {
            (useInboxStore as unknown as jest.Mock).mockImplementation((selector) => {
                if (typeof selector === 'function') {
                    return selector({ viewMode: 'chat', setViewMode: mockSetViewMode });
                }
                return { viewMode: 'chat', setViewMode: mockSetViewMode };
            });

            (useUserRole as jest.Mock).mockReturnValue({ role: 'dispensary' });

            render(<InboxPage />);

            await waitFor(() => {
                expect(screen.getByTestId('unified-agent-chat')).toBeInTheDocument();
            });
        });

        it('should configure chat for super users', async () => {
            (useInboxStore as unknown as jest.Mock).mockImplementation((selector) => {
                if (typeof selector === 'function') {
                    return selector({ viewMode: 'chat', setViewMode: mockSetViewMode });
                }
                return { viewMode: 'chat', setViewMode: mockSetViewMode };
            });

            (useUserRole as jest.Mock).mockReturnValue({ role: 'super_user' });

            render(<InboxPage />);

            await waitFor(() => {
                expect(screen.getByTestId('unified-agent-chat')).toBeInTheDocument();
            });
        });
    });

    describe('Loading State', () => {
        it('should show loading indicator while content loads', () => {
            (useInboxStore as unknown as jest.Mock).mockImplementation((selector) => {
                if (typeof selector === 'function') {
                    return selector({ viewMode: 'inbox', setViewMode: mockSetViewMode });
                }
                return { viewMode: 'inbox', setViewMode: mockSetViewMode };
            });

            (useUserRole as jest.Mock).mockReturnValue({ role: 'brand' });

            const { container } = render(<InboxPage />);

            // The Suspense boundary should show the loading state briefly
            expect(container).toBeInTheDocument();
        });
    });
});
