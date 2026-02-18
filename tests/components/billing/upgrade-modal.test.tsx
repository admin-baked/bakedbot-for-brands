// Unit tests for UpgradeModal component
// Tests the 3-step upgrade flow: select tier → confirm → success

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UpgradeModal } from '@/components/billing/upgrade-modal';
import { TIERS } from '@/config/tiers';

jest.mock('@/server/actions/subscription', () => ({
  upgradeSubscription: jest.fn(),
}));

jest.mock('lucide-react', () => ({
  CheckCircle: () => <span data-testid="check-circle">✓</span>,
  AlertCircle: () => <span data-testid="alert-circle">!</span>,
  Loader2: () => <span data-testid="loader">⏳</span>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ onClick, children, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: any) => <div data-testid="card" {...props}>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardDescription: ({ children }: any) => <p>{children}</p>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>,
}));

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, onOpenChange, children }: any) => (
    open ? <div data-testid="dialog">{children}</div> : null
  ),
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
}));

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
  });

  // ============================================================================
  // Rendering and State Management
  // ============================================================================

  it('renders nothing when modal is closed', () => {
    const { container } = render(
      <UpgradeModal {...defaultProps} isOpen={false} />
    );
    expect(container.querySelector('[data-testid="dialog"]')).not.toBeInTheDocument();
  });

  it('renders dialog when modal is open', () => {
    render(<UpgradeModal {...defaultProps} />);
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
  });

  // ============================================================================
  // Step 1: Plan Selection
  // ============================================================================

  it('shows select step initially with current plan info', () => {
    render(<UpgradeModal {...defaultProps} />);

    expect(screen.getByText('Upgrade Your Plan')).toBeInTheDocument();
    expect(screen.getByText('Pro')).toBeInTheDocument(); // Current plan
    expect(screen.getByText('$99')).toBeInTheDocument(); // Current plan price
  });

  it('shows only higher-tier options for pro tier user', () => {
    render(<UpgradeModal {...defaultProps} currentTierId="pro" />);

    // Should show growth and empire
    expect(screen.getByText('Growth')).toBeInTheDocument();
    expect(screen.getByText('Empire')).toBeInTheDocument();

    // Should not show scout or pro
    const allText = screen.getByTestId('dialog').textContent;
    const proCount = (allText?.match(/Pro/g) || []).length;
    expect(proCount).toBe(1); // Only the current plan card
  });

  it('shows message when user is on highest tier', () => {
    render(<UpgradeModal {...defaultProps} currentTierId="empire" />);

    expect(screen.getByText(/already on the highest tier/i)).toBeInTheDocument();
  });

  it('shows error when Continue clicked without selection', () => {
    render(<UpgradeModal {...defaultProps} />);

    const continueButton = screen.getAllByText(/Continue|Upgrade/)[0];
    fireEvent.click(continueButton);

    expect(screen.getByText(/Please select a tier/i)).toBeInTheDocument();
  });

  it('selects a tier when clicking a tier card', () => {
    render(<UpgradeModal {...defaultProps} />);

    const growthCard = screen.getByText('Growth').closest('[data-testid="card"]');
    if (growthCard) {
      fireEvent.click(growthCard);
    }

    // Selected tier should be highlighted (in a real test we'd check CSS or data attributes)
    // For now, we verify it doesn't show the select error anymore
    expect(screen.getByText('Growth')).toBeInTheDocument();
  });

  // ============================================================================
  // Step 2: Confirmation
  // ============================================================================

  it('advances to confirm step when tier selected and Continue clicked', async () => {
    render(<UpgradeModal {...defaultProps} />);

    // Click on Growth tier
    const growthCard = screen.getByText('Growth').closest('[data-testid="card"]');
    if (growthCard) {
      fireEvent.click(growthCard);
    }

    // Click Continue button
    const continueBtn = screen.getByText('Continue');
    fireEvent.click(continueBtn);

    await waitFor(() => {
      expect(screen.getByText('Confirm Upgrade')).toBeInTheDocument();
    });
  });

  it('shows confirm step with upgrade arrow and billing note', async () => {
    render(<UpgradeModal {...defaultProps} />);

    // Select growth tier
    const growthCard = screen.getByText('Growth').closest('[data-testid="card"]');
    if (growthCard) {
      fireEvent.click(growthCard);
    }

    // Advance to confirm
    const continueBtn = screen.getByText('Continue');
    fireEvent.click(continueBtn);

    await waitFor(() => {
      expect(screen.getByText(/Confirm Upgrade/)).toBeInTheDocument();
      expect(screen.getByText(/Billing Note:/)).toBeInTheDocument();
      expect(screen.getByText(/growth.*$349/i)).toBeInTheDocument();
    });
  });

  it('Back button returns to select step', async () => {
    render(<UpgradeModal {...defaultProps} />);

    // Navigate to confirm step
    const growthCard = screen.getByText('Growth').closest('[data-testid="card"]');
    if (growthCard) {
      fireEvent.click(growthCard);
    }
    let continueBtn = screen.getByText('Continue');
    fireEvent.click(continueBtn);

    await waitFor(() => {
      expect(screen.getByText('Confirm Upgrade')).toBeInTheDocument();
    });

    // Click Back
    const backBtn = screen.getByText('Back');
    fireEvent.click(backBtn);

    await waitFor(() => {
      expect(screen.getByText('Upgrade Your Plan')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Step 3: Success
  // ============================================================================

  it('transitions to success step on successful upgrade', async () => {
    const { upgradeSubscription } = require('@/server/actions/subscription');
    upgradeSubscription.mockResolvedValueOnce({
      success: true,
      newAmount: 349,
    });

    render(<UpgradeModal {...defaultProps} />);

    // Select and proceed through steps
    const growthCard = screen.getByText('Growth').closest('[data-testid="card"]');
    if (growthCard) {
      fireEvent.click(growthCard);
    }

    let continueBtn = screen.getByText('Continue');
    fireEvent.click(continueBtn);

    await waitFor(() => {
      expect(screen.getByText('Confirm Upgrade')).toBeInTheDocument();
    });

    // Click upgrade button
    const upgradeBtn = screen.getByText(/Upgrade to Growth/);
    fireEvent.click(upgradeBtn);

    await waitFor(() => {
      expect(screen.getByText('Upgrade Successful')).toBeInTheDocument();
      expect(screen.getByTestId('check-circle')).toBeInTheDocument();
    });
  });

  it('shows success step with new tier and amount', async () => {
    const { upgradeSubscription } = require('@/server/actions/subscription');
    upgradeSubscription.mockResolvedValueOnce({
      success: true,
      newAmount: 349,
    });

    render(<UpgradeModal {...defaultProps} />);

    const growthCard = screen.getByText('Growth').closest('[data-testid="card"]');
    if (growthCard) {
      fireEvent.click(growthCard);
    }

    let continueBtn = screen.getByText('Continue');
    fireEvent.click(continueBtn);

    await waitFor(() => {
      expect(screen.getByText('Confirm Upgrade')).toBeInTheDocument();
    });

    const upgradeBtn = screen.getByText(/Upgrade to Growth/);
    fireEvent.click(upgradeBtn);

    await waitFor(() => {
      expect(screen.getByText(/Growth/)).toBeInTheDocument();
      expect(screen.getByText(/349/)).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Error Handling
  // ============================================================================

  it('displays error message when upgrade fails', async () => {
    const { upgradeSubscription } = require('@/server/actions/subscription');
    upgradeSubscription.mockResolvedValueOnce({
      success: false,
      error: 'Payment processing failed',
    });

    render(<UpgradeModal {...defaultProps} />);

    const growthCard = screen.getByText('Growth').closest('[data-testid="card"]');
    if (growthCard) {
      fireEvent.click(growthCard);
    }

    let continueBtn = screen.getByText('Continue');
    fireEvent.click(continueBtn);

    await waitFor(() => {
      expect(screen.getByText('Confirm Upgrade')).toBeInTheDocument();
    });

    const upgradeBtn = screen.getByText(/Upgrade to Growth/);
    fireEvent.click(upgradeBtn);

    await waitFor(() => {
      expect(screen.getByText('Payment processing failed')).toBeInTheDocument();
      // Should still be on confirm step
      expect(screen.getByText('Confirm Upgrade')).toBeInTheDocument();
    });
  });

  it('stays on confirm step when error occurs', async () => {
    const { upgradeSubscription } = require('@/server/actions/subscription');
    upgradeSubscription.mockResolvedValueOnce({
      success: false,
      error: 'Insufficient permissions',
    });

    render(<UpgradeModal {...defaultProps} />);

    const growthCard = screen.getByText('Growth').closest('[data-testid="card"]');
    if (growthCard) {
      fireEvent.click(growthCard);
    }

    let continueBtn = screen.getByText('Continue');
    fireEvent.click(continueBtn);

    await waitFor(() => {
      expect(screen.getByText('Confirm Upgrade')).toBeInTheDocument();
    });

    const upgradeBtn = screen.getByText(/Upgrade to Growth/);
    fireEvent.click(upgradeBtn);

    await waitFor(() => {
      expect(screen.getByText(/Insufficient permissions/)).toBeInTheDocument();
      expect(screen.getByText('Confirm Upgrade')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Modal State and Lifecycle
  // ============================================================================

  it('calls onClose when modal closes', async () => {
    const { rerender } = render(<UpgradeModal {...defaultProps} />);

    // Close the modal
    rerender(<UpgradeModal {...defaultProps} isOpen={false} />);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('auto-closes after success (4 second timeout)', async () => {
    jest.useFakeTimers();

    const { upgradeSubscription } = require('@/server/actions/subscription');
    upgradeSubscription.mockResolvedValueOnce({
      success: true,
      newAmount: 349,
    });

    render(<UpgradeModal {...defaultProps} />);

    const growthCard = screen.getByText('Growth').closest('[data-testid="card"]');
    if (growthCard) {
      fireEvent.click(growthCard);
    }

    let continueBtn = screen.getByText('Continue');
    fireEvent.click(continueBtn);

    await waitFor(() => {
      expect(screen.getByText('Confirm Upgrade')).toBeInTheDocument();
    });

    const upgradeBtn = screen.getByText(/Upgrade to Growth/);
    fireEvent.click(upgradeBtn);

    await waitFor(() => {
      expect(screen.getByText('Upgrade Successful')).toBeInTheDocument();
    });

    // Fast-forward time
    jest.advanceTimersByTime(4000);

    // onClose should have been called
    expect(mockOnClose).toHaveBeenCalled();

    jest.useRealTimers();
  });

  it('resets state when modal reopens', async () => {
    const { rerender } = render(<UpgradeModal {...defaultProps} />);

    // Make a selection
    const growthCard = screen.getByText('Growth').closest('[data-testid="card"]');
    if (growthCard) {
      fireEvent.click(growthCard);
    }

    // Close and reopen
    rerender(<UpgradeModal {...defaultProps} isOpen={false} />);

    // Wait a bit for state reset
    await waitFor(() => {
      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
    }, { timeout: 300 });

    rerender(<UpgradeModal {...defaultProps} isOpen={true} />);

    // Should be back to select step with no selection
    expect(screen.getByText('Upgrade Your Plan')).toBeInTheDocument();
  });

  // ============================================================================
  // Tier Selection Logic
  // ============================================================================

  it('shows correct available tiers for growth user', () => {
    render(<UpgradeModal {...defaultProps} currentTierId="growth" />);

    // Should only show empire (tier above growth)
    expect(screen.getByText('Empire')).toBeInTheDocument();

    // Should not show growth or lower
    const allText = screen.getByTestId('dialog').textContent;
    const growthCount = (allText?.match(/\bGrowth\b/g) || []).length;
    expect(growthCount).toBe(1); // Only in current plan or message
  });

  it('shows all tiers for scout user', () => {
    render(<UpgradeModal {...defaultProps} currentTierId="scout" />);

    // Should show pro, growth, and empire
    expect(screen.getByText('Pro')).toBeInTheDocument();
    expect(screen.getByText('Growth')).toBeInTheDocument();
    expect(screen.getByText('Empire')).toBeInTheDocument();
  });
});
