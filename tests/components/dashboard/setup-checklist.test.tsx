import React from 'react';
import { render, screen } from '@testing-library/react';
import { SetupChecklist } from '@/components/dashboard/setup-checklist';

// Mock useUserRole
const mockUseUserRole = jest.fn();
jest.mock('@/hooks/use-user-role', () => ({
    useUserRole: () => mockUseUserRole(),
}));

jest.mock('next/link', () => {
    return ({ children, href }: { children: React.ReactNode; href: string }) => (
        <a href={href} data-testid={`link-${href}`}>{children}</a>
    );
});

jest.mock('lucide-react', () => ({
    CheckCircle: () => <div data-testid="icon-check" />,
    Circle: () => <div data-testid="icon-circle" />,
    Clock: () => <div data-testid="icon-clock" />,
    ChevronRight: () => <div />,
    X: () => <div />,
    Package: () => <div />,
    Store: () => <div />,
    Bot: () => <div />,
    FileSearch: () => <div />,
    Shield: () => <div />,
    Megaphone: () => <div />,
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
    Progress: () => <div data-testid="progress" />,
}));

describe('SetupChecklist', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders brand checklist items with correct links', async () => {
        mockUseUserRole.mockReturnValue({ role: 'brand', loading: false });
        render(<SetupChecklist />);

        const links = await screen.findAllByRole('link');
        // console.log('DEBUG LINKS:', links.map(l => ({ text: l.textContent, href: l.getAttribute('href') })));

        // Verify "Where to Buy" link (Fixed in previous task)
        const retailersLink = links.find(l => l.textContent?.includes('Add "Where to Buy" retailers'));
        expect(retailersLink).toBeDefined();
        expect(retailersLink).toHaveAttribute('href', '/dashboard/dispensaries');

        // Verify "Install Smokey" link (Fixed in previous task)
        const smokeyLink = links.find(l => l.textContent?.includes('Install Smokey'));
        expect(smokeyLink).toBeDefined();
        expect(smokeyLink).toHaveAttribute('href', '/dashboard/settings');
        
        // Verify "Run Audit" link (New page)
        const auditLink = links.find(l => l.textContent?.includes('Run Menu + SEO Audit'));
        expect(auditLink).toBeDefined();
        expect(auditLink).toHaveAttribute('href', '/dashboard/audit');
    });

    it('renders nothing if role is loading or unknown', () => {
        mockUseUserRole.mockReturnValue({ role: null, loading: true });
        const { container } = render(<SetupChecklist />);
        expect(container).toBeEmptyDOMElement();
    });
});
