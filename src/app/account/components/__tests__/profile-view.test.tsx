import { render, screen, fireEvent } from '@testing-library/react';
import { ProfileView } from '../profile-view';
import '@testing-library/jest-dom';

// Mock hooks
const mockUpdateDoc = jest.fn();
const mockToast = jest.fn();

jest.mock('@/firebase/provider', () => ({
    useFirebase: () => ({
        user: { uid: 'test-user-123', email: 'test@example.com' },
        firestore: {},
    }),
}));

jest.mock('@/hooks/use-user', () => ({
    useUser: () => ({
        userData: {
            firstName: 'John',
            lastName: 'Doe',
            phone: '555-1234',
        },
        isLoading: false,
    }),
}));

jest.mock('firebase/firestore', () => ({
    doc: jest.fn(),
    updateDoc: (docRef: any, data: any) => mockUpdateDoc(docRef, data),
}));

jest.mock('@/hooks/use-toast', () => ({
    useToast: () => ({ toast: mockToast }),
}));

describe('ProfileView', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders user data correctly', () => {
        render(<ProfileView />);

        expect(screen.getByDisplayValue('John')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Doe')).toBeInTheDocument();
        expect(screen.getByDisplayValue('555-1234')).toBeInTheDocument();
        expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument(); // Email is read-only
    });

    it('calls updateDoc when saving changes', async () => {
        render(<ProfileView />);

        // Change first name
        fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Jane' } });

        // Click save
        fireEvent.click(screen.getByText(/save changes/i));

        expect(mockUpdateDoc).toHaveBeenCalledWith(
            undefined, // doc ref is mocked as undefined in simple mock above, but sufficient to check call
            expect.objectContaining({
                firstName: 'Jane',
                updatedAt: expect.any(Date)
            })
        );
    });
});
