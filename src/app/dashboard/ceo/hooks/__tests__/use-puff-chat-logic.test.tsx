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
            content: expect.stringContaining('City or ZIP')
        }));

        // 2. Prepare follow-up - simulate the bot has asked for location
        (useAgentChatStore as unknown as jest.Mock).mockReturnValue({
            currentMessages: [
                { id: '1', type: 'agent', content: 'Enter a City or ZIP code to start the competitive scan' }
            ],
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

        rerender();

        // 3. Submit location
        await act(async () => {
            result.current.submitMessage('90210');
        });

        await act(async () => {
            jest.advanceTimersByTime(5000);
        });

        // 4. Verify updateMessage was called with thinking steps (Market Scout flow)
        expect(mockUpdateMessage).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
                thinking: expect.objectContaining({
                    steps: expect.arrayContaining([
                        expect.objectContaining({ toolName: 'Geocoder' })
                    ])
                })
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

    // ============================================
    // NEW TESTS FOR DEMO PRESET HANDLERS
    // ============================================

    describe('Demo Preset Handlers', () => {
        it('should intercept "Find dispensaries near me" for unauthenticated users', async () => {
            const { result } = renderHook(() => usePuffChatLogic({
                isAuthenticated: false
            }));

            await act(async () => {
                result.current.submitMessage('Find dispensaries near me');
            });

            await act(async () => {
                jest.advanceTimersByTime(1000);
            });

            // Should show the dispensary search prompt with demo results
            expect(mockAddMessage).toHaveBeenCalledWith(expect.objectContaining({
                content: expect.stringContaining('Enter your ZIP code')
            }));
        });

        it('should intercept "How does BakedBot work" and explain platform', async () => {
            const { result } = renderHook(() => usePuffChatLogic({
                isAuthenticated: false
            }));

            await act(async () => {
                result.current.submitMessage('How does BakedBot work?');
            });

            await act(async () => {
                jest.advanceTimersByTime(1500);
            });

            // Should explain the platform
            expect(mockUpdateMessage).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    content: expect.stringContaining('Agentic Commerce OS')
                })
            );
        });

        it('should show compliance demo option when Deebo is triggered', async () => {
            const { result } = renderHook(() => usePuffChatLogic({
                isAuthenticated: false
            }));

            await act(async () => {
                result.current.submitMessage('Send Deebo');
            });

            await act(async () => {
                jest.advanceTimersByTime(1000);
            });

            // Should offer both URL input and demo option
            expect(mockAddMessage).toHaveBeenCalledWith(expect.objectContaining({
                content: expect.stringContaining('run demo')
            }));
        });

        it('should handle "run demo" for compliance scan', async () => {
            // Setup: Simulate Deebo has asked for URL
            (useAgentChatStore as unknown as jest.Mock).mockReturnValue({
                currentMessages: [
                    { id: '1', type: 'agent', content: 'Paste your dispensary or menu URL' }
                ],
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

            const { result } = renderHook(() => usePuffChatLogic({
                isAuthenticated: false
            }));

            await act(async () => {
                result.current.submitMessage('run demo');
            });

            await act(async () => {
                jest.advanceTimersByTime(2500);
            });

            // Should show demo compliance report
            expect(mockUpdateMessage).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    content: expect.stringContaining('Demo Compliance Audit')
                })
            );
        });

        it('should differentiate Brand vs Dispensary mode in Market Scout', async () => {
            const { result } = renderHook(() => usePuffChatLogic({
                isAuthenticated: false
            }));

            // Test Brand Mode prompt
            await act(async () => {
                result.current.submitMessage('Hire a Market Scout (Find retail partners)');
            });

            await act(async () => {
                jest.advanceTimersByTime(1000);
            });

            // Should show brand-specific prompt
            expect(mockAddMessage).toHaveBeenCalledWith(expect.objectContaining({
                content: expect.stringContaining('Find Retail Partners')
            }));
        });

        it('should show competitor intelligence prompt for Dispensary mode', async () => {
            const { result } = renderHook(() => usePuffChatLogic({
                isAuthenticated: false
            }));

            // Test Dispensary Mode (Spy on Competitors)
            await act(async () => {
                result.current.submitMessage('Hire a Market Scout (Spy on Competitors)');
            });

            await act(async () => {
                jest.advanceTimersByTime(1000);
            });

            // Should show competitor-specific prompt
            expect(mockAddMessage).toHaveBeenCalledWith(expect.objectContaining({
                content: expect.stringContaining('Competitor Intelligence')
            }));
        });

        it('should handle city input with comma (e.g., "Denver, CO")', async () => {
            // Setup: Simulate Market Scout has asked for location
            (useAgentChatStore as unknown as jest.Mock).mockReturnValue({
                currentMessages: [
                    { id: '1', type: 'agent', content: 'Enter a City or ZIP code to start the competitive scan' }
                ],
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

            const { result } = renderHook(() => usePuffChatLogic({
                isAuthenticated: false
            }));

            await act(async () => {
                result.current.submitMessage('Denver, CO');
            });

            await act(async () => {
                jest.advanceTimersByTime(5000);
            });

            // Should execute market scout - check that thinking steps were shown
            expect(mockUpdateMessage).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    thinking: expect.objectContaining({
                        steps: expect.arrayContaining([
                            expect.objectContaining({ toolName: 'Geocoder' })
                        ])
                    })
                })
            );
        });

        it('should include lead capture CTA in responses', async () => {
            const { result } = renderHook(() => usePuffChatLogic({
                isAuthenticated: false
            }));

            await act(async () => {
                result.current.submitMessage('How does BakedBot work?');
            });

            await act(async () => {
                jest.advanceTimersByTime(1500);
            });

            // Should include email capture CTA (Reply with your email)
            expect(mockUpdateMessage).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    content: expect.stringContaining('Reply with your email')
                })
            );
        });
    });
});
