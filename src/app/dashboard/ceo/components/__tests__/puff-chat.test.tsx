import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PuffChat } from '../puff-chat';
import { usePuffChatLogic } from '../../hooks/use-puff-chat-logic';
import { useAgentChatStore } from '@/lib/store/agent-chat-store';

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(), // deprecated
        removeListener: jest.fn(), // deprecated
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
    })),
});

// Mock scrollIntoView
window.HTMLElement.prototype.scrollIntoView = jest.fn();

// Mock the hook
// Mock the hook with a factory to avoid loading the file and its dependencies
jest.mock('../../hooks/use-puff-chat-logic', () => ({
    usePuffChatLogic: jest.fn()
}));
// Mock the store
jest.mock('@/lib/store/agent-chat-store');
// Mock Sub-components that might cause issues (though they should be fine now)
jest.mock('@/components/ui/audio-recorder', () => ({
    AudioRecorder: () => <div data-testid="audio-recorder">Recorder</div>
}));
jest.mock('@/components/chat/project-selector', () => ({
    ProjectSelector: () => <div data-testid="project-selector">Project Selector</div>
}));
jest.mock('../model-selector', () => ({
    ModelSelector: () => <div data-testid="model-selector">Model Selector</div>,
    ThinkingLevel: {} 
}));
jest.mock('@/components/artifacts/artifact-panel', () => ({
    ArtifactPanel: () => <div data-testid="artifact-panel">Artifact Panel</div>
}));
jest.mock('@/components/chat/agent-response-carousel', () => ({
    AgentResponseCarousel: () => <div data-testid="agent-carousel">Carousel</div>
}));
jest.mock('@/components/chat/chat-media-preview', () => ({
    ChatMediaPreview: () => <div data-testid="media-preview">Media Preview</div>
}));
jest.mock('@/components/landing/typewriter-text', () => ({
    TypewriterText: ({ text }: { text: string }) => <div data-testid="typewriter">{text}</div>
}));
jest.mock('@/components/chat/thought-bubble', () => ({
    ThoughtBubble: () => <div data-testid="thought-bubble">Thinking...</div>
}));
jest.mock('@/components/chat/chat-feedback', () => ({
    ChatFeedback: () => <div data-testid="chat-feedback">Feedback</div>
}));
jest.mock('@/firebase/auth/use-user', () => ({
    useUser: () => ({ user: { uid: 'test-user', email: 'test@example.com' }, isSuperUser: false, claims: {} })
}));

// Mock Lucide icons
jest.mock('lucide-react', () => {
    const IconMock = () => <div />;
    return {
        ...jest.requireActual('lucide-react'),
        Sparkles: IconMock,
        User: IconMock,
        Bot: IconMock,
        Send: IconMock,
        Paperclip: IconMock,
        Mic: IconMock,
        StopCircle: IconMock,
        ArrowLeft: IconMock,
        CheckCircle2: IconMock,
        X: IconMock,
        FileText: IconMock,
        Loader2: IconMock,
        Info: IconMock,
        ChevronDown: IconMock,
        Wrench: IconMock,
        Check: IconMock,
        ShieldCheck: IconMock,
        AlertCircle: IconMock,
        MoreHorizontal: IconMock,
        ExternalLink: IconMock,
        Copy: IconMock,
        Image: IconMock, // ImageIcon is imported as Image usually or aliased
        Play: IconMock,
        Square: IconMock,
        ChevronUp: IconMock,
        Star: IconMock,
        Mail: IconMock,
        Calendar: IconMock,
        FolderOpen: IconMock,
        Globe: IconMock,
        LayoutGrid: IconMock,
        Menu: IconMock,
        Leaf: IconMock,
        Megaphone: IconMock,
        BarChart3: IconMock,
        Zap: IconMock,
        DollarSign: IconMock,
        Heart: IconMock,
        ShieldAlert: IconMock,
        Briefcase: IconMock,
        Rocket: IconMock,
        ShoppingCart: IconMock
    };
});

