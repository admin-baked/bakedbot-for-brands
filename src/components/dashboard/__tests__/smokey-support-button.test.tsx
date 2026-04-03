import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import SmokeyFloatingButton from '../smokey-support-button';

const mockUsePathname = jest.fn();
const mockUseUserRole = jest.fn();

jest.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}));

jest.mock('@/hooks/use-user-role', () => ({
  useUserRole: () => mockUseUserRole(),
}));

jest.mock('@/components/dashboard/smokey-support-panel', () => {
  return function SmokeySupportPanelMock() {
    return <div data-testid="smokey-support-panel">Support Panel</div>;
  };
});

jest.mock('@/components/help/help-search-enhanced', () => {
  return function HelpSearchEnhancedMock() {
    return <div data-testid="help-search-enhanced">Help Search</div>;
  };
});

jest.mock('@/components/dashboard/message-support-dialog', () => {
  return function MessageSupportDialogMock() {
    return null;
  };
});

describe('SmokeyFloatingButton route visibility regression', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    mockUseUserRole.mockReturnValue({ role: 'brand' });
  });

  it('shows help prompt on analytics page', () => {
    mockUsePathname.mockReturnValue('/dashboard/analytics');
    render(<SmokeyFloatingButton />);

    expect(screen.getByRole('button', { name: /Open Help & Setup/i })).toBeInTheDocument();
  });

  it('hides floating help button on menu page to avoid overlap with Smokey widget', () => {
    mockUsePathname.mockReturnValue('/dashboard/menu');
    const { container } = render(<SmokeyFloatingButton />);

    expect(container).toBeEmptyDOMElement();
  });

  it('hides floating help button on creative studio to avoid blocking schedule actions', () => {
    mockUsePathname.mockReturnValue('/dashboard/creative');
    const { container } = render(<SmokeyFloatingButton />);

    expect(container).toBeEmptyDOMElement();
  });

  it('keeps help prompt visible on mobile-like viewport for non-menu routes', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 390 });
    mockUsePathname.mockReturnValue('/dashboard/orders');
    render(<SmokeyFloatingButton />);

    expect(screen.getByRole('button', { name: /Open Help & Setup/i })).toBeInTheDocument();
  });
});
