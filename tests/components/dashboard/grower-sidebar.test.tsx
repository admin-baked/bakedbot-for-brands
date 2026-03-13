import React from 'react';
import { render, screen } from '@testing-library/react';

import { GrowerSidebar } from '@/components/dashboard/grower-sidebar';

const mockPathname = jest.fn();

jest.mock('next/navigation', () => ({
    usePathname: () => mockPathname(),
}));

jest.mock('@/hooks/use-user-role', () => ({
    useUserRole: () => ({
        orgId: 'grower_test-org',
        role: 'grower',
    }),
}));

jest.mock('@/components/ui/sidebar', () => ({
    SidebarGroup: ({ children }: { children: React.ReactNode }) => <div data-testid="sidebar-group">{children}</div>,
    SidebarGroupContent: ({ children }: { children: React.ReactNode }) => <div data-testid="sidebar-group-content">{children}</div>,
    SidebarGroupLabel: ({ children }: { children: React.ReactNode }) => <div data-testid="sidebar-group-label">{children}</div>,
    SidebarMenu: ({ children }: { children: React.ReactNode }) => <ul data-testid="sidebar-menu">{children}</ul>,
    SidebarMenuButton: ({ children }: { children: React.ReactNode }) => <button data-testid="sidebar-menu-button">{children}</button>,
    SidebarMenuItem: ({ children }: { children: React.ReactNode }) => <li data-testid="sidebar-menu-item">{children}</li>,
}));

jest.mock('@/components/ui/collapsible', () => ({
    Collapsible: ({ children }: { children: React.ReactNode }) => <div data-testid="collapsible">{children}</div>,
    CollapsibleContent: ({ children }: { children: React.ReactNode }) => <div data-testid="collapsible-content">{children}</div>,
    CollapsibleTrigger: ({ children }: { children: React.ReactNode }) => <button data-testid="collapsible-trigger">{children}</button>,
}));

jest.mock('@/components/dashboard/admin/invite-user-dialog', () => ({
    InviteUserDialog: ({
        defaultRole,
        orgId,
        allowedRoles,
        trigger,
    }: {
        defaultRole?: string;
        orgId?: string;
        allowedRoles?: string[];
        trigger?: React.ReactNode;
    }) => (
        <div
            data-testid="invite-user-dialog"
            data-default-role={defaultRole ?? ''}
            data-org-id={orgId ?? ''}
            data-allowed-roles={(allowedRoles ?? []).join(',')}
        >
            {trigger}
        </div>
    ),
}));

jest.mock('lucide-react', () => {
    return new Proxy(
        {},
        {
            get: (_target, prop: string) => {
                if (prop === '__esModule') {
                    return true;
                }

                return () => <span data-testid={`icon-${String(prop)}`} />;
            },
        },
    );
});

jest.mock('next/link', () => {
    return ({ children, href }: { children: React.ReactNode; href: string }) => (
        <a href={href} data-testid="link">{children}</a>
    );
});

describe('GrowerSidebar', () => {
    beforeEach(() => {
        mockPathname.mockReturnValue('/dashboard');
    });

    it('passes grower invite context through to the invite dialog', () => {
        render(<GrowerSidebar />);

        const inviteDialog = screen.getByTestId('invite-user-dialog');
        expect(inviteDialog).toHaveAttribute('data-default-role', 'brand_member');
        expect(inviteDialog).toHaveAttribute('data-org-id', 'grower_test-org');
        expect(inviteDialog).toHaveAttribute('data-allowed-roles', 'brand_member');
        expect(inviteDialog).toHaveTextContent('Invite Team Member');
    });
});
