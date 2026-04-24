import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import { UpgradeModal } from '@/components/billing/upgrade-modal';
import { upgradeSubscription } from '@/server/actions/subscription';

jest.mock('@/server/actions/subscription', () => ({
  upgradeSubscription: jest.fn(),
}));

jest.mock('lucide-react', () => ({
  CheckCircle: () => <span data-testid="check-circle">ok</span>,
  AlertCircle: () => <span data-testid="alert-circle">warn</span>,
  Loader2: () => <span data-testid="loader">loading</span>,
}));

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: React.ReactNode;
};

type DivProps = React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
};

type TextProps = {
  children: React.ReactNode;
};

type DialogProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
};

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: ButtonProps) => <button {...props}>{children}</button>,
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: DivProps) => (
    <div data-testid="card" {...props}>
      {children}
    </div>
  ),
  CardContent: ({ children, ...props }: DivProps) => <div {...props}>{children}</div>,
  CardDescription: ({ children }: TextProps) => <p>{children}</p>,
  CardHeader: ({ children, ...props }: DivProps) => <div {...props}>{children}</div>,
  CardTitle: ({ children }: TextProps) => <h3>{children}</h3>,
}));

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, children }: DialogProps) => (open ? <div data-testid="dialog">{children}</div> : null),
  DialogContent: ({ children, ...props }: DivProps) => <div {...props}>{children}</div>,
  DialogDescription: ({ children }: TextProps) => <p>{children}</p>,
  DialogHeader: ({ children, ...props }: DivProps) => <div {...props}>{children}</div>,
  DialogTitle: ({ children }: TextProps) => <h2>{children}</h2>,
}));

const mockedUpgradeSubscription = upgradeSubscription as jest.MockedFunction<typeof upgradeSubscription>;

describe('UpgradeModal', () => {
  const mockOnClose = jest.fn();
  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    orgId: 'org_test',
    currentTierId: 'pro' as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('renders nothing when the modal is closed', () => {
    const { queryByTestId } = render(<UpgradeModal {...defaultProps} isOpen={false} />);

    expect(queryByTestId('dialog')).not.toBeInTheDocument();
  });

  it('shows the current plan and available upgrades for a pro user', () => {
    render(<UpgradeModal {...defaultProps} />);

    expect(screen.getByText('Upgrade Your Plan')).toBeInTheDocument();
    expect(screen.getByText('Current Plan')).toBeInTheDocument();
    expect(screen.getByText('Pro')).toBeInTheDocument();
    expect(screen.getByText('Growth')).toBeInTheDocument();
    expect(screen.getByText('Empire')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  });

  it('shows a highest-tier notice for empire users', () => {
    render(<UpgradeModal {...defaultProps} currentTierId="empire" />);

    expect(screen.getByText(/already on the highest tier available/i)).toBeInTheDocument();
  });

  it('moves to the confirmation step after selecting a tier', async () => {
    render(<UpgradeModal {...defaultProps} />);

    fireEvent.click(screen.getByText('Growth'));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByText('Confirm Upgrade')).toBeInTheDocument();
    expect(screen.getByText(/Billing Note:/i)).toBeInTheDocument();
    expect(screen.getByText('New Monthly Amount')).toBeInTheDocument();
    expect(screen.getAllByText('$349/month')).toHaveLength(2);
  });

  it('shows an error and stays on confirm when the upgrade action fails', async () => {
    mockedUpgradeSubscription.mockResolvedValueOnce({
      success: false,
      error: 'Payment processing failed',
    });

    render(<UpgradeModal {...defaultProps} />);

    fireEvent.click(screen.getByText('Growth'));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByText('Confirm Upgrade')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Upgrade to Growth' }));

    expect(await screen.findByText('Payment processing failed')).toBeInTheDocument();
    expect(screen.getByText('Confirm Upgrade')).toBeInTheDocument();
  });

  it('shows success details and auto-closes after a successful upgrade', async () => {
    jest.useFakeTimers();

    mockedUpgradeSubscription.mockResolvedValueOnce({
      success: true,
      newAmount: 349,
    });

    render(<UpgradeModal {...defaultProps} />);

    fireEvent.click(screen.getByText('Growth'));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByText('Confirm Upgrade')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Upgrade to Growth' }));

    expect(await screen.findByText('Upgrade Successful!')).toBeInTheDocument();
    expect(screen.getByTestId('check-circle')).toBeInTheDocument();
    expect(screen.getByText('New Plan')).toBeInTheDocument();
    expect(screen.getByText('Growth')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(4000);
    });

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('resets selection state after the modal is closed and reopened', async () => {
    const { rerender } = render(<UpgradeModal {...defaultProps} />);

    fireEvent.click(screen.getByText('Growth'));
    expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled();

    rerender(<UpgradeModal {...defaultProps} isOpen={false} />);
    rerender(<UpgradeModal {...defaultProps} isOpen />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
    });
  });

  it('calls onClose when the cancel button is clicked', () => {
    render(<UpgradeModal {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});
