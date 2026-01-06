
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

// Mock UI components to avoid JSDOM issues
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div data-testid="card" className={className}>{children}</div>,
  CardHeader: ({ children }: any) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }: any) => <h3 data-testid="card-title">{children}</h3>,
  CardContent: ({ children }: any) => <div data-testid="card-content">{children}</div>
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>
}));

jest.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />
}));

jest.mock('@/components/ui/label', () => ({
  Label: (props: any) => <label {...props} />
}));

jest.mock('lucide-react', () => ({
    AlertCircle: () => <span>AlertIcon</span>,
    CreditCard: () => <span>CreditCardIcon</span>,
    Calendar: () => <span>CalendarIcon</span>,
    Lock: () => <span>LockIcon</span>,
    Check: () => <span>CheckIcon</span>
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


  it('displays payment system error when useAcceptJs reports an error', async () => {
    mockUseAcceptJs.mockReturnValue({
      isLoaded: true,
      error: 'Invalid Credentials',
      tokenizeCard: mockTokenizeCard,
    });

    render(<BillingForm organizationId="org1" locationCount={1} />);

    expect(screen.getByText('Payment System Error: Invalid Credentials')).toBeInTheDocument();
  });
});
