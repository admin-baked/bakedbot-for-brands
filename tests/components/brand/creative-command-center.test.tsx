import React from 'react';
import { render, screen } from '@testing-library/react';
import CreativeCommandCenterPage from '@/app/dashboard/brand/creative/page';

// Mock Lucide icons
jest.mock('lucide-react', () => ({
    LayoutGrid: () => <div data-testid="icon-grid" />,
    Video: () => <div data-testid="icon-video" />,
    Linkedin: () => <div data-testid="icon-linkedin" />,
    ImageIcon: () => <div data-testid="icon-image" />,
    RefreshCw: () => <div data-testid="icon-refresh" />,
    Sparkles: () => <div data-testid="icon-sparkles" />,
    FolderOpen: () => <div data-testid="icon-folder-open" />,
    ChevronRight: () => <div data-testid="icon-chevron" />,
    FileImage: () => <div data-testid="icon-file-image" />,
    FileVideo: () => <div data-testid="icon-file-video" />,
    Folder: () => <div data-testid="icon-folder" />,
    MoreHorizontal: () => <div data-testid="icon-more" />,
    ShieldAlert: () => <div data-testid="icon-shield-alert" />,
    ShieldCheck: () => <div data-testid="icon-shield-check" />,
    XCircle: () => <div data-testid="icon-x" />,
    AlertTriangle: () => <div data-testid="icon-alert" />,
    CheckCircle2: () => <div data-testid="icon-check" />,
    ArrowRight: () => <div data-testid="icon-arrow-right" />,
    Clock: () => <div data-testid="icon-clock" />,
    Edit3: () => <div data-testid="icon-edit" />,
    MessageSquare: () => <div data-testid="icon-message" />,
    Heart: () => <div data-testid="icon-heart" />,
    MessageCircle: () => <div data-testid="icon-msg" />,
    Share2: () => <div data-testid="icon-share" />,
    Music2: () => <div data-testid="icon-music" />,
    Send: () => <div data-testid="icon-send" />,
    Edit2: () => <div data-testid="icon-edit2" />,
    Plus: () => <div data-testid="icon-plus" />,
    Loader2: () => <div data-testid="icon-loader" />,
    ImageOff: () => <div data-testid="icon-image-off" />,
    Bot: () => <div data-testid="icon-bot" />,
    Wand2: () => <div data-testid="icon-wand" />,
    Palette: () => <div data-testid="icon-palette" />,
    Shield: () => <div data-testid="icon-shield" />,
    Brain: () => <div data-testid="icon-brain" />,
    Copy: () => <div data-testid="icon-copy" />,
    ThumbsUp: () => <div data-testid="icon-thumbs" />,
    X: () => <div data-testid="icon-x-close" />,
    ChevronLeft: () => <div data-testid="icon-chevron-left" />,
    ChevronDown: () => <div data-testid="icon-chevron-down" />,
    PlayCircle: () => <div data-testid="icon-play" />,
}));

