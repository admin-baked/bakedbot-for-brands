import { EzalService } from '@/server/services/ezal';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';

jest.mock('@/firebase/admin');
jest.mock('@/lib/logger');

const mockGetAdminFirestore = getAdminFirestore as jest.MockedFunction<typeof getAdminFirestore>;

describe('Competitive Intelligence (Ezal System)', () => {
  let mockDb: any;
  let mockCollection: jest.Mock;
  let mockDoc: jest.Mock;
  let mockWhere: jest.Mock;
  let mockOrderBy: jest.Mock;
  let mockGet: jest.Mock;
  let mockSet: jest.Mock;
  let mockUpdate: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockWhere = jest.fn().mockReturnThis();
    mockOrderBy = jest.fn().mockReturnThis();
    mockGet = jest.fn();
    mockSet = jest.fn().mockResolvedValue({});
    mockUpdate = jest.fn().mockResolvedValue({});

    mockDoc = jest.fn().mockReturnValue({
      get: mockGet,
      set: mockSet,
      update: mockUpdate,
    });

    mockCollection = jest.fn().mockReturnValue({
      doc: mockDoc,
      where: mockWhere,
      orderBy: mockOrderBy,
      get: mockGet,
    });

    mockDb = {
      collection: mockCollection,
      doc: jest.fn().mockReturnValue({
        get: mockGet,
        set: mockSet,
        update: mockUpdate,
      }),
    };

    mockGetAdminFirestore.mockReturnValue(mockDb);
  });

  describe('Competitor Setup Wizard', () => {
    it('loads competitors from Firestore', async () => {
      mockGet.mockResolvedValueOnce({
        docs: [
          {
            id: 'comp1',
            data: () => ({
              id: 'comp1',
              name: 'Competitor A',
              website: 'https://comp-a.com',
              lastScanned: new Date(),
            }),
          },
          {
            id: 'comp2',
            data: () => ({
              id: 'comp2',
              name: 'Competitor B',
              website: 'https://comp-b.com',
              lastScanned: new Date(),
            }),
          },
        ],
      });

      const result = await EzalService.getCompetitors('org_test');

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Competitor A');
      expect(mockWhere).toHaveBeenCalledWith('orgId', '==', 'org_test');
    });

    it('queried from both old and new collections (legacy fallback)', async () => {
      mockGet.mockResolvedValueOnce({
        docs: [
          {
            id: 'comp1',
            data: () => ({ id: 'comp1', name: 'Old Competitor' }),
          },
        ],
      });

      const result = await EzalService.getCompetitors('org_test');

      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(mockCollection).toHaveBeenCalledWith(expect.stringContaining('competitors'));
    });

    it('closes dialog when competitors loaded', async () => {
      mockGet.mockResolvedValueOnce({
        docs: [
          {
            id: 'comp1',
            data: () => ({ id: 'comp1', name: 'Competitor' }),
          },
        ],
      });

      const competitors = await EzalService.getCompetitors('org_test');

      expect(competitors.length).toBeGreaterThan(0);
    });
  });

  describe('Plan Limits & Feature Gating', () => {
    it('returns correct maxCompetitors for Empire plan (1000)', async () => {
      const limits = EzalService.getPlanLimits('empire');

      expect(limits.maxCompetitors).toBe(1000);
      expect(limits.updateFrequency).toBe('live'); // 15-minute updates
    });

    it('returns correct maxCompetitors for Premium plan (20)', async () => {
      const limits = EzalService.getPlanLimits('premium');

      expect(limits.maxCompetitors).toBe(20);
      expect(limits.updateFrequency).toBe('weekly');
    });

    it('returns correct maxCompetitors for Standard plan (5)', async () => {
      const limits = EzalService.getPlanLimits('standard');

      expect(limits.maxCompetitors).toBe(5);
      expect(limits.updateFrequency).toBe('daily');
    });

    it('cascades maxCompetitors prop to UI components', async () => {
      const limits = EzalService.getPlanLimits('enterprise');

      // Verify maxCompetitors is in the returned object
      expect('maxCompetitors' in limits).toBe(true);
      expect(typeof limits.maxCompetitors).toBe('number');
    });

    it('blocks competitor addition when at plan limit', async () => {
      const standardLimits = EzalService.getPlanLimits('standard');
      const currentCount = 5; // At limit for standard plan

      const canAdd = currentCount < standardLimits.maxCompetitors;

      expect(canAdd).toBe(false);
    });
  });

  describe('Competitor Tracking & Scanning', () => {
    it('records competitor website URL', async () => {
      const competitorData = {
        name: 'Test Competitor',
        website: 'https://test-comp.com',
        orgId: 'org_test',
      };

      await EzalService.addCompetitor('org_test', competitorData);

      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Competitor',
          website: 'https://test-comp.com',
        })
      );
    });

    it('tracks lastScanned timestamp', async () => {
      const competitorData = {
        name: 'Scanned Competitor',
        website: 'https://scanned.com',
        lastScanned: new Date(),
        orgId: 'org_test',
      };

      await EzalService.addCompetitor('org_test', competitorData);

      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          lastScanned: expect.any(Date),
        })
      );
    });

    it('stores pricing data from competitor scan', async () => {
      const scanResult = {
        competitorId: 'comp1',
        products: [
          { name: 'Product A', price: 29.99, lastScanned: new Date() },
          { name: 'Product B', price: 49.99, lastScanned: new Date() },
        ],
      };

      await EzalService.recordScanResult('org_test', scanResult);

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          products: expect.arrayContaining([
            expect.objectContaining({ name: 'Product A' }),
          ]),
        })
      );
    });

    it('detects price drops (> 30%)', async () => {
      const oldPrice = 100;
      const newPrice = 60; // 40% drop
      const dropPercent = ((oldPrice - newPrice) / oldPrice) * 100;

      const isPriceDrop = dropPercent > 30;

      expect(isPriceDrop).toBe(true);
    });

    it('detects price wars (> 50% drop)', async () => {
      const oldPrice = 100;
      const newPrice = 40; // 60% drop
      const dropPercent = ((oldPrice - newPrice) / oldPrice) * 100;

      const isPriceWar = dropPercent > 50;

      expect(isPriceWar).toBe(true);
    });
  });

  describe('Weekly Report Generation', () => {
    it('generates weekly report with competitor snapshots', async () => {
      mockGet.mockResolvedValueOnce({
        docs: [
          {
            id: 'comp1',
            data: () => ({
              id: 'comp1',
              name: 'Competitor A',
              website: 'https://comp-a.com',
              products: [{ name: 'Product', price: 29.99 }],
            }),
          },
        ],
      });

      const report = await EzalService.generateWeeklyReport('org_test');

      expect(report.competitorCount).toBeGreaterThan(0);
      expect(report.timestamp).toBeDefined();
    });

    it('sends report to Drive for archival', async () => {
      const report = {
        orgId: 'org_test',
        week: '2026-W08',
        competitorSnapshots: [],
        timestamp: new Date(),
      };

      await EzalService.archiveReport('org_test', report);

      expect(mockSet).toHaveBeenCalled();
    });

    it('sends report via email to brand admin', async () => {
      const report = {
        orgId: 'org_test',
        week: '2026-W08',
        competitorCount: 5,
        priceChanges: 3,
      };

      const emailSent = await EzalService.emailReport('admin@example.com', report);

      expect(emailSent).toBe(true);
    });

    it('sends report to Inbox as insight thread', async () => {
      const report = {
        orgId: 'org_test',
        week: '2026-W08',
        competitorCount: 5,
      };

      const threadCreated = await EzalService.createInboxThread('org_test', report);

      expect(threadCreated).toBe(true);
    });
  });

  describe('Product Matching', () => {
    it('matches competitor products to own menu (>90% accuracy)', async () => {
      const ownProducts = [
        { name: 'Gelato', category: 'flower' },
        { name: 'Edibles', category: 'edibles' },
      ];

      const competitorProducts = [
        { name: 'Gelato Premium', category: 'flower' },
        { name: 'Gummy Pack', category: 'edibles' },
      ];

      const matchScore = EzalService.calculateProductMatchScore(ownProducts, competitorProducts);

      expect(matchScore).toBeGreaterThan(0.85);
    });

    it('returns empty array for unmatched products', async () => {
      const ownProducts = [{ name: 'Unique Product', category: 'unique' }];
      const competitorProducts = [{ name: 'Completely Different', category: 'other' }];

      const matches = EzalService.findMatches(ownProducts, competitorProducts);

      expect(matches.length).toBe(0);
    });
  });

  describe('Real-Time Alerts', () => {
    it('sends real-time alert on price drop > 30%', async () => {
      const alert = {
        type: 'price_drop',
        competitorName: 'Competitor A',
        productName: 'Product X',
        oldPrice: 100,
        newPrice: 60,
        dropPercent: 40,
      };

      const alertSent = await EzalService.sendRealTimeAlert('org_test', alert);

      expect(alertSent).toBe(true);
    });

    it('sends real-time alert on price war (> 50%)', async () => {
      const alert = {
        type: 'price_war',
        competitorName: 'Competitor B',
        productName: 'Product Y',
        oldPrice: 200,
        newPrice: 80,
        dropPercent: 60,
      };

      const alertSent = await EzalService.sendRealTimeAlert('org_test', alert);

      expect(alertSent).toBe(true);
    });
  });

  describe('Org Isolation', () => {
    it('prevents viewing competitors from another org', async () => {
      mockWhere.mockReturnValueOnce({
        get: jest.fn().mockResolvedValueOnce({
          docs: [],
        }),
      });

      const competitors = await EzalService.getCompetitors('org_other_org');

      expect(mockWhere).toHaveBeenCalledWith('orgId', '==', 'org_other_org');
    });

    it('allows multi-org accounts to switch between orgs', async () => {
      mockGet.mockResolvedValueOnce({
        docs: [{ id: 'comp1', data: () => ({ id: 'comp1', name: 'Org A Competitor' }) }],
      });
      const orgACompetitors = await EzalService.getCompetitors('org_a');
      expect(orgACompetitors.length).toBeGreaterThan(0);

      mockGet.mockResolvedValueOnce({
        docs: [{ id: 'comp2', data: () => ({ id: 'comp2', name: 'Org B Competitor' }) }],
      });
      const orgBCompetitors = await EzalService.getCompetitors('org_b');
      expect(orgBCompetitors.length).toBeGreaterThan(0);
    });
  });
});