describe('PuffChat Component', () => {
    const mockSubmitMessage = jest.fn();
    const mockSetInput = jest.fn();
    const mockSetPersona = jest.fn();
    
    const defaultHookValues = {
        state: { title: 'Test Chat', isConnected: true, permissions: [], triggers: [] },
        input: '',
        setInput: mockSetInput,
        isProcessing: false,
        streamingMessageId: null,
        attachments: [],
        integrationStatus: {},
        persona: 'puff',
        setPersona: mockSetPersona,
        thinkingLevel: 'standard',
        setThinkingLevel: jest.fn(),
        selectedProjectId: null,
        setSelectedProjectId: jest.fn(),
        toolMode: 'auto',
        setToolMode: jest.fn(),
        selectedTools: [],
        isHireModalOpen: false,
        setIsHireModalOpen: jest.fn(),
        selectedHirePlan: 'specialist',
        showPermissions: true,
        setShowPermissions: jest.fn(),
        submitMessage: mockSubmitMessage,
        handleFileSelect: jest.fn(),
        handleAudioComplete: jest.fn(),
        handleToggleTool: jest.fn(),
        handleGrantPermission: jest.fn(),
        handleShowToolInfo: jest.fn(),
        openHireModal: jest.fn(),
        removeAttachment: jest.fn()
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (usePuffChatLogic as jest.Mock).mockReturnValue(defaultHookValues);
        (useAgentChatStore as unknown as jest.Mock).mockReturnValue({
            currentMessages: [],
            setActiveArtifact: jest.fn(),
            setArtifactPanelOpen: jest.fn(),
            currentArtifacts: [],
            activeArtifactId: null,
            isArtifactPanelOpen: false
        });
    });

    it('renders without crashing', () => {
        render(<PuffChat />);
        expect(screen.getByText('Meet Your Digital Workforce')).toBeInTheDocument();
    });

    it('displays messages from store', () => {
        (useAgentChatStore as unknown as jest.Mock).mockReturnValue({
            currentMessages: [
                { id: '1', type: 'user', content: 'Hello', timestamp: new Date() },
                { id: '2', type: 'agent', content: 'Hi there', timestamp: new Date() }
            ],
            setActiveArtifact: jest.fn(),
            setArtifactPanelOpen: jest.fn(),
            currentArtifacts: [],
            activeArtifactId: null,
            isArtifactPanelOpen: false
        });

        render(<PuffChat />);
        expect(screen.getByText('Hello')).toBeInTheDocument();
        expect(screen.getByText('Hi there')).toBeInTheDocument();
    });

    it('calls setInput on typing', () => {
        render(<PuffChat />);
        const input = screen.getByPlaceholderText(/Ask Smokey anything/i);
        fireEvent.change(input, { target: { value: 'New message' } });
        expect(mockSetInput).toHaveBeenCalledWith('New message');
    });

    it('calls submitMessage on send button click', () => {
        // We need input to be non-empty for button to be enabled in UI logic (controlled by hook value in reality, but here mocked)
        (usePuffChatLogic as jest.Mock).mockReturnValue({
            ...defaultHookValues,
            input: 'Test message'
        });

        render(<PuffChat />);
        const submitBtn = screen.getByTestId('submit-button');
        fireEvent.click(submitBtn);
        expect(mockSubmitMessage).toHaveBeenCalledWith('Test message');
    });

    it('shows processing state', () => {
        (usePuffChatLogic as jest.Mock).mockReturnValue({
            ...defaultHookValues,
            isProcessing: true
        });
        
        render(<PuffChat />);
        expect(screen.getByTitle('Stop Generation')).toBeInTheDocument();
    });
    
    it('handles permission card grant', () => {
        const mockGrant = jest.fn();
        (usePuffChatLogic as jest.Mock).mockReturnValue({
            ...defaultHookValues,
            state: { 
                ...defaultHookValues.state, 
                permissions: [{ id: 'gmail', name: 'Gmail', status: 'pending', description: 'Access', icon: 'mail', tools: [] }] 
            },
            handleGrantPermission: mockGrant
        });
        
        render(<PuffChat />);
        const connectBtn = screen.getByText('Connect');
        fireEvent.click(connectBtn);
        expect(mockGrant).toHaveBeenCalledWith('gmail');
    });
});
