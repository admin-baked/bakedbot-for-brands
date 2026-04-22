import { render, screen, fireEvent } from '@testing-library/react';
import OnboardingPage from '@/app/onboarding/onboarding-client';
import { useFirebase } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';

// Mock dependencies
jest.mock('@/firebase/provider', () => ({
  useFirebase: jest.fn(),
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}));

// Mock server actions
jest.mock('@/app/onboarding/actions', () => ({
  completeOnboarding: jest.fn(),
}));

jest.mock('@/server/actions/cannmenus', () => ({
  searchCannMenusRetailers: jest.fn(),
}));

describe('Onboarding Role Selection', () => {
  beforeEach(() => {
    (useFirebase as jest.Mock).mockReturnValue({ auth: { currentUser: null } });
    (useToast as jest.Mock).mockReturnValue({ toast: jest.fn() });
  });

  it('renders the role selection screen correctly', () => {
    render(<OnboardingPage />);

    // Check for main title
    expect(screen.getByText('Welcome to BakedBot')).toBeInTheDocument();

    // Check for role buttons
    expect(screen.getByText('Brand')).toBeInTheDocument();
    expect(screen.getByText('Dispensary')).toBeInTheDocument();
    expect(screen.getByText('Customer')).toBeInTheDocument();

    // Check for skip button
    expect(screen.getByText(/Skip setup for now/i)).toBeInTheDocument();
  });

  it('allows selecting a role', () => {
    render(<OnboardingPage />);
    
    // Click Brand
    fireEvent.click(screen.getByText('Brand'));
    
    // Should move to market selection (checking for text that appears in market step)
    expect(screen.getByText('Where do you operate?')).toBeInTheDocument();
  });
});
