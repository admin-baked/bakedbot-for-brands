/**
 * Knowledge Engine — Competitive Intel Ingestion Tests
 *
 * Validates claim extraction from competitive report markdown.
 * Uses the spec's exact test case inputs.
 */

// Mock Firebase and LanceDB to avoid live connections in unit tests
jest.mock('@/firebase/admin', () => ({
  getAdminFirestore: () => ({
    collection: () => ({
      where: () => ({ where: () => ({ where: () => ({ limit: () => ({ get: async () => ({ empty: true, docs: [] }) }) }) }) }),
      add: async () => ({ id: 'mock_id' }),
      doc: () => ({
        set: async () => {},
        update: async () => {},
        get: async () => ({ exists: false, data: () => ({}) }),
      }),
      limit: () => ({ get: async () => ({ empty: true, docs: [] }) }),
      get: async () => ({ empty: true, docs: [] }),
    }),
  }),
}));

jest.mock('../lancedb-repo', () => ({
  upsertChunks: jest.fn().mockResolvedValue(undefined),
  upsertEntityIndex: jest.fn().mockResolvedValue(undefined),
  embedText: jest.fn().mockResolvedValue(new Array(768).fill(0)),
}));

// Mock the firestore-repo to count calls
const mockCreateClaim = jest.fn().mockResolvedValue('kc_mock');
const mockCreateObservation = jest.fn().mockResolvedValue('ko_mock');
const mockCreateSourceIfNew = jest.fn().mockResolvedValue({ id: 'ks_mock', isDuplicate: false });
const mockUpsertEntity = jest.fn().mockResolvedValue('ke_mock');
const mockUpsertEdge = jest.fn().mockResolvedValue('kedge_mock');
const mockStartIngestionRun = jest.fn().mockResolvedValue('krun_mock');
const mockCompleteIngestionRun = jest.fn().mockResolvedValue(undefined);
const mockFailIngestionRun = jest.fn().mockResolvedValue(undefined);

jest.mock('../firestore-repo', () => ({
  createSourceIfNew: (...args: unknown[]) => mockCreateSourceIfNew(...args),
  createObservation: (...args: unknown[]) => mockCreateObservation(...args),
  createClaim: (...args: unknown[]) => mockCreateClaim(...args),
  upsertEntity: (...args: unknown[]) => mockUpsertEntity(...args),
  upsertEdge: (...args: unknown[]) => mockUpsertEdge(...args),
  startIngestionRun: (...args: unknown[]) => mockStartIngestionRun(...args),
  completeIngestionRun: (...args: unknown[]) => mockCompleteIngestionRun(...args),
  failIngestionRun: (...args: unknown[]) => mockFailIngestionRun(...args),
}));

import { ingestCompetitiveIntelKnowledge } from '../ingest-competitive-intel';

const SAMPLE_REPORT = `
# Competitive Intelligence Report

### Promotions

- **Green Leaf Dispensary** is running a 20% off gummies promotion this week
- Love Cannabis offers a 10% discount on pre-rolls
- **Empire Cannabis** repeated their gummies promo for the 3rd consecutive week

### Price Changes

- **GreenThumb** dropped flower prices by 15% across Indica strains
- Love Cannabis reduced edibles by 8%
`;

describe('ingestCompetitiveIntelKnowledge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('skips ingestion if source is duplicate', async () => {
    mockCreateSourceIfNew.mockResolvedValueOnce({ id: 'ks_existing', isDuplicate: true });

    const result = await ingestCompetitiveIntelKnowledge({
      tenantId: 'org_thrive_syracuse',
      reportMarkdown: SAMPLE_REPORT,
      sourceRef: 'ci-report-2026-04-12',
      observedAt: new Date(),
      createdBy: 'ezal',
    });

    expect(result.claimIds).toHaveLength(0);
    expect(result.observationIds).toHaveLength(0);
    expect(mockCreateClaim).not.toHaveBeenCalled();
  });

  it('creates source and observations for valid report', async () => {
    await ingestCompetitiveIntelKnowledge({
      tenantId: 'org_thrive_syracuse',
      reportMarkdown: SAMPLE_REPORT,
      sourceRef: 'ci-report-2026-04-12',
      observedAt: new Date(),
      createdBy: 'ezal',
    });

    expect(mockCreateSourceIfNew).toHaveBeenCalledTimes(1);
    expect(mockCreateObservation.mock.calls.length).toBeGreaterThan(0);
  });

  it('extracts at least 1 competitor_promo claim from 20% gummies promo', async () => {
    const promoReport = `
### Promotions
- **Green Leaf Dispensary** is running a 20% off gummies promotion
`;

    await ingestCompetitiveIntelKnowledge({
      tenantId: 'org_thrive_syracuse',
      reportMarkdown: promoReport,
      sourceRef: 'ci-test-promo',
      observedAt: new Date(),
      createdBy: 'ezal',
    });

    const claimCalls = mockCreateClaim.mock.calls;
    const promoClaims = claimCalls.filter(call => {
      const claim = call[0];
      return claim.claimType === 'competitor_promo';
    });
    expect(promoClaims.length).toBeGreaterThanOrEqual(1);
  });

  it('does NOT create a material price drop claim for 10% price change (below 15% threshold)', async () => {
    const priceReport = `
### Price Changes
- Love Cannabis reduced edibles by 10%
`;

    await ingestCompetitiveIntelKnowledge({
      tenantId: 'org_thrive_syracuse',
      reportMarkdown: priceReport,
      sourceRef: 'ci-test-price',
      observedAt: new Date(),
      createdBy: 'ezal',
    });

    const claimCalls = mockCreateClaim.mock.calls;
    const highImpactPriceClaims = claimCalls.filter(call => {
      const claim = call[0];
      return claim.claimType === 'competitor_price_shift' && claim.impactLevel === 'high';
    });
    // 10% should not produce a high-impact price shift claim
    expect(highImpactPriceClaims.length).toBe(0);
  });

  it('all created claims are linked to source and observation', async () => {
    await ingestCompetitiveIntelKnowledge({
      tenantId: 'org_thrive_syracuse',
      reportMarkdown: SAMPLE_REPORT,
      sourceRef: 'ci-report-full',
      observedAt: new Date(),
      createdBy: 'ezal',
    });

    const claimCalls = mockCreateClaim.mock.calls;
    for (const call of claimCalls) {
      const claim = call[0];
      expect(claim.sourceIds).toBeDefined();
      expect(claim.sourceIds.length).toBeGreaterThan(0);
      expect(claim.observationIds).toBeDefined();
      expect(claim.observationIds.length).toBeGreaterThan(0);
    }
  });

  it('records ingestion run as completed on success', async () => {
    await ingestCompetitiveIntelKnowledge({
      tenantId: 'org_thrive_syracuse',
      reportMarkdown: SAMPLE_REPORT,
      sourceRef: 'ci-report-run-test',
      observedAt: new Date(),
      createdBy: 'system',
    });

    expect(mockStartIngestionRun).toHaveBeenCalledTimes(1);
    expect(mockCompleteIngestionRun).toHaveBeenCalledTimes(1);
    expect(mockFailIngestionRun).not.toHaveBeenCalled();
  });
});