// Mock date-fns
jest.mock('date-fns', () => ({
    formatDistanceToNow: () => '5 minutes ago',
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
        button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
        span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock the subcomponents to avoid complex rendering
jest.mock('@/components/brand/creative/instagram-grid', () => ({
    InstagramGrid: () => <div data-testid="instagram-grid">Instagram Grid</div>,
}));

jest.mock('@/components/brand/creative/tiktok-preview', () => ({
    TikTokPreview: () => <div data-testid="tiktok-preview">TikTok Preview</div>,
}));

jest.mock('@/components/brand/creative/linkedin-preview', () => ({
    LinkedInPreview: () => <div data-testid="linkedin-preview">LinkedIn Preview</div>,
}));

jest.mock('@/components/brand/creative/content-queue', () => ({
    ContentQueue: () => <div data-testid="content-queue">Content Queue</div>,
}));

jest.mock('@/components/brand/creative/compliance-panel', () => ({
    CompliancePanel: () => <div data-testid="compliance-panel">Compliance Panel</div>,
}));

jest.mock('@/components/brand/creative/workflow-lifecycle', () => ({
    WorkflowLifecycle: () => <div data-testid="workflow-lifecycle">Workflow Lifecycle</div>,
}));

jest.mock('@/components/brand/creative/activity-log', () => ({
    ActivityLog: () => <div data-testid="activity-log">Activity Log</div>,
}));

jest.mock('@/components/brand/creative/agent-squad-panel', () => ({
    AgentSquadPanel: () => <div data-testid="agent-squad">Agent Squad</div>,
}));

jest.mock('@/components/brand/creative/content-canvas', () => ({
    ContentCanvas: () => <div data-testid="content-canvas">Content Canvas</div>,
}));

jest.mock('@/components/brand/creative/carousel-generator', () => ({
    CarouselGenerator: () => <div data-testid="carousel-generator">Carousel Generator</div>,
}));

// Mock the hooks
jest.mock('@/hooks/use-creative-content', () => ({
    useCreativeContent: () => ({
        content: [],
        loading: false,
        error: null,
        generate: jest.fn(),
        approve: jest.fn(),
        revise: jest.fn(),
        editCaption: jest.fn(),
        refresh: jest.fn(),
        isGenerating: false,
        isApproving: null,
    }),
}));

jest.mock('@/hooks/use-brand-id', () => ({
    useBrandId: () => ({
        brandId: null,
        loading: false,
    }),
}));

describe('Creative Command Center Page', () => {
    it('renders the main heading', () => {
        render(<CreativeCommandCenterPage />);
        expect(screen.getByText('Creative Command Center')).toBeInTheDocument();
    });

    it('renders the subtitle', () => {
        render(<CreativeCommandCenterPage />);
        expect(screen.getByText(/Manage your brand's voice/)).toBeInTheDocument();
    });

    it('shows demo mode badge when no brand connected', () => {
        render(<CreativeCommandCenterPage />);
        expect(screen.getByText(/Demo Mode/)).toBeInTheDocument();
    });

    it('renders agents ready badge', () => {
        render(<CreativeCommandCenterPage />);
        expect(screen.getByText('Agents Ready')).toBeInTheDocument();
    });

    it('renders the content canvas', () => {
        render(<CreativeCommandCenterPage />);
        expect(screen.getByTestId('content-canvas')).toBeInTheDocument();
    });

    it('renders platform preview tabs', () => {
        render(<CreativeCommandCenterPage />);
        expect(screen.getByText('Grid')).toBeInTheDocument();
        expect(screen.getByText('TikTok')).toBeInTheDocument();
        expect(screen.getByText('LinkedIn')).toBeInTheDocument();
        expect(screen.getByText('Carousel')).toBeInTheDocument();
    });

    it('renders the agent squad panel', () => {
        render(<CreativeCommandCenterPage />);
        expect(screen.getByTestId('agent-squad')).toBeInTheDocument();
    });

    it('renders the compliance panel', () => {
        render(<CreativeCommandCenterPage />);
        expect(screen.getByTestId('compliance-panel')).toBeInTheDocument();
    });

    it('renders the workflow lifecycle', () => {
        render(<CreativeCommandCenterPage />);
        expect(screen.getByTestId('workflow-lifecycle')).toBeInTheDocument();
    });

    it('renders the activity log', () => {
        render(<CreativeCommandCenterPage />);
        expect(screen.getByTestId('activity-log')).toBeInTheDocument();
    });

    it('renders creative assets section', () => {
        render(<CreativeCommandCenterPage />);
        expect(screen.getByText('Creative Assets')).toBeInTheDocument();
    });

    it('renders asset folders', () => {
        render(<CreativeCommandCenterPage />);
        expect(screen.getByText('Brand Assets')).toBeInTheDocument();
        expect(screen.getByText('Product Photos')).toBeInTheDocument();
        expect(screen.getByText('Videos')).toBeInTheDocument();
    });
});
