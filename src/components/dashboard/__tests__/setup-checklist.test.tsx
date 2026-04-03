import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SetupChecklist } from '../setup-checklist';
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
    default: ({ children, href }: { children: React.ReactNode; href: string }) => (
        <a href={href}>{children}</a>
    ),
}));

jest.mock('lucide-react', () => ({
    CheckCircle: () => <div data-testid="check-circle" />,
    Clock: () => <div data-testid="clock-icon" />,
    ChevronRight: () => <div data-testid="chevron-icon" />,
    X: () => <div data-testid="x-icon" />,
    Store: () => <div data-testid="store-icon" />,
    Bot: () => <div data-testid="bot-icon" />,
    FileSearch: () => <div data-testid="intel-icon" />,
    Megaphone: () => <div data-testid="creative-icon" />,
    Palette: () => <div data-testid="palette-icon" />,
    CalendarDays: () => <div data-testid="calendar-icon" />,
    QrCode: () => <div data-testid="qr-icon" />,
    Package: () => <div data-testid="package-icon" />,
}));

jest.mock('@/components/ui/card', () => ({
    Card: ({ children }: any) => <div data-testid="card">{children}</div>,
    CardHeader: ({ children }: any) => <div>{children}</div>,
    CardTitle: ({ children }: any) => <h2>{children}</h2>,
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

    it('shows six focused tasks for brands', () => {
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
                },
            },
            isLoading: false,
        });

        render(<SetupChecklist />);

        const items = screen.getAllByRole('link');
        expect(items).toHaveLength(6);
        expect(screen.getByText(/Build your Brand Guide/i)).toBeInTheDocument();
        expect(screen.getByText(/Create your first social draft/i)).toBeInTheDocument();
        expect(screen.getByText(/Put your first post on the calendar/i)).toBeInTheDocument();
        expect(screen.getByText(/Launch your Welcome Playbook/i)).toBeInTheDocument();
        expect(screen.getByText(/Learn Inbox, Playbooks, and Agents/i)).toBeInTheDocument();
        expect(screen.getByText(/Set up Competitive Intelligence/i)).toBeInTheDocument();
    });

    it('shows dispensary-specific setup tasks', async () => {
        (useUserRole as jest.Mock).mockReturnValue({
            role: 'dispensary',
            isBrandRole: false,
            isDispensaryRole: true,
            orgId: 'dispensary-1',
        });
        (useUser as jest.Mock).mockReturnValue({
            userData: {
                onboarding: {
                    primaryGoal: 'checkin_tablet',
                },
            },
            isLoading: false,
        });

        render(<SetupChecklist />);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith('/api/user/linked-dispensary');
        });

        expect(await screen.findByText(/Link your dispensary/i)).toBeInTheDocument();
        expect(screen.getByText(/Connect menu data/i)).toBeInTheDocument();
        expect(screen.getByText(/Launch Check-In with Tablet/i)).toBeInTheDocument();
        expect(screen.getByText(/Print QR & train staff/i)).toBeInTheDocument();
    });

    it('shows a zero progress bar for a fresh brand org', () => {
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
            brandGuide: { completenessScore: 40 },
            loading: false,
        });

        render(<SetupChecklist />);

        expect(screen.getByTestId('progress')).toHaveAttribute('data-value', '0');
    });

    it('allows dismissing the checklist with the versioned key', () => {
        (useUserRole as jest.Mock).mockReturnValue({
            role: 'brand',
            isBrandRole: true,
            isDispensaryRole: false,
            orgId: 'brand-1',
        });

        render(<SetupChecklist />);

        fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));

        expect(screen.queryByTestId('card')).not.toBeInTheDocument();
        expect(localStorage.getItem(dismissKey)).toBe('true');
    });

    it('does not show if already dismissed in localStorage', () => {
        localStorage.setItem(dismissKey, 'true');
        (useUserRole as jest.Mock).mockReturnValue({
            role: 'brand',
            isBrandRole: true,
            isDispensaryRole: false,
            orgId: 'brand-1',
        });

        render(<SetupChecklist />);

        expect(screen.queryByTestId('card')).not.toBeInTheDocument();
    });
});
