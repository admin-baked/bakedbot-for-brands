import { logger } from '@/lib/logger';
import { fetchMenuProducts } from '@/server/agents/adapters/consumer-adapter';
import { captureVisitorCheckin } from '../visitor-checkin';
import {
  captureTabletLead,
  getMoodRecommendations,
  searchTabletRecommendations,
} from '../loyalty-tablet';

jest.mock('@/server/agents/adapters/consumer-adapter', () => ({
  fetchMenuProducts: jest.fn(),
}));

jest.mock('../visitor-checkin', () => ({
  captureVisitorCheckin: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('loyalty tablet actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns deterministic mood recommendations from the live menu when social mode is selected', async () => {
    (fetchMenuProducts as jest.Mock).mockResolvedValue([
      {
        id: 'social-flower',
        name: 'Party Punch',
        category: 'Flower',
        price: 34,
        brandName: 'Thrive',
        description: 'uplifting hybrid social euphoric creative flower',
        stock: 12,
      },
      {
        id: 'social-preroll',
        name: 'Laugh Track Pre-Roll',
        category: 'Pre-Rolls',
        price: 12,
        brandName: 'Thrive',
        description: 'fun social pre-roll with a bright hybrid profile',
        stock: 8,
      },
      {
        id: 'social-vape',
        name: 'Sunny Side Cart',
        category: 'Vapes',
        price: 28,
        brandName: 'Thrive',
        description: 'uplifting daytime vape for a happy, creative vibe',
        stock: 5,
      },
      {
        id: 'sleep-flower',
        name: 'Night Cap',
        category: 'Flower',
        price: 30,
        brandName: 'Thrive',
        description: 'sleepy nighttime indica',
        stock: 9,
      },
    ]);

    const result = await getMoodRecommendations('org_thrive_syracuse', 'social');

    expect(result.success).toBe(true);
    expect(result.products).toHaveLength(3);
    expect(result.products?.map((product) => product.productId)).toEqual(
      expect.arrayContaining(['social-vape', 'social-flower', 'social-preroll']),
    );
    expect(result.bundle).toMatchObject({
      name: 'Pass The Good Vibes',
      products: expect.arrayContaining([
        expect.objectContaining({ productId: 'social-flower' }),
        expect.objectContaining({ productId: 'social-vape' }),
      ]),
    });
    expect(logger.info).toHaveBeenCalledWith(
      '[LoyaltyTablet] Mood recommendations generated',
      expect.objectContaining({
        orgId: 'org_thrive_syracuse',
        moodId: 'social',
        productCount: 3,
        strategy: 'deterministic_menu_search',
      }),
    );
  });

  it('returns a validation-style failure for unknown moods', async () => {
    const result = await getMoodRecommendations('org_thrive_syracuse', 'unknown');

    expect(result).toEqual({
      success: false,
      error: 'Unknown mood',
    });
  });

  it('supports freeform tablet search with live menu images and a spoken summary', async () => {
    (fetchMenuProducts as jest.Mock).mockResolvedValue([
      {
        id: 'gummy-calm',
        name: 'Calm Berry Gummies',
        category: 'Edibles',
        price: 24,
        brandName: 'Thrive',
        imageUrl: 'https://cdn.example.com/gummy.jpg',
        description: 'calm gentle cbd stress relief gummies',
        stock: 10,
      },
      {
        id: 'tea-tincture',
        name: 'Quiet Mind Tincture',
        category: 'Tinctures',
        price: 32,
        brandName: 'Thrive',
        description: 'calming cbd tincture for stress relief',
        stock: 4,
      },
      {
        id: 'night-preroll',
        name: 'Soft Landing Pre-Roll',
        category: 'Pre-Rolls',
        price: 11,
        brandName: 'Thrive',
        description: 'gentle relaxing pre-roll',
        stock: 3,
      },
    ]);

    const result = await searchTabletRecommendations(
      'org_thrive_syracuse',
      'something calm for stress',
      'anxious',
    );

    expect(result.success).toBe(true);
    expect(result.query).toBe('something calm for stress');
    expect(result.summary).toContain('I found');
    expect(result.products).toHaveLength(3);
    expect(result.products?.[0]).toMatchObject({
      productId: 'gummy-calm',
      imageUrl: 'https://cdn.example.com/gummy.jpg',
    });
    expect(logger.info).toHaveBeenCalledWith(
      '[LoyaltyTablet] Freeform search recommendations generated',
      expect.objectContaining({
        orgId: 'org_thrive_syracuse',
        moodId: 'anxious',
        query: 'something calm for stress',
        strategy: 'deterministic_menu_search_voice',
      }),
    );
  });

  it('returns a helpful message when freeform search has no strong match', async () => {
    (fetchMenuProducts as jest.Mock).mockResolvedValue([
      {
        id: 'social-flower',
        name: 'Party Punch',
        category: 'Flower',
        price: 34,
        brandName: 'Thrive',
        description: 'uplifting hybrid social euphoric creative flower',
        stock: 12,
      },
    ]);

    const result = await searchTabletRecommendations('org_thrive_syracuse', 'a scuba-diving topical');

    expect(result).toMatchObject({
      success: false,
      query: 'a scuba-diving topical',
    });
    expect(result.error).toContain('strong live-menu match');
  });

  it('passes tablet check-in metadata through to captureVisitorCheckin', async () => {
    (captureVisitorCheckin as jest.Mock).mockResolvedValue({
      success: true,
      isNewLead: true,
      customerId: 'customer_123',
      loyaltyPoints: 50,
      visitId: 'visit_123',
    });

    const result = await captureTabletLead({
      orgId: 'org_thrive_syracuse',
      firstName: 'Martez',
      email: 'martezandco@gmail.com',
      phone: '(312) 684-0522',
      emailConsent: true,
      smsConsent: true,
      mood: 'social',
      cartProductIds: ['social-vape', 'social-flower'],
      bundleAdded: true,
    });

    expect(captureVisitorCheckin).toHaveBeenCalledWith({
      orgId: 'org_thrive_syracuse',
      firstName: 'Martez',
      email: 'martezandco@gmail.com',
      phone: '(312) 684-0522',
      emailConsent: true,
      smsConsent: true,
      source: 'loyalty_tablet_checkin',
      ageVerifiedMethod: 'staff_visual_check',
      mood: 'social',
      cartProductIds: ['social-vape', 'social-flower'],
      bundleAdded: true,
    });
    expect(result).toMatchObject({
      success: true,
      isNewLead: true,
      customerId: 'customer_123',
      loyaltyPoints: 50,
      visitId: 'visit_123',
    });
  });
});
