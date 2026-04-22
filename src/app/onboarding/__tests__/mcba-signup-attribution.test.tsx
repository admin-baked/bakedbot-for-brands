jest.mock('firebase-admin', () => ({
  auth: () => ({
    setCustomUserClaims: jest.fn(),
  }),
  firestore: () => ({
    collection: jest.fn(),
  }),
  credential: {
    cert: jest.fn(),
  },
  initializeApp: jest.fn(),
  getApps: jest.fn(() => []),
  apps: [],
}));

jest.mock('jwks-rsa', () => ({
  JwksClient: jest.fn(),
}));

jest.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    serverTimestamp: jest.fn(),
  },
}));

import { render, screen, waitFor } from '@testing-library/react';
import { useFirebase } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import { useSearchParams } from 'next/navigation';
import {
  MCBA_SIGNUP_CAMPAIGN,
  MCBA_SIGNUP_GRANT_KEY,
  MCBA_SIGNUP_SOURCE,
} from '@/lib/constants/mcba-power-hour-ama';

jest.mock('@/firebase/provider', () => ({
  useFirebase: jest.fn(),
}));

jest.mock('@/app/onboarding/actions', () => ({
  completeOnboarding: jest.fn(() => Promise.resolve({ message: 'Success', error: false })),
}));

jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(),
}));

jest.mock('firebase/auth', () => ({
  GoogleAuthProvider: jest.fn(),
  signInWithPopup: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn(),
}));

jest.mock('@/server/actions/cannmenus', () => ({
  searchCannMenusRetailers: jest.fn(),
}));

jest.mock('@/app/onboarding/components/competitor-onboarding-step', () => ({
  CompetitorOnboardingStep: () => null,
}));

jest.mock('@/app/dashboard/settings/link/components/wiring-screen', () => ({
  WiringScreen: () => null,
}));

jest.mock('@/app/onboarding/components/menu-import-step', () => ({
  MenuImportStep: () => null,
}));

import OnboardingPage from '@/app/onboarding/onboarding-client';

describe('MCBA onboarding attribution', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useFirebase as jest.Mock).mockReturnValue({ auth: { currentUser: null } });
    (useToast as jest.Mock).mockReturnValue({ toast: jest.fn() });
    (useSearchParams as jest.Mock).mockReturnValue(
      new URLSearchParams(
        `role=brand&brandId=cm_brand_123&brandName=MCBA%20Brand&source=${MCBA_SIGNUP_SOURCE}&campaign=${MCBA_SIGNUP_CAMPAIGN}&grant=${MCBA_SIGNUP_GRANT_KEY}`
      )
    );
  });

  it('preserves the MCBA campaign params as hidden inputs and shows the credit offer in review', async () => {
    const { container } = render(<OnboardingPage />);

    await waitFor(() => {
      expect(screen.getByText('Review & Finish')).toBeInTheDocument();
    });

    expect((container.querySelector('input[name="signupSource"]') as HTMLInputElement | null)?.value).toBe(
      MCBA_SIGNUP_SOURCE
    );
    expect((container.querySelector('input[name="signupCampaign"]') as HTMLInputElement | null)?.value).toBe(
      MCBA_SIGNUP_CAMPAIGN
    );
    expect(
      (container.querySelector('input[name="signupCreditGrantKey"]') as HTMLInputElement | null)?.value
    ).toBe(MCBA_SIGNUP_GRANT_KEY);
    expect((container.querySelector('input[name="primaryGoal"]') as HTMLInputElement | null)?.value).toBe(
      'creative_center'
    );

    expect(screen.getByText('Campaign Offer')).toBeInTheDocument();
    expect(screen.getByText('150 free AI credits')).toBeInTheDocument();
    expect(screen.getByText('What happens next')).toBeInTheDocument();
  });
});
