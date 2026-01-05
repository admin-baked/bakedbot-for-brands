
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BillingForm } from '@/app/dashboard/settings/components/billing-form';
import { useAcceptJs } from '@/hooks/useAcceptJs';

// Mock hook
const mockUseAcceptJs = jest.fn();
jest.mock('@/hooks/useAcceptJs', () => ({
  useAcceptJs: (...args: any[]) => mockUseAcceptJs(...args),
}));

// Mock toast
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

// Mock Logger
jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
  }
}));

// Mock plans
jest.mock('@/lib/plans', () => ({
  PLANS: {
    free: { id: 'free', name: 'Free', description: 'free', includedLocations: 1, amount: 0 },
    claim_pro: { id: 'claim_pro', name: 'Claim Pro', description: 'desc', includedLocations: 1, amount: 99 },
    enterprise: { id: 'enterprise', name: 'Enterprise', description: 'ent', includedLocations: 999, amount: 0 },
  },
  // Mock function to return non-zero for paid plans
  computeMonthlyAmount: (planId: string) => planId === 'free' ? 0 : 99,
  COVERAGE_PACKS: {},
}));

// Mock fetch
global.fetch = jest.fn();

describe('BillingForm', () => {
  const mockTokenizeCard = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAcceptJs.mockReturnValue({
      isLoaded: true,
      tokenizeCard: mockTokenizeCard,
      error: null,
    });
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
  });

  it('should block submission if payment library is not loaded', async () => {
    mockUseAcceptJs.mockReturnValue({
      isLoaded: false, // Not loaded
      tokenizeCard: mockTokenizeCard,
    });

    render(<BillingForm organizationId="org1" locationCount={1} />);
    
    // Select a paid plan (default is usually paid/claim_pro)
    
    const submitBtn = screen.getByRole('button', { name: /Update subscription/i });
    fireEvent.click(submitBtn);

    // Should not call tokenizeCard
    await waitFor(() => {
        expect(mockTokenizeCard).not.toHaveBeenCalled();
    });
  });

  it('should tokenize card and submit on valid input', async () => {
    mockTokenizeCard.mockResolvedValue({ dataDescriptor: 'desc', dataValue: 'val' });

    render(<BillingForm organizationId="org1" locationCount={1} />);

    // Fill inputs
    fireEvent.change(screen.getByTestId('card-input'), { target: { value: '4111222233334444' } });
    fireEvent.change(screen.getByTestId('expiry-input'), { target: { value: '1225' } });
    fireEvent.change(screen.getByTestId('cvv-input'), { target: { value: '123' } });

    const submitBtn = screen.getByRole('button', { name: /Update subscription/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockTokenizeCard).toHaveBeenCalled();
      expect(fetch).toHaveBeenCalledWith('/api/billing/authorize-net', expect.any(Object));
    });
  });
});
