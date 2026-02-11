import { render, screen, waitFor } from '@testing-library/react';
import { withAuth } from '../with-auth';
import { useUserRole } from '@/hooks/use-user-role';
import { getSuperAdminSession } from '@/lib/super-admin-config';

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
    useRouter: () => ({ push: mockPush }),
    usePathname: () => '/dashboard',
}));

jest.mock('@/hooks/use-user-role', () => ({
    useUserRole: jest.fn(),
}));

jest.mock('@/lib/super-admin-config', () => ({
    getSuperAdminSession: jest.fn(),
}));

describe('withAuth', () => {
    function ProtectedComponent() {
        return <div>protected content</div>;
    }

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('does not allow local super admin session without authenticated user', async () => {
        (getSuperAdminSession as jest.Mock).mockReturnValue({
            email: 'martez@bakedbot.ai',
            timestamp: Date.now(),
        });

        (useUserRole as jest.Mock).mockReturnValue({
            role: null,
            isLoading: false,
            user: null,
            defaultRoute: '/dashboard',
            loginRoute: '/brand-login',
            hasAnyRole: jest.fn().mockReturnValue(false),
        });

        const Wrapped = withAuth(ProtectedComponent, {
            allowedRoles: ['super_user'],
        });

        render(<Wrapped />);

        await waitFor(() => {
            expect(mockPush).toHaveBeenCalledWith('/brand-login');
        });

        expect(screen.queryByText('protected content')).not.toBeInTheDocument();
    });

    it('allows local super admin session only when it matches authenticated user email', async () => {
        (getSuperAdminSession as jest.Mock).mockReturnValue({
            email: 'martez@bakedbot.ai',
            timestamp: Date.now(),
        });

        (useUserRole as jest.Mock).mockReturnValue({
            role: 'brand',
            isLoading: false,
            user: { email: 'martez@bakedbot.ai' },
            defaultRoute: '/dashboard',
            loginRoute: '/brand-login',
            hasAnyRole: jest.fn().mockReturnValue(false),
        });

        const Wrapped = withAuth(ProtectedComponent, {
            allowedRoles: ['super_user'],
        });

        render(<Wrapped />);

        await waitFor(() => {
            expect(screen.getByText('protected content')).toBeInTheDocument();
        });

        expect(mockPush).not.toHaveBeenCalled();
    });
});
