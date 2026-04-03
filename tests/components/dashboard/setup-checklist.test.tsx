import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SetupChecklist } from '@/components/dashboard/setup-checklist';
import { useUserRole } from '@/hooks/use-user-role';
import { useUser } from '@/hooks/use-user';
import { useBrandGuide } from '@/hooks/use-brand-guide';
import { ONBOARDING_PHASE1_VERSION } from '@/lib/onboarding/activation';

jest.mock('@/hooks/use-user-role');
jest.mock('@/hooks/use-user', () => ({
    useUser: jest.fn(),
}));
jest.mock('@/hooks/use-brand-guide', () => ({
    useBrandGuide: jest.fn(),
}));

jest.mock('next/link', () => ({
    __esModule: true,
    default: ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
        <a href={href} className={className}>
            {children}
        </a>
    ),
}));

jest.mock('lucide-react', () => ({
    CheckCircle: () => <div data-testid="icon-check" />,
    Clock: () => <div data-testid="icon-clock" />,
    ChevronRight: () => <div data-testid="icon-chevron" />,
    X: () => <div data-testid="icon-close" />,
    Store: () => <div data-testid="icon-store" />,
    Bot: () => <div data-testid="icon-bot" />,
    FileSearch: () => <div data-testid="icon-intel" />,
    Megaphone: () => <div data-testid="icon-creative" />,
    Palette: () => <div data-testid="icon-palette" />,
    CalendarDays: () => <div data-testid="icon-calendar" />,
    QrCode: () => <div data-testid="icon-qr" />,
    Package: () => <div data-testid="icon-package" />,
}));

jest.mock('@/components/ui/card', () => ({
    Card: ({ children, className }: any) => <div className={className} data-testid="card">{children}</div>,
    CardHeader: ({ children }: any) => <div>{children}</div>,
    CardTitle: ({ children }: any) => <div>{children}</div>,
    CardDescription: ({ children }: any) => <div>{children}</div>,
    CardContent: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('@/components/ui/button', () => ({
    Button: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
}));

jest.mock('@/components/ui/progress', () => ({
    Progress: ({ value }: any) => <div data-testid="progress" data-value={String(value)} />,
}));

describe('SetupChecklist', () => {
    const dismissKey = `setup-checklist-dismissed-${ONBOARDING_PHASE1_VERSION}`;

    beforeEach(() => {
        jest.clearAllMocks();
        localStorage.clear();
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ linkedDispensary: null, posConnected: false }),
        }) as unknown as typeof fetch;
        (useUser as jest.Mock).mockReturnValue({
            userData: {},
            isLoading: false,
        });
        (useBrandGuide as jest.Mock).mockReturnValue({
            brandGuide: { completenessScore: 0 },
            loading: false,
        });
    });

    it('renders the brand checklist around a creative-center first win', () => {
        (useUserRole as jest.Mock).mockReturnValue({
            role: 'brand',
            isBrandRole: true,
            isDispensaryRole: false,
            orgId: 'brand-1',
        });
        (useUser as jest.Mock).mockReturnValue({
            userData: {
                onboarding: {
                    primaryGoal: 'creative_center',
                    selectedCompetitorCount: 0,
                },
            },
            isLoading: false,
        });
        (useBrandGuide as jest.Mock).mockReturnValue({
            brandGuide: { completenessScore: 48 },
            loading: false,
        });

        render(<SetupChecklist />);

        expect(screen.getByText('Complete your setup')).toBeInTheDocument();
        expect(screen.getByText('0 of 6 tasks complete. Start with Creative Center.')).toBeInTheDocument();
        expect(screen.getByText('Build your Brand Guide')).toBeInTheDocument();
        expect(screen.getByText('Create your first social draft')).toBeInTheDocument();
        expect(screen.getByText('Put your first post on the calendar')).toBeInTheDocument();
        expect(screen.getByText('Launch your Welcome Playbook')).toBeInTheDocument();
        expect(screen.getByText('Learn Inbox, Playbooks, and Agents')).toBeInTheDocument();
        expect(screen.getByText('Set up Competitive Intelligence')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /Create your first social draft/i })).toHaveAttribute(
            'href',
            '/dashboard/creative',
        );
        expect(screen.getByRole('link', { name: /Set up Competitive Intelligence/i })).toHaveAttribute(
            'href',
            '/dashboard/competitive-intel',
        );
    });

    it('renders the dispensary checklist with linked status and stored first-win progress', async () => {
        (useUserRole as jest.Mock).mockReturnValue({
            role: 'dispensary_admin',
            isBrandRole: false,
            isDispensaryRole: true,
            orgId: 'dispensary-1',
        });
        (useUser as jest.Mock).mockReturnValue({
            userData: {
                onboarding: {
                    primaryGoal: 'welcome_playbook',
                    selectedCompetitorCount: 3,
                },
            },
            isLoading: false,
        });
        (useBrandGuide as jest.Mock).mockReturnValue({
            brandGuide: { completenessScore: 82 },
            loading: false,
        });
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({ linkedDispensary: { id: 'dispensary-1' }, posConnected: true }),
        });

        render(<SetupChecklist />);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith('/api/user/linked-dispensary');
        });

        expect(await screen.findByText('Launch your Welcome Playbook')).toBeInTheDocument();
        expect(screen.getByText('Launch Check-In with Tablet')).toBeInTheDocument();
        expect(screen.getByText('Print QR & train staff')).toBeInTheDocument();
        expect(Number(screen.getByTestId('progress').getAttribute('data-value'))).toBeGreaterThan(0);
    });

    it('stores dismissal under the versioned checklist key', () => {
        (useUserRole as jest.Mock).mockReturnValue({
            role: 'brand',
            isBrandRole: true,
            isDispensaryRole: false,
            orgId: 'brand-1',
        });

        render(<SetupChecklist />);

        fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));

        expect(localStorage.getItem(dismissKey)).toBe('true');
        expect(screen.queryByTestId('card')).not.toBeInTheDocument();
    });

    it('renders nothing when the role is still loading or missing', () => {
        (useUserRole as jest.Mock).mockReturnValue({
            role: null,
            isBrandRole: false,
            isDispensaryRole: false,
            orgId: null,
        });
        (useUser as jest.Mock).mockReturnValue({
            userData: null,
            isLoading: true,
        });

        const { container } = render(<SetupChecklist />);

        expect(container).toBeEmptyDOMElement();
    });
});
