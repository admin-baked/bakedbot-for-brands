import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DeleteConfirmationDialog } from '@/components/admin/delete-confirmation-dialog';

// Mock Radix AlertDialog to avoid issues with Portal/Overlay in JSDOM
jest.mock('@/components/ui/alert-dialog', () => ({
    AlertDialog: ({ children, open }: any) => open ? <div>{children}</div> : null,
    AlertDialogContent: ({ children }: any) => <div>{children}</div>,
    AlertDialogHeader: ({ children }: any) => <div>{children}</div>,
    AlertDialogFooter: ({ children }: any) => <div>{children}</div>,
    AlertDialogTitle: ({ children }: any) => <h2>{children}</h2>,
    AlertDialogDescription: ({ children }: any) => <div>{children}</div>,
    AlertDialogAction: ({ children, onClick, disabled }: any) => (
        <button onClick={onClick} disabled={disabled}>{children}</button>
    ),
    AlertDialogCancel: ({ children, onClick, disabled }: any) => (
        <button onClick={onClick} disabled={disabled}>{children}</button>
    ),
}));

// Mock icons
jest.mock('lucide-react', () => ({
    Loader2: () => <div data-testid="loader" />,
}));

describe('DeleteConfirmationDialog', () => {
    const mockOnOpenChange = jest.fn();
    const mockOnConfirm = jest.fn();

    const defaultProps = {
        open: true,
        onOpenChange: mockOnOpenChange,
        title: 'Delete User',
        description: 'Are you absolutely sure?',
        onConfirm: mockOnConfirm,
        itemName: 'John Doe',
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders with title, description, and item name', () => {
        render(<DeleteConfirmationDialog {...defaultProps} />);

        expect(screen.getByText('Delete User')).toBeInTheDocument();
        expect(screen.getByText('Are you absolutely sure?')).toBeInTheDocument();
        expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('disables confirm button by default', () => {
        render(<DeleteConfirmationDialog {...defaultProps} />);

        const deleteButton = screen.getByRole('button', { name: /Delete Permanently/i });
        expect(deleteButton).toBeDisabled();
    });

    it('enables confirm button when "DELETE" is typed', () => {
        render(<DeleteConfirmationDialog {...defaultProps} />);

        const input = screen.getByPlaceholderText('Type DELETE');
        fireEvent.change(input, { target: { value: 'DELETE' } });

        const deleteButton = screen.getByRole('button', { name: /Delete Permanently/i });
        expect(deleteButton).not.toBeDisabled();
    });

    it('calls onConfirm when confirm button is clicked', async () => {
        mockOnConfirm.mockResolvedValue(undefined);
        render(<DeleteConfirmationDialog {...defaultProps} />);

        const input = screen.getByPlaceholderText('Type DELETE');
        fireEvent.change(input, { target: { value: 'DELETE' } });

        const deleteButton = screen.getByRole('button', { name: /Delete Permanently/i });
        fireEvent.click(deleteButton);

        await waitFor(() => {
            expect(mockOnConfirm).toHaveBeenCalled();
            expect(mockOnOpenChange).toHaveBeenCalledWith(false);
        });
    });

    it('shows loading state during confirmation', async () => {
        let resolveConfirm: any;
        const confirmPromise = new Promise((resolve) => { resolveConfirm = resolve; });
        mockOnConfirm.mockReturnValue(confirmPromise);

        render(<DeleteConfirmationDialog {...defaultProps} />);

        const input = screen.getByPlaceholderText('Type DELETE');
        fireEvent.change(input, { target: { value: 'DELETE' } });

        const deleteButton = screen.getByRole('button', { name: /Delete Permanently/i });
        fireEvent.click(deleteButton);

        expect(screen.getByTestId('loader')).toBeInTheDocument();
        expect(screen.getByText('Deleting...')).toBeInTheDocument();
        expect(deleteButton).toBeDisabled();

        resolveConfirm();
    });

    it('clears input and calls onOpenChange when cancel is clicked', () => {
        render(<DeleteConfirmationDialog {...defaultProps} />);

        const input = screen.getByPlaceholderText('Type DELETE');
        fireEvent.change(input, { target: { value: 'DELETE' } });

        const cancelButton = screen.getByRole('button', { name: /Cancel/i });
        fireEvent.click(cancelButton);

        expect(mockOnOpenChange).toHaveBeenCalledWith(false);
        expect(input).toHaveValue('');
    });
});
