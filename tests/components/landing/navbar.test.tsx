import React from 'react';
import { render, screen } from '@testing-library/react';
import { Navbar } from '@/components/landing/navbar';

// Mock useUser hook
const mockUseUser = jest.fn();
jest.mock('@/hooks/use-user', () => ({
    useUser: () => mockUseUser(),
}));

jest.mock('next/link', () => {
    return ({ children, href }: { children: React.ReactNode; href: string }) => (
        <a href={href}>{children}</a>
    );
});

jest.mock('next/image', () => ({
    __esModule: true,
    default: (props: any) => <img {...props} />,
}));

describe('Navbar', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('shows Login and Get Started when not logged in', () => {
        mockUseUser.mockReturnValue({ user: null, isLoading: false });
        render(<Navbar />);

        expect(screen.getByText('Login')).toBeInTheDocument();
        expect(screen.getByText(/Get Started/i)).toBeInTheDocument();
        expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
    });

    it('shows Dashboard when logged in', () => {
        mockUseUser.mockReturnValue({ user: { uid: '123' }, isLoading: false });
        render(<Navbar />);

        expect(screen.getByText('Dashboard')).toBeInTheDocument();
        expect(screen.queryByText('Login')).not.toBeInTheDocument();
        // Get Started might still be in the mobile menu or elsewhere? 
        // In the specific conditional logic we replaced, it shouldn't show.
        // But let's check the code. The conditional block replaces both links.
    });

    it('does not show dashboard while loading', () => {
        // If loading, we arguably want to show nothing or the default.
        // The code says: !isLoading && user ? Dashboard : (Login + Get Started)
        // so if isLoading is true, it shows Login + Get Started.
        // Wait, check the logic:
        // {!isLoading && user ? ( ... ) : ( ... )}
        // So if isLoading is true, !isLoading is false, so it goes to else.
        mockUseUser.mockReturnValue({ user: null, isLoading: true });
        render(<Navbar />);

        expect(screen.getByText('Login')).toBeInTheDocument();
        expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
    });
});
