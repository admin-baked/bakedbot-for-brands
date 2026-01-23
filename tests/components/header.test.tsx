import React from 'react';
import { render, screen } from '@testing-library/react';
import { Header } from '@/components/header';
import * as useUserModule from '@/firebase/auth/use-user';
import * as useHydratedModule from '@/hooks/use-hydrated';
import * as demoModeModule from '@/context/demo-mode';

// Mocks
jest.mock('next/navigation', () => ({
    usePathname: () => '/',
    useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('@/firebase/auth/use-user', () => ({
    useUser: jest.fn(),
}));
jest.mock('@/firebase/provider', () => ({
    useFirebase: () => ({ auth: {} }),
}));
jest.mock('@/hooks/use-toast', () => ({
    useToast: () => ({ toast: jest.fn() }),
}));
jest.mock('@/hooks/use-store', () => ({
    useStore: () => ({
        getItemCount: () => 0,
        setCartSheetOpen: jest.fn(),
    }),
}));
jest.mock('@/components/ui/switch', () => ({
    Switch: ({ id, checked, onCheckedChange }: any) => (
        <label htmlFor={id}>
            <input
                id={id}
                type="checkbox"
                checked={checked}
                onChange={(e) => onCheckedChange(e.target.checked)}
                data-testid="demo-switch"
            />
            Mock Switch
        </label>
    ),
}));
// Verified: useDemoMode is named export
jest.mock('@/context/demo-mode', () => ({
    useDemoMode: jest.fn(),
}));
// FIX: useHydrated is a named export, so we must mock it as such
jest.mock('@/hooks/use-hydrated', () => ({
    useHydrated: jest.fn(),
}));
jest.mock('@/hooks/use-user-role', () => ({
    useUserRole: () => ({ canAccessDashboard: true, loginRoute: '/login' }),
}));

jest.mock('@/components/logo', () => () => <div data-testid="Logo">Logo</div>);
jest.mock('@/components/debug/role-switcher', () => ({ RoleSwitcher: () => <div>RoleSwitcher</div> }));

describe('Header', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Setup default mocks
        (useHydratedModule.useHydrated as jest.Mock).mockReturnValue(true);
    });

    it('renders Demo Mode switch when user is NOT logged in', () => {
        (useUserModule.useUser as jest.Mock).mockReturnValue({ user: null });
        (useHydratedModule.useHydrated as jest.Mock).mockReturnValue(true);
        (demoModeModule.useDemoMode as jest.Mock).mockReturnValue({ isDemo: false, setIsDemo: jest.fn() });

        render(<Header />);
        expect(screen.getByText('Demo Mode')).toBeInTheDocument();
        expect(screen.getByTestId('demo-switch')).toBeInTheDocument();
    });

    it('should HIDE Demo Mode switch when user IS logged in', () => {
        (useUserModule.useUser as jest.Mock).mockReturnValue({ user: { email: 'test@example.com', role: 'brand' } });
        (useHydratedModule.useHydrated as jest.Mock).mockReturnValue(true);
        (demoModeModule.useDemoMode as jest.Mock).mockReturnValue({ isDemo: false, setIsDemo: jest.fn() });

        render(<Header />);
        // With the fix in header.tsx (!user check), this should now pass
        expect(screen.queryByText('Demo Mode')).not.toBeInTheDocument();
    });
});
