import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { VisitorCheckinCard } from '../visitor-checkin-card';
import {
  captureVisitorCheckin,
  getVisitorCheckinContext,
} from '@/server/actions/visitor-checkin';
import { getMoodRecommendations } from '@/server/actions/loyalty-tablet';

jest.mock('@/server/actions/visitor-checkin', () => ({
  captureVisitorCheckin: jest.fn(),
  getVisitorCheckinContext: jest.fn(),
}));

jest.mock('@/server/actions/loyalty-tablet', () => ({
  getMoodRecommendations: jest.fn(),
}));

jest.mock('@/lib/checkin/loyalty-tablet-shared', () => {
  const moods = [
    { id: 'relaxed', emoji: '😌', label: 'Relaxed & Calm', context: 'calm' },
    { id: 'social', emoji: '🎉', label: 'Social & Happy', context: 'social' },
  ];

  return {
    TABLET_MOODS: moods,
    getTabletMoodById: (moodId: string | null | undefined) => moods.find((mood) => mood.id === moodId) ?? null,
  };
});

jest.mock('@/components/chatbot', () => ({
  __esModule: true,
  default: () => <div data-testid="smokey-widget">Smokey Widget</div>,
}));

describe('VisitorCheckinCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getVisitorCheckinContext as jest.Mock).mockResolvedValue({
      success: true,
      isReturningCustomer: false,
      enrichmentMode: 'email',
    });
    (getMoodRecommendations as jest.Mock).mockResolvedValue({
      success: true,
      products: [
        {
          productId: 'prod_1',
          name: 'Blue Dream Pre-Roll',
          price: 12,
          category: 'Pre-Rolls',
          reason: 'Great for staying light and upbeat.',
        },
      ],
      bundle: {
        name: 'Easy Entry',
        tagline: 'A simple mood-matching combo',
        products: [
          { productId: 'prod_1', name: 'Blue Dream Pre-Roll', price: 12, category: 'Pre-Rolls', reason: 'Great for staying light and upbeat.' },
          { productId: 'prod_2', name: 'Berry Gummies', price: 18, category: 'Edibles', reason: 'Smooth landing.' },
        ],
        totalPrice: 30,
      },
    });
  });

  function renderCard() {
    render(
      <VisitorCheckinCard
        orgId="org_thrive_syracuse"
        brandName="Thrive Syracuse"
        brandSlug="thrivesyracuse"
        primaryColor="#16a34a"
      />,
    );
  }

  async function moveToStepTwo() {
    fireEvent.change(screen.getByLabelText('First name'), { target: { value: 'Jane' } });
    fireEvent.change(screen.getByLabelText('Phone number'), { target: { value: '3155551212' } });
    fireEvent.click(screen.getByLabelText('A Thrive staff member already checked my ID today'));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await screen.findByText('How do you want to feel today?');
  }

  it('validates the required contact step and shows the inline SMS disclosure', async () => {
    renderCard();

    expect(screen.getByText(/By providing your phone number/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('alert')).toHaveTextContent('First name is required.');

    fireEvent.change(screen.getByLabelText('First name'), { target: { value: 'Jane' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Phone is required.');

    fireEvent.change(screen.getByLabelText('Phone number'), { target: { value: '3155551212' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Please confirm that a Thrive staff member checked your ID.',
    );
  });

  it('shows the returning-customer utility step with last purchase, review CTA, and Smokey', async () => {
    (getVisitorCheckinContext as jest.Mock).mockResolvedValue({
      success: true,
      isReturningCustomer: true,
      enrichmentMode: 'favorite_categories',
      savedEmail: 'vip@example.com',
      savedEmailConsent: true,
      lastPurchase: {
        primaryItemName: 'Blue Dream Pre-Roll',
        itemCount: 2,
        total: 54,
        orderDateLabel: 'Mar 20, 2026',
      },
      googleReviewUrl: 'https://reviews.example.com/thrive',
    });

    renderCard();
    await moveToStepTwo();

    expect(screen.getByText(/Last time you picked up: Blue Dream Pre-Roll/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Leave a quick review from your last visit/i })).toHaveAttribute(
      'href',
      'https://reviews.example.com/thrive',
    );
    expect(screen.getByText(/Tell us what you usually shop for/i)).toBeInTheDocument();
    expect(screen.getByTestId('smokey-widget')).toBeInTheDocument();
  });

  it('submits the email enrichment path with Thrive check-in metadata', async () => {
    (captureVisitorCheckin as jest.Mock).mockResolvedValue({
      success: true,
      isNewLead: true,
      isReturningCustomer: false,
    });

    renderCard();
    await moveToStepTwo();

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'jane@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Finish Check-In' }));

    await waitFor(() => {
      expect(captureVisitorCheckin).toHaveBeenCalledWith(expect.objectContaining({
        firstName: 'Jane',
        email: 'jane@example.com',
        emailConsent: true,
        smsConsent: true,
        source: 'brand_rewards_checkin',
        uiVersion: 'thrive_checkin_v2',
        offerType: 'email',
      }));
    });

    expect(await screen.findByText("You're checked in, Jane.")).toBeInTheDocument();
    expect(screen.getByText(/welcome email is on the way/i)).toBeInTheDocument();
  });

  it('submits favorite-category enrichment when email is already known', async () => {
    (getVisitorCheckinContext as jest.Mock).mockResolvedValue({
      success: true,
      isReturningCustomer: true,
      enrichmentMode: 'favorite_categories',
      savedEmail: 'vip@example.com',
      savedEmailConsent: true,
    });
    (captureVisitorCheckin as jest.Mock).mockResolvedValue({
      success: true,
      isNewLead: false,
      isReturningCustomer: true,
    });

    renderCard();
    await moveToStepTwo();

    fireEvent.click(screen.getByRole('button', { name: 'Pre Rolls' }));
    fireEvent.click(screen.getByRole('button', { name: 'Finish Check-In' }));

    await waitFor(() => {
      expect(captureVisitorCheckin).toHaveBeenCalledWith(expect.objectContaining({
        email: 'vip@example.com',
        emailConsent: true,
        favoriteCategories: ['pre-rolls'],
        offerType: 'favorite_categories',
      }));
    });

    expect(await screen.findByText(/Welcome back, Jane. You're checked in./i)).toBeInTheDocument();
  });

  it('lets a returning customer override the saved email during favorite-category enrichment', async () => {
    (getVisitorCheckinContext as jest.Mock).mockResolvedValue({
      success: true,
      isReturningCustomer: true,
      enrichmentMode: 'favorite_categories',
      savedEmail: 'vip@example.com',
      savedEmailConsent: true,
    });
    (captureVisitorCheckin as jest.Mock).mockResolvedValue({
      success: true,
      isNewLead: false,
      isReturningCustomer: true,
    });

    renderCard();
    await moveToStepTwo();

    expect(screen.getByText(/We'll keep using/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Pre Rolls' }));
    fireEvent.change(screen.getByLabelText('Use a different email (optional)'), {
      target: { value: 'fresh@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Finish Check-In' }));

    await waitFor(() => {
      expect(captureVisitorCheckin).toHaveBeenCalledWith(expect.objectContaining({
        email: 'fresh@example.com',
        emailConsent: true,
        favoriteCategories: ['pre-rolls'],
        offerType: 'email',
      }));
    });
  });

  it('shows a non-blocking failure message when the final check-in fails', async () => {
    (captureVisitorCheckin as jest.Mock).mockResolvedValue({
      success: false,
      isNewLead: false,
      isReturningCustomer: false,
    });

    renderCard();
    await moveToStepTwo();
    fireEvent.click(screen.getByRole('button', { name: 'Finish Check-In' }));

    expect(
      await screen.findByText('Check-in is temporarily unavailable. Staff can still let you in.'),
    ).toBeInTheDocument();
  });
});
