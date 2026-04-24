import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import PaymentConfigPage from '@/app/dashboard/admin/payment-config/page';
import * as paymentActions from '@/server/actions/payment-config';

jest.mock('@/server/actions/payment-config');

const mockReplace = jest.fn();
const mockToast = jest.fn();
let currentMethod = 'overview';

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(() => '/dashboard/admin/payment-config'),
  useRouter: jest.fn(() => ({
    replace: mockReplace,
  })),
  useSearchParams: jest.fn(() => ({
    get: (key: string) => (key === 'method' ? currentMethod : null),
  })),
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn(() => ({
    toast: mockToast,
  })),
}));

type MockTabsProps = {
  children: React.ReactNode;
  value: string;
  onValueChange?: (value: string) => void;
};

type MockTabsChildProps = {
  children: React.ReactNode;
  value: string;
};

type MockSwitchProps = {
  checked?: boolean;
  disabled?: boolean;
  onCheckedChange?: (checked: boolean) => void;
};

jest.mock('@/components/ui/tabs', () => {
  const React = require('react');
  const TabsContext = React.createContext<{
    value: string;
    onValueChange?: (value: string) => void;
  }>({
    value: 'overview',
  });

  return {
    Tabs: ({ children, value, onValueChange }: MockTabsProps) => (
      <TabsContext.Provider value={{ value, onValueChange }}>
        <div>{children}</div>
      </TabsContext.Provider>
    ),
    TabsList: ({ children }: { children: React.ReactNode }) => <div role="tablist">{children}</div>,
    TabsTrigger: ({ children, value }: MockTabsChildProps) => {
      const context = React.useContext(TabsContext);
      const selected = context.value === value;

      return (
        <button
          aria-selected={selected}
          role="tab"
          type="button"
          onClick={() => context.onValueChange?.(value)}
        >
          {children}
        </button>
      );
    },
    TabsContent: ({ children, value }: MockTabsChildProps) => {
      const context = React.useContext(TabsContext);

      if (context.value !== value) {
        return null;
      }

      return <div role="tabpanel">{children}</div>;
    },
  };
});

jest.mock('@/components/ui/switch', () => ({
  Switch: ({ checked = false, disabled = false, onCheckedChange }: MockSwitchProps) => (
    <button
      aria-checked={checked}
      disabled={disabled}
      role="switch"
      type="button"
      onClick={() => onCheckedChange?.(!checked)}
    />
  ),
}));

const mockPaymentActions = paymentActions as jest.Mocked<typeof paymentActions>;

const mockPaymentConfig = {
  enabledMethods: ['dispensary_direct', 'cannpay'],
  defaultMethod: undefined,
  cannpay: {
    enabled: true,
    integratorId: 'test123',
    environment: 'sandbox' as const,
  },
  aeropay: {
    enabled: false,
    merchantId: 'merchant_123',
    environment: 'sandbox' as const,
  },
};

describe('PaymentConfigPage', () => {
  beforeEach(() => {
    currentMethod = 'overview';
    jest.clearAllMocks();

    mockPaymentActions.getCurrentUserLocationId.mockResolvedValue({
      success: true,
      locationId: 'loc_123',
    });

    mockPaymentActions.getPaymentConfig.mockResolvedValue({
      success: true,
      data: mockPaymentConfig,
    });

    mockPaymentActions.updatePaymentMethod.mockResolvedValue({
      success: true,
    });
  });

  it('loads payment config for the current location and renders the overview tab', async () => {
    render(<PaymentConfigPage />);

    expect(await screen.findByRole('heading', { name: 'Payment Configuration' })).toBeInTheDocument();

    await waitFor(() => {
      expect(mockPaymentActions.getCurrentUserLocationId).toHaveBeenCalledTimes(1);
      expect(mockPaymentActions.getPaymentConfig).toHaveBeenCalledWith('loc_123');
    });

    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Payment Method Comparison')).toBeInTheDocument();
    expect(screen.getByText('CannPay RemotePay')).toBeInTheDocument();
    expect(screen.getByText('Aeropay Inc.')).toBeInTheDocument();
  });

  it('shows a destructive toast when the user has no accessible location', async () => {
    mockPaymentActions.getCurrentUserLocationId.mockResolvedValueOnce({
      success: false,
      error: 'User not authenticated',
    });

    render(<PaymentConfigPage />);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'destructive',
          title: 'Error',
          description: 'User not authenticated',
        }),
      );
    });

    expect(mockPaymentActions.getPaymentConfig).not.toHaveBeenCalled();
  });

  it('switches tabs and syncs the method query param when a tab is clicked', async () => {
    render(<PaymentConfigPage />);

    await screen.findByRole('heading', { name: 'Payment Configuration' });

    fireEvent.click(screen.getByRole('tab', { name: 'Smokey Pay' }));

    expect(mockReplace).toHaveBeenCalledWith('/dashboard/admin/payment-config?method=smokey-pay', {
      scroll: false,
    });
    expect(screen.getByText('Enable Smokey Pay')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Aeropay' }));

    expect(mockReplace).toHaveBeenCalledWith('/dashboard/admin/payment-config?method=aeropay', {
      scroll: false,
    });
    expect(screen.getByText('Enable Aeropay')).toBeInTheDocument();
  });

  it('toggles Smokey Pay and reloads the config after a successful update', async () => {
    currentMethod = 'smokey-pay';

    render(<PaymentConfigPage />);

    const smokeyPaySwitch = await screen.findByRole('switch');

    fireEvent.click(smokeyPaySwitch);

    await waitFor(() => {
      expect(mockPaymentActions.updatePaymentMethod).toHaveBeenCalledWith({
        locationId: 'loc_123',
        method: 'cannpay',
        enabled: false,
      });
    });

    await waitFor(() => {
      expect(mockPaymentActions.getPaymentConfig).toHaveBeenCalledTimes(2);
    });

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Success',
        description: 'Smokey Pay disabled successfully',
      }),
    );
  });

  it('shows a destructive toast when a payment method update fails', async () => {
    currentMethod = 'aeropay';

    mockPaymentActions.updatePaymentMethod.mockResolvedValueOnce({
      success: false,
      error: 'Failed to update payment method',
    });

    render(<PaymentConfigPage />);

    const aeropaySwitch = await screen.findByRole('switch');

    fireEvent.click(aeropaySwitch);

    await waitFor(() => {
      expect(mockPaymentActions.updatePaymentMethod).toHaveBeenCalledWith({
        locationId: 'loc_123',
        method: 'aeropay',
        enabled: true,
      });
    });

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: 'destructive',
        title: 'Update Failed',
        description: 'Failed to update payment method',
      }),
    );
    expect(mockPaymentActions.getPaymentConfig).toHaveBeenCalledTimes(1);
  });
});
