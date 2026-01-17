import { renderHook, act, waitFor } from '@testing-library/react';
import { usePuffChatLogic } from '../use-puff-chat-logic';
import { useAgentChatStore } from '@/lib/store/agent-chat-store';
import { useUser } from '@/firebase/auth/use-user';
import * as actions from '../../agents/actions';

// Polyfill Fetch
if (!global.fetch) {
    global.fetch = jest.fn() as any;
}

// Mock dependencies
jest.mock('@/lib/store/agent-chat-store', () => ({
    useAgentChatStore: jest.fn()
}));
jest.mock('@/firebase/auth/use-user', () => ({
    useUser: jest.fn()
}));
jest.mock('@/hooks/use-job-poller', () => ({
    useJobPoller: jest.fn(() => ({ 
        job: null,
        thoughts: [],
        isComplete: false,
        error: null,
        poll: jest.fn() 
    }))
}));
jest.mock('../../agents/actions', () => ({
    runAgentChat: jest.fn(async () => ({ 
        content: '### Strategic Snapshot\nVerified headers.', 
        metadata: { jobId: null } 
    })),
    cancelAgentJob: jest.fn(),
    getGoogleAuthUrl: jest.fn(async () => 'http://auth.url')
}));
jest.mock('@/server/actions/integrations', () => ({
    checkIntegrationsStatus: jest.fn(async () => ({ 
        gmail: 'active',
        sheets: 'active',
        drive: 'active',
        // stripe: 'active' removed
    }))
}));
jest.mock('@/server/actions/chat-persistence', () => ({
    saveChatSession: jest.fn(async () => ({}))
}));
jest.mock('@/server/actions/artifacts', () => ({
    saveArtifact: jest.fn(async () => ({}))
}));
jest.mock('@/hooks/use-mobile', () => ({
    useIsMobile: jest.fn(() => false)
}));
jest.mock('next/navigation', () => ({
    useSearchParams: jest.fn(() => ({ 
        get: jest.fn() 
    })),
    useRouter: jest.fn(() => ({ 
        push: jest.fn(),
        replace: jest.fn(),
        back: jest.fn()
    })),
    usePathname: jest.fn(() => '/dashboard')
}));

jest.mock('@/app/dashboard/intelligence/actions/demo-presets', () => ({
    getDemoCampaignDraft: jest.fn(async () => ({ 
        name: 'Test Campaign',
        campaign: { sms: { text: 'SMS' }, emailSubject: 'Email' } 
    })),
    getDemoBrandFootprint: jest.fn(async () => ({
        overview: 'Overview',
        audit: { brandName: 'Test', estimatedRetailers: 10, topMarkets: [], coverageGaps: [], seoOpportunities: [], competitorOverlap: [] }
    })),
    getDemoPricingPlans: jest.fn(async () => ({
        plans: []
    }))
}));

jest.mock('@/app/dashboard/intelligence/actions/demo-setup', () => ({
    searchDemoRetailers: jest.fn(async () => ({
        daa: [{ name: 'Test Shop', address: '123 St' }],
        summary: 'Scouted'
    }))
}));

describe('usePuffChatLogic', () => {
    const mockAddMessage = jest.fn();
    const mockUpdateMessage = jest.fn();
    const mockCreateSession = jest.fn();
    
    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
        
        // Setup store mock
        (useAgentChatStore as unknown as jest.Mock).mockReturnValue({
            currentMessages: [],
            addMessage: mockAddMessage,
            updateMessage: mockUpdateMessage,
            createSession: mockCreateSession,
            currentArtifacts: [],
            activeArtifactId: null,
            isArtifactPanelOpen: false,
            addArtifact: jest.fn(),
            setActiveArtifact: jest.fn(),
            setArtifactPanelOpen: jest.fn(),
            sessions: []
        });

        // Setup user mock
        (useUser as jest.Mock).mockReturnValue({
            user: { uid: 'test-user', email: 'test@example.com' },
            isSuperUser: false
        });

        // Mock window properties
        Object.defineProperty(window, 'dispatchEvent', { value: jest.fn(), configurable: true });
        
        // Mock sessionStorage
        const mockStorage: Record<string, string> = {};
        Object.defineProperty(window, 'sessionStorage', {
            value: {
                getItem: (key: string) => mockStorage[key] || null,
                setItem: (key: string, value: string) => { mockStorage[key] = value; },
                removeItem: (key: string) => { delete mockStorage[key]; },
            },
            configurable: true
        });

        // Mock Fetch Response
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({ 
                id: 'scout-123',
                message: '### RETAIL OPPORTUNITIES\nFound some spots.'
            })
        });
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('should NOT intercept demo presets for authenticated users', async () => {
        const { result } = renderHook(() => usePuffChatLogic({ 
            isAuthenticated: true 
        }));

        await act(async () => {
            await result.current.submitMessage('Draft a New Drop');
        });

        expect(actions.runAgentChat).toHaveBeenCalled();
    });

    it('should intercept demo presets for unauthenticated users', async () => {
        const { result } = renderHook(() => usePuffChatLogic({ 
            isAuthenticated: false 
        }));

        await act(async () => {
            result.current.submitMessage('Draft a New Drop');
        });

        await act(async () => {
            jest.advanceTimersByTime(2000);
        });

        expect(mockUpdateMessage).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
                content: expect.stringContaining('### Draft:')
            })
        );
    });

    it('should use triple headers (###) in System Health Check', async () => {
        const { result } = renderHook(() => usePuffChatLogic({ 
            isAuthenticated: false 
        }));

        await act(async () => {
             result.current.submitMessage('check system health');
        });

        await act(async () => {
            jest.advanceTimersByTime(2000);
        });

        expect(mockUpdateMessage).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
                content: expect.stringContaining('###')
            })
        );
    });

    it('should handle Market Scout location follow-up', async () => {
        const { result, rerender } = renderHook(() => usePuffChatLogic({ 
            isAuthenticated: false 
        }));

        // 1. Initial trigger
        await act(async () => {
            result.current.submitMessage('Hire a Market Scout');
        });

        await act(async () => {
            jest.advanceTimersByTime(1000);
        });

        expect(mockAddMessage).toHaveBeenCalledWith(expect.objectContaining({
            content: expect.stringContaining('What City/Zip?')
        }));

        // 2. Prepare follow-up
        (useAgentChatStore as unknown as jest.Mock).mockReturnValue({
            currentMessages: [
                { id: '1', role: 'assistant', content: 'What City/Zip?' }
            ],
            addMessage: mockAddMessage,
            updateMessage: mockUpdateMessage,
            createSession: mockCreateSession,
            sessions: []
        });

        rerender();

        // 3. Submit location
        await act(async () => {
            result.current.submitMessage('90210');
        });

        await act(async () => {
            jest.advanceTimersByTime(2000);
        });

        // 4. Verify updateMessage called with headers
        expect(mockUpdateMessage).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
                content: expect.stringContaining('RETAIL OPPORTUNITIES')
            })
        );
    });

    it('should verify Executive Boardroom agents use rich headers', async () => {
        const { result } = renderHook(() => usePuffChatLogic({ 
            isAuthenticated: true,
            persona: 'leo' 
        }));

        await act(async () => {
            await result.current.submitMessage('Give me a strategic overview');
        });

        // Check if runAgentChat was called
        expect(actions.runAgentChat).toHaveBeenCalled();
        
        // The hook calls updateMessage for the final sync response
        expect(mockUpdateMessage).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
            content: expect.stringContaining('### Strategic Snapshot')
        }));
    });
});
