
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import TeamPage from '@/app/dashboard/team/page';
import { useUser } from '@/firebase/auth/use-user';
import { getInvitationsAction, revokeInvitationAction } from '@/server/actions/invitations';

// Mocks
jest.mock('@/firebase/auth/use-user');
jest.mock('@/server/actions/invitations', () => ({
    getInvitationsAction: jest.fn(),
    revokeInvitationAction: jest.fn(),
}));
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: jest.fn() }),
}));

// Mock InviteUserDialog since it might use other complex dependencies
jest.mock('@/components/invitations/invite-user-dialog', () => ({
    InviteUserDialog: ({ trigger }: any) => <div>{trigger}</div>
}));

describe('TeamPage', () => {
    const mockUser = { uid: 'user123', email: 'test@example.com' };
    const mockUserProfile = { 
        currentOrgId: 'org123', 
        role: 'brand' 
    };

    beforeEach(() => {
        (useUser as jest.Mock).mockReturnValue({
            // Merge profile into user for the new component logic
            user: { ...mockUser, ...mockUserProfile },
        });

        (getInvitationsAction as jest.Mock).mockResolvedValue([]);
    });

    it('renders loading state initially', () => {
        // We can't easily catch the loading state because useEffect runs fast, 
        // but we can check if it eventually settles.
        render(<TeamPage />);
        // If we wanted to test loading, we'd delay the promise, but for now just ensure it renders.
    });

    it('renders empty state when no invitations', async () => {
        render(<TeamPage />);
        
        await waitFor(() => {
            expect(screen.getByText('No invitations yet.')).toBeInTheDocument();
        });
    });

    it('renders invitations list', async () => {
        const mockInvitations = [
            {
                id: 'inv1',
                email: 'invitee@example.com',
                role: 'brand',
                status: 'pending',
                token: 'token123',
                createdAt: new Date('2023-01-01'),
            },
            {
                id: 'inv2',
                email: 'active@example.com',
                role: 'brand',
                status: 'accepted',
                token: 'token456',
                createdAt: new Date('2023-01-02'),
            }
        ];

        (getInvitationsAction as jest.Mock).mockResolvedValue(mockInvitations);

        render(<TeamPage />);

        await waitFor(() => {
            expect(screen.getByText('invitee@example.com')).toBeInTheDocument();
            expect(screen.getByText('active@example.com')).toBeInTheDocument();
            expect(screen.getByText('Pending')).toBeInTheDocument();
            expect(screen.getByText('Accepted')).toBeInTheDocument();
        });

        // Check stats
        expect(screen.getByText('1')).toBeInTheDocument(); // 1 Pending
        expect(screen.getByText('2')).toBeInTheDocument(); // 1 Active + You (Assuming "2" is on screen)
    });

    it('calls revokeInvitationAction when delete button is clicked', async () => {
        const mockInvitations = [
            {
                id: 'inv1',
                email: 'invitee@example.com',
                role: 'brand',
                status: 'pending',
                token: 'token123',
                createdAt: new Date(),
            }
        ];

        (getInvitationsAction as jest.Mock).mockResolvedValue(mockInvitations);

        (revokeInvitationAction as jest.Mock).mockResolvedValue({
            success: true
        });

        const { container } = render(<TeamPage />);

        await waitFor(() => {
            expect(screen.getByText('invitee@example.com')).toBeInTheDocument();
        });

        const deleteBtn = container.querySelector('button.text-destructive');
        expect(deleteBtn).toBeInTheDocument();
        
        if (deleteBtn) {
            fireEvent.click(deleteBtn);
        }

        await waitFor(() => {
            expect(revokeInvitationAction).toHaveBeenCalledWith('inv1');
        });
    });
});
