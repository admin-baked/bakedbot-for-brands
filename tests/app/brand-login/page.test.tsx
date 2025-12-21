
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BrandLoginPage from '../../../src/app/brand-login/page';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

// Mocks
jest.mock('next/navigation', () => ({
    useRouter: jest.fn(),
}));

jest.mock('@/firebase/provider', () => ({
    useFirebase: jest.fn(),
}));

jest.mock('@/hooks/use-toast', () => ({
    useToast: jest.fn(),
}));

jest.mock('@/components/dev-login-button', () => {
    return function MockDevLoginButton() {
        return <div data-testid="dev-login-button">Dev Login</div>;
    };
});

// Mock Firebase Auth functions
jest.mock('firebase/auth', () => ({
    signInWithEmailAndPassword: jest.fn(),
    createUserWithEmailAndPassword: jest.fn(),
    GoogleAuthProvider: jest.fn(),
    signInWithPopup: jest.fn(),
    getAdditionalUserInfo: jest.fn(),
}));

// Mock Image component since it handles src loading
jest.mock('next/image', () => ({
    __esModule: true,
    default: (props: any) => <img {...props} />,
}));

describe('BrandLoginPage', () => {
    const mockRouter = { push: jest.fn() };
    const mockAuth = {}; // detailed mock not needed for simple render/interaction unless strict auth checks used in render
    const mockToast = jest.fn();

    beforeEach(() => {
        (useRouter as jest.Mock).mockReturnValue(mockRouter);
        (useFirebase as jest.Mock).mockReturnValue({ auth: mockAuth });
        (useToast as jest.Mock).mockReturnValue({ toast: mockToast });
        jest.clearAllMocks();
    });

    it('renders login form by default', () => {
        render(<BrandLoginPage />);
        expect(screen.getByText('Brand Login')).toBeInTheDocument();
        expect(screen.getByLabelText('Business Email')).toBeInTheDocument();
        expect(screen.getByLabelText('Password')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
    });

    it('switches to sign up mode', async () => {
        render(<BrandLoginPage />);

        const toggleButton = screen.getByText("Don't have an account? Sign Up");
        fireEvent.click(toggleButton);

        await waitFor(() => {
            expect(screen.getByText('Create a Brand Account')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Sign Up' })).toBeInTheDocument();
        });
    });

    it('handles login submission with valid data', async () => {
        (signInWithEmailAndPassword as jest.Mock).mockResolvedValue({
            user: {
                getIdToken: jest.fn().mockResolvedValue('mock-token'),
                getIdTokenResult: jest.fn().mockResolvedValue({ claims: { role: 'brand' } })
            }
        });
        // Mock fetch for session creation
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: jest.fn().mockResolvedValue({})
        } as any);

        // We need to mock window.location.href assignment
        Object.defineProperty(window, 'location', {
            value: { href: '' },
            writable: true
        });

        render(<BrandLoginPage />);

        fireEvent.change(screen.getByLabelText('Business Email'), { target: { value: 'test@example.com' } });
        fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });

        fireEvent.click(screen.getByRole('button', { name: 'Login' }));

        // Ideally we await specific side effects, but for now we check if auth function was called
        await waitFor(() => {
            expect(signInWithEmailAndPassword).toHaveBeenCalledWith(mockAuth, 'test@example.com', 'password123');
        });
    });

    it('shows error toast on login failure', async () => {
        (signInWithEmailAndPassword as jest.Mock).mockRejectedValue(new Error('Auth failed'));

        render(<BrandLoginPage />);

        fireEvent.change(screen.getByLabelText('Business Email'), { target: { value: 'test@example.com' } });
        fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });

        fireEvent.click(screen.getByRole('button', { name: 'Login' }));

        await waitFor(() => {
            expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
                variant: 'destructive',
                title: 'Authentication Error'
            }));
        });
    });
});
