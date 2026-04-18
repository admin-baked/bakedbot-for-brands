import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { VisitorCheckinCard } from '../visitor-checkin-card';
import {
  captureVisitorCheckin,
  findVisitorCheckinCandidates,
  getVisitorCheckinContext,
} from '@/server/actions/visitor-checkin';
import { getMoodRecommendations, prefetchTabletInventory } from '@/server/actions/loyalty-tablet';

jest.mock('@/server/actions/visitor-checkin', () => ({
  captureVisitorCheckin: jest.fn(),
  findVisitorCheckinCandidates: jest.fn(),
  getVisitorCheckinContext: jest.fn(),
}));

jest.mock('@/server/actions/loyalty-tablet', () => ({
  getMoodRecommendations: jest.fn(),
  prefetchTabletInventory: jest.fn().mockResolvedValue(undefined),
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
    (findVisitorCheckinCandidates as jest.Mock).mockResolvedValue({
      success: true,
      candidates: [],
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

  it('supports staff-assisted lookup with first name and last 4 before loading returning context', async () => {
    (findVisitorCheckinCandidates as jest.Mock).mockResolvedValue({
      success: true,
      candidates: [
        {
          candidate: { kind: 'order', id: 'order_1' },
          firstName: 'Jane',
          phoneLast4: '1212',
          returningSource: 'online_order',
          title: 'Jane - Ordered online',
          subtitle: 'Blue Dream Pre-Roll - Mar 20, 2026 - phone ending in 1212',
        },
      ],
    });
    (getVisitorCheckinContext as jest.Mock).mockResolvedValue({
      success: true,
      isReturningCustomer: true,
      returningSource: 'online_order',
      enrichmentMode: 'email',
      lastPurchase: {
        primaryItemName: 'Blue Dream Pre-Roll',
        itemCount: 1,
        total: 12,
        orderDateLabel: 'Mar 20, 2026',
      },
    });

    renderCard();

    fireEvent.click(screen.getByRole('button', { name: /Use first name \+ last 4/i }));
    fireEvent.change(screen.getByLabelText('First name'), { target: { value: 'Jane' } });
    fireEvent.change(screen.getByLabelText('Last 4 digits'), { target: { value: '1212' } });
    fireEvent.click(screen.getByLabelText('A Thrive staff member already checked my ID today'));
    fireEvent.click(screen.getByRole('button', { name: 'Find My Profile' }));

    expect(await screen.findByText('Jane - Ordered online')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Jane - Ordered online/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue to Check-In' }));

    await screen.findByText(/Last time you picked up: Blue Dream Pre-Roll/i);

    expect(findVisitorCheckinCandidates).toHaveBeenCalledWith({
      orgId: 'org_thrive_syracuse',
      firstName: 'Jane',
      phoneLast4: '1212',
    });
    expect(getVisitorCheckinContext).toHaveBeenCalledWith({
      orgId: 'org_thrive_syracuse',
      phone: undefined,
      lookupCandidate: { kind: 'order', id: 'order_1' },
    });
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
        smsConsent: false,
        source: 'brand_rewards_checkin',
        uiVersion: 'thrive_checkin_v2',
        offerType: 'email',
      }));
    });

    expect(await screen.findByText("You're checked in, Jane.")).toBeInTheDocument();
    expect(screen.getByText(/welcome email is on the way/i)).toBeInTheDocument();
  });

  it('clears saved recommendations when the visitor switches moods', async () => {
    (getMoodRecommendations as jest.Mock).mockImplementation(async (_orgId: string, moodId: string) => {
      if (moodId === 'social') {
        return {
          success: true,
          products: [
            {
              productId: 'prod_2',
              name: 'Social Spark Vape',
              price: 20,
              category: 'Vapes',
              reason: 'Easygoing and upbeat.',
            },
          ],
          bundle: {
            name: 'Social Start',
            tagline: 'A bright mood-matching combo',
            products: [
              { productId: 'prod_2', name: 'Social Spark Vape', price: 20, category: 'Vapes', reason: 'Easygoing and upbeat.' },
            ],
            totalPrice: 20,
          },
        };
      }

      return {
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
          ],
          totalPrice: 12,
        },
      };
    });
    (captureVisitorCheckin as jest.Mock).mockResolvedValue({
      success: true,
      isNewLead: false,
      isReturningCustomer: false,
    });

    renderCard();
    await moveToStepTwo();

    expect(prefetchTabletInventory).toHaveBeenCalledWith('org_thrive_syracuse');

    fireEvent.click(screen.getByRole('button', { name: 'Relaxed & Calm' }));
    await screen.findByRole('button', { name: 'View details for Blue Dream Pre-Roll' });

    fireEvent.click(screen.getByRole('button', { name: 'Save for budtender' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save bundle idea' }));
    fireEvent.click(screen.getByRole('button', { name: 'View details for Blue Dream Pre-Roll' }));

    expect(await screen.findByRole('button', { name: 'Saved for budtender' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bundle saved' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Social & Happy' }));
    await screen.findByRole('button', { name: 'View details for Social Spark Vape' });

    expect(screen.queryByRole('button', { name: 'Saved for budtender' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Bundle saved' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'View details for Blue Dream Pre-Roll' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Finish Check-In' }));

    await waitFor(() => {
      expect(captureVisitorCheckin).toHaveBeenCalledWith(expect.objectContaining({
        mood: 'social',
        cartProductIds: [],
        bundleAdded: false,
      }));
    });
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

  it('submits a staff-assisted match using the lookup candidate instead of a browser-held phone number', async () => {
    (findVisitorCheckinCandidates as jest.Mock).mockResolvedValue({
      success: true,
      candidates: [
        {
          candidate: { kind: 'customer', id: 'customer_1' },
          firstName: 'Jane',
          phoneLast4: '1212',
          returningSource: 'customer',
          title: 'Jane - Known customer',
          subtitle: 'Phone ending in 1212 - existing Thrive profile',
        },
      ],
    });
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

    fireEvent.click(screen.getByRole('button', { name: /Use first name \+ last 4/i }));
    fireEvent.change(screen.getByLabelText('First name'), { target: { value: 'Jane' } });
    fireEvent.change(screen.getByLabelText('Last 4 digits'), { target: { value: '1212' } });
    fireEvent.click(screen.getByLabelText('A Thrive staff member already checked my ID today'));
    fireEvent.click(screen.getByRole('button', { name: 'Find My Profile' }));
    fireEvent.click(await screen.findByRole('button', { name: /Jane - Known customer/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue to Check-In' }));

    await screen.findByText(/Tell us what you usually shop for/i);

    fireEvent.click(screen.getByRole('button', { name: 'Pre Rolls' }));
    fireEvent.click(screen.getByRole('button', { name: 'Finish Check-In' }));

    await waitFor(() => {
      expect(captureVisitorCheckin).toHaveBeenCalledWith(expect.objectContaining({
        phone: undefined,
        lookupCandidate: { kind: 'customer', id: 'customer_1' },
        email: 'vip@example.com',
        favoriteCategories: ['pre-rolls'],
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
