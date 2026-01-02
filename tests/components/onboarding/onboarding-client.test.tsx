
// Aggressive mocks to prevent server-side dependency leaks
jest.mock('firebase-admin', () => ({
    auth: () => ({
        setCustomUserClaims: jest.fn(),
    }),
    firestore: () => ({
        collection: jest.fn(),
    }),
    credential: {
        cert: jest.fn(),
    },
    initializeApp: jest.fn(),
    getApps: jest.fn(() => []),
    apps: [],
}));

jest.mock('jwks-rsa', () => ({
    JwksClient: jest.fn(),
}));

jest.mock('firebase-admin/firestore', () => ({
    FieldValue: {
        serverTimestamp: jest.fn(),
    },
}));

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useFirebase } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import { useSearchParams } from 'next/navigation';
import { signInWithPopup, createUserWithEmailAndPassword } from 'firebase/auth';

// Mocks MUST be before any imports that might use them
jest.mock('@/firebase/provider', () => ({
    useFirebase: jest.fn(),
}));

jest.mock('@/app/onboarding/actions', () => ({
    completeOnboarding: jest.fn(() => Promise.resolve({ message: 'Success', error: false })),
}));

// Add this to be safe in case of path resolution differences
jest.mock('../../../src/app/onboarding/actions', () => ({
    completeOnboarding: jest.fn(() => Promise.resolve({ message: 'Success', error: false })),
}));

jest.mock('@/app/onboarding/pre-start-import', () => ({
    preStartDataImport: jest.fn().mockResolvedValue({ success: true, jobIds: [] }),
}));

jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn().mockResolvedValue({
        firestore: {},
        auth: {}
    }),
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
    useSearchParams: jest.fn(),
}));

// Mock firebase auth
jest.mock('firebase/auth', () => ({
    GoogleAuthProvider: jest.fn(),
    signInWithPopup: jest.fn(),
    createUserWithEmailAndPassword: jest.fn(),
}));

// Mock toast
jest.mock('@/hooks/use-toast', () => ({
    useToast: jest.fn(),
}));

// Mock CannMenus actions
jest.mock('@/server/actions/cannmenus', () => ({
    searchCannMenusRetailers: jest.fn(),
}));

// Mock react-dom
jest.mock('react-dom', () => ({
    ...jest.requireActual('react-dom'),
    useFormState: () => [{ message: '', error: false }, jest.fn()],
}));

// Now import the component
import OnboardingPage from '@/app/onboarding/onboarding-client';

describe('OnboardingClient Signup Flow', () => {
    const mockAuth = {
        currentUser: null,
    };
    const mockToast = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        (useFirebase as jest.Mock).mockReturnValue({ auth: mockAuth });
        (useToast as jest.Mock).mockReturnValue({ toast: mockToast });
        (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams());

        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ success: true }),
        });

        // Default window.location mock
        delete (window as any).location;
        window.location = { ...window.location, assign: jest.fn(), reload: jest.fn() } as any;
    });

    it('shows signup modal when unauthenticated user attempts to finish', async () => {
        render(<OnboardingPage />);

        // 1. Select Customer role (jumps to review)
        fireEvent.click(screen.getByText('A Customer'));

        // 2. Click "Complete Setup"
        const finishButton = screen.getByText('Complete Setup');
        fireEvent.click(finishButton);

        // 3. Verify signup modal appears
        expect(screen.getByText("You're Almost There!")).toBeInTheDocument();
    });

    it('handles Google sign up and creates session', async () => {
        const mockUser = {
            getIdToken: jest.fn().mockResolvedValue('fake-id-token'),
        };
        (signInWithPopup as jest.Mock).mockResolvedValue({ user: mockUser });

        render(<OnboardingPage />);

        fireEvent.click(screen.getByText('A Customer'));
        fireEvent.click(screen.getByText('Complete Setup'));

        const googleButton = screen.getByText('Sign Up with Google');
        fireEvent.click(googleButton);

        await waitFor(() => {
            expect(signInWithPopup).toHaveBeenCalled();
            expect(global.fetch).toHaveBeenCalledWith('/api/auth/session', expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({ idToken: 'fake-id-token' }),
            }));
        });
    });

    it('handles Email/Password sign up and creates session', async () => {
        const mockUser = {
            getIdToken: jest.fn().mockResolvedValue('fake-email-token'),
        };
        (createUserWithEmailAndPassword as jest.Mock).mockResolvedValue({ user: mockUser });

        render(<OnboardingPage />);

        fireEvent.click(screen.getByText('A Customer'));
        fireEvent.click(screen.getByText('Complete Setup'));

        fireEvent.change(screen.getByPlaceholderText('name@example.com'), { target: { value: 'test@example.com' } });
        fireEvent.change(screen.getByPlaceholderText('Create a password'), { target: { value: 'password123' } });

        fireEvent.click(screen.getByText('Create Account'));

        await waitFor(() => {
            expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(mockAuth, 'test@example.com', 'password123');
            expect(global.fetch).toHaveBeenCalledWith('/api/auth/session', expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({ idToken: 'fake-email-token' }),
            }));
        });
    });
});
