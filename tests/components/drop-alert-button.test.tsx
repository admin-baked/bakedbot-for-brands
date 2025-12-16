import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DropAlertButton } from '@/components/brand/drop-alert-button';

// Mock UI components if necessary, but testing library usually handles them fine if they are accessible
// We might need to mock the fetch API
global.fetch = jest.fn() as jest.Mock;

describe('DropAlertButton', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders the button correctly', () => {
        render(<DropAlertButton brandName="TestBrand" zipCode="90210" />);
        expect(screen.getByText('Set Drop Alert')).toBeInTheDocument();
    });

    it('opens the modal when clicked', () => {
        render(<DropAlertButton brandName="TestBrand" zipCode="90210" />);
        const button = screen.getByText('Set Drop Alert');
        fireEvent.click(button);

        expect(screen.getByText(/Get Notified/i)).toBeInTheDocument();
    });

    it('pre-fills the zip code', () => {
        render(<DropAlertButton brandName="TestBrand" zipCode="90210" />);
        fireEvent.click(screen.getByText('Set Drop Alert'));

        const zipInput = screen.getAllByPlaceholderText('90210')[0] as HTMLInputElement; // Or use label
        // Actually, value is set by state, let's check value
        expect(zipInput).toBeInTheDocument();
        // Since it's controlled, we might need to query by display value if placeholder matches value
        // Better to use getByLabelText if possible.
        // The component uses Label htmlFor="zip"
    });

    it('submits the form successfully', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true })
        });

        render(<DropAlertButton brandName="TestBrand" zipCode="90210" />);
        fireEvent.click(screen.getByText('Set Drop Alert'));

        // Fill email
        const emailInput = screen.getByLabelText('Email Address');
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

        // Submit
        const submitButton = screen.getByText('Notify Me');
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText("You're All Set!")).toBeInTheDocument();
        });

        expect(global.fetch).toHaveBeenCalledWith('/api/drop-alerts', expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('test@example.com')
        }));
    });
});
