import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CreativeCommandCenterPage from '@/app/dashboard/brand/creative/page';

// Mock Lucide icons to avoid render issues
jest.mock('lucide-react', () => ({
    Sparkles: () => <div data-testid="icon-sparkles" />,
    LayoutGrid: () => <div data-testid="icon-grid" />,
    Video: () => <div data-testid="icon-video" />,
    Linkedin: () => <div data-testid="icon-linkedin" />,
    Heart: () => <div data-testid="icon-heart" />,
    MessageCircle: () => <div data-testid="icon-msg" />,
    Shield: () => <div data-testid="icon-shield" />,
    ShieldCheck: () => <div data-testid="icon-shield-check" />,
    ShieldAlert: () => <div data-testid="icon-shield-alert" />,
    Share2: () => <div data-testid="icon-share" />,
    Music2: () => <div data-testid="icon-music" />,
    MoreHorizontal: () => <div data-testid="icon-more" />,
    ThumbsUp: () => <div data-testid="icon-thumbs" />,
    MessageSquare: () => <div data-testid="icon-msg-sq" />,
    Send: () => <div data-testid="icon-send" />,
    Edit2: () => <div data-testid="icon-edit" />,
    CheckCircle2: () => <div data-testid="icon-check" />,
    XCircle: () => <div data-testid="icon-x" />,
}));

// Mock DeeboBadge since it uses Tooltip which might need provider
jest.mock('@/components/brand/creative/deebo-badge', () => ({
    DeeboBadge: ({ status }: any) => <div data-testid={`deebo-${status}`}>Badge</div>
}));

describe('Creative Command Center', () => {
    it('renders the main heading', () => {
        render(<CreativeCommandCenterPage />);
        expect(screen.getByText('Creative Command Center')).toBeInTheDocument();
    });

    it('renders all platform tabs', () => {
        render(<CreativeCommandCenterPage />);
        expect(screen.getByText('Instagram')).toBeInTheDocument();
        expect(screen.getByText('TikTok')).toBeInTheDocument();
        expect(screen.getByText('LinkedIn')).toBeInTheDocument();
    });

    it('shows content queue items', () => {
        render(<CreativeCommandCenterPage />);
        expect(screen.getByText(/Approval Queue/i)).toBeInTheDocument();
        // Check for mock content text
        expect(screen.getByText(/Friday vibes/i)).toBeInTheDocument();
    });
});
