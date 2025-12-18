import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BrandSetupTab from '@/app/dashboard/settings/components/brand-setup-tab';
import { setupBrandAndCompetitors } from '@/server/actions/brand-setup';
import { useToast } from '@/hooks/use-toast';

// Mock dependencies
jest.mock('@/server/actions/brand-setup', () => ({
    setupBrandAndCompetitors: jest.fn(),
}));

jest.mock('@/hooks/use-toast', () => ({
    useToast: jest.fn(),
}));

jest.mock('lucide-react', () => ({
    Loader2: () => <div data-testid="icon-loader" />,
    Store: () => <div data-testid="icon-store" />,
    Target: () => <div data-testid="icon-target" />,
    MapPin: () => <div data-testid="icon-map-pin" />,
    CheckCircle2: () => <div data-testid="icon-check-circle-2" />,
}));

describe('BrandSetupTab Component', () => {
    let mockToast: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        mockToast = jest.fn();
        (useToast as jest.Mock).mockReturnValue({ toast: mockToast });
    });

    it('renders the setup form initially', () => {
        render(<BrandSetupTab />);

        expect(screen.getByText('Brand Identity & Intel')).toBeInTheDocument();
        expect(screen.getByLabelText(/Brand Name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/ZIP Code/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Save & Discover Competitors/i })).toBeInTheDocument();
    });

    it('submits the form and displays success state', async () => {
        const mockResponse = {
            success: true,
            brandId: 'test-brand',
            competitors: [
                { id: 'c1', name: 'Competitor 1', city: 'Chicago', state: 'IL' }
            ]
        };
        (setupBrandAndCompetitors as jest.Mock).mockResolvedValue(mockResponse);

        render(<BrandSetupTab />);

        fireEvent.change(screen.getByLabelText(/Brand Name/i), { target: { value: 'Test Brand' } });
        fireEvent.change(screen.getByLabelText(/ZIP Code/i), { target: { value: '60601' } });
        fireEvent.click(screen.getByRole('button', { name: /Save & Discover Competitors/i }));

        await waitFor(() => {
            expect(setupBrandAndCompetitors).toHaveBeenCalled();
            expect(screen.getByText('Setup Complete')).toBeInTheDocument();
            expect(screen.getByText('test-brand')).toBeInTheDocument();
            expect(screen.getByText('Competitor 1')).toBeInTheDocument();
        });

        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
            title: "Brand Setup Complete"
        }));
    });

    it('displays error toast on failure', async () => {
        (setupBrandAndCompetitors as jest.Mock).mockResolvedValue({
            success: false,
            error: 'Invalid ZIP code'
        });

        render(<BrandSetupTab />);

        fireEvent.change(screen.getByLabelText(/Brand Name/i), { target: { value: 'Test Brand' } });
        fireEvent.change(screen.getByLabelText(/ZIP Code/i), { target: { value: '00000' } });
        fireEvent.click(screen.getByRole('button', { name: /Save & Discover Competitors/i }));

        await waitFor(() => {
            expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
                variant: "destructive",
                title: "Setup Failed",
                description: 'Invalid ZIP code'
            }));
        });
    });

    it('shows loading state during submission', async () => {
        (setupBrandAndCompetitors as jest.Mock).mockReturnValue(new Promise(() => { })); // Never resolves

        render(<BrandSetupTab />);

        fireEvent.change(screen.getByLabelText(/Brand Name/i), { target: { value: 'Test Brand' } });
        fireEvent.change(screen.getByLabelText(/ZIP Code/i), { target: { value: '60601' } });
        fireEvent.click(screen.getByRole('button', { name: /Save & Discover Competitors/i }));

        expect(screen.getByTestId('icon-loader')).toBeInTheDocument();
        expect(screen.getByText(/Analyzing Market/i)).toBeInTheDocument();
        expect(screen.getByRole('button')).toBeDisabled();
    });
});
