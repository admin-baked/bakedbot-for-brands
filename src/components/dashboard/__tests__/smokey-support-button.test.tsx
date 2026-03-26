import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SmokeyFloatingButton from '../smokey-support-button';

const mockUsePathname = jest.fn();
const mockUseSearchParams = jest.fn();
const mockUseUserRole = jest.fn();
const mockLoggerInfo = jest.fn();

jest.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
  useSearchParams: () => mockUseSearchParams(),
}));

jest.mock('@/hooks/use-user-role', () => ({
  useUserRole: () => mockUseUserRole(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: (...args: unknown[]) => mockLoggerInfo(...args),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/components/dashboard/smokey-support-panel', () => {
  return function SmokeySupportPanelMock() {
    return <div data-testid="smokey-support-panel">Support Panel</div>;
  };
});

jest.mock('@/components/dashboard/smokey-support-onboarding', () => {
  return function SmokeySupportOnboardingMock() {
    return <div data-testid="smokey-support-onboarding">Support Onboarding</div>;
  };
});

jest.mock('@/components/help/help-search-enhanced', () => {
  return function HelpSearchEnhancedMock() {
    return <div data-testid="help-search-enhanced">Help Search</div>;
  };
});

describe('SmokeyFloatingButton route visibility regression', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    window.sessionStorage.clear();
    mockUseSearchParams.mockReturnValue(new URLSearchParams());
    mockUseUserRole.mockReturnValue({ role: 'brand' });
  });

  it('shows the onboarding teaser on non-blocked routes for first-run users', () => {
    mockUsePathname.mockReturnValue('/dashboard/analytics');
    render(<SmokeyFloatingButton />);

    expect(screen.getByText(/New here\? Start your 2-minute tour ->/i)).toBeInTheDocument();
  });

  it('renders onboarding instead of the support home when first-run users click the FAB', () => {
    mockUsePathname.mockReturnValue('/dashboard/analytics');
    render(<SmokeyFloatingButton />);

    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByTestId('smokey-support-onboarding')).toBeInTheDocument();
  });

  it('renders the support home for completed users when they click the FAB', () => {
    window.localStorage.setItem(
      'smokey-support-onboarding',
      JSON.stringify({
        version: 1,
        status: 'completed',
        currentStepId: 'mission',
        selectedGoalId: 'launch',
        completedAt: '2026-03-26T12:00:00.000Z',
        skippedAt: null,
      }),
    );
    mockUsePathname.mockReturnValue('/dashboard/analytics');
    render(<SmokeyFloatingButton />);

    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByTestId('smokey-support-panel')).toBeInTheDocument();
  });

  it('forces onboarding from the smokeySupport query param even for completed users', async () => {
    window.localStorage.setItem(
      'smokey-support-onboarding',
      JSON.stringify({
        version: 1,
        status: 'completed',
        currentStepId: 'mission',
        selectedGoalId: 'launch',
        completedAt: '2026-03-26T12:00:00.000Z',
        skippedAt: null,
      }),
    );
    mockUsePathname.mockReturnValue('/dashboard/analytics');
    mockUseSearchParams.mockReturnValue(new URLSearchParams('smokeySupport=reset'));
    render(<SmokeyFloatingButton />);

    await waitFor(() => {
      expect(screen.getByTestId('smokey-support-onboarding')).toBeInTheDocument();
    });

    expect(JSON.parse(window.localStorage.getItem('smokey-support-onboarding') ?? '{}')).toMatchObject({
      status: 'not_started',
      currentStepId: 'welcome',
      selectedGoalId: null,
    });
  });

  it('hides the floating help button on menu pages even when onboarding is pending', () => {
    mockUsePathname.mockReturnValue('/dashboard/menu');
    const { container } = render(<SmokeyFloatingButton />);

    expect(container).toBeEmptyDOMElement();
  });

  it('keeps the onboarding teaser visible on mobile-like viewports for non-blocked routes', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 390 });
    mockUsePathname.mockReturnValue('/dashboard/orders');
    render(<SmokeyFloatingButton />);

    expect(screen.getByText(/New here\? Start your 2-minute tour ->/i)).toBeInTheDocument();
  });
});
