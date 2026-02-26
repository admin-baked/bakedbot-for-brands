import { makeBrandGuideRepo } from '@/server/repos/brandGuideRepo';

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

function makeTimestamp(date: Date) {
  return {
    toDate: jest.fn(() => date),
  };
}

function buildRepoWithDoc(data: Record<string, unknown>) {
  const get = jest.fn().mockResolvedValue({
    exists: true,
    data: () => data,
  });

  const firestore = {
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get,
      })),
    })),
  };

  return {
    repo: makeBrandGuideRepo(firestore as any),
    get,
    firestore,
  };
}

describe('brandGuideRepo timestamp conversion', () => {
  it('recursively converts nested Firestore Timestamps into Date objects', async () => {
    const createdAt = new Date('2026-02-26T12:00:00.000Z');
    const lastUpdatedAt = new Date('2026-02-26T13:00:00.000Z');
    const nestedDate = new Date('2026-02-26T14:00:00.000Z');
    const arrayDate = new Date('2026-02-26T15:00:00.000Z');

    const { repo } = buildRepoWithDoc({
      id: 'brand-1',
      brandId: 'brand-1',
      brandName: 'Test Brand',
      createdAt: makeTimestamp(createdAt),
      lastUpdatedAt: makeTimestamp(lastUpdatedAt),
      source: {
        archetype: {
          selected_at: makeTimestamp(nestedDate),
        },
      },
      checkpoints: [
        { happenedAt: makeTimestamp(arrayDate) },
      ],
    });

    const result = await repo.getById('brand-1');

    expect(result).not.toBeNull();
    expect(result?.createdAt).toEqual(createdAt);
    expect(result?.lastUpdatedAt).toEqual(lastUpdatedAt);
    expect((result as any).source.archetype.selected_at).toEqual(nestedDate);
    expect((result as any).checkpoints[0].happenedAt).toEqual(arrayDate);
  });

  it('skips unsafe object keys that can mutate object prototypes', async () => {
    const createdAt = new Date('2026-02-26T12:00:00.000Z');
    const lastUpdatedAt = new Date('2026-02-26T13:00:00.000Z');

    const maliciousDoc: Record<string, unknown> = {
      id: 'brand-2',
      brandId: 'brand-2',
      brandName: 'Malicious Brand',
      createdAt: makeTimestamp(createdAt),
      lastUpdatedAt: makeTimestamp(lastUpdatedAt),
    };

    Object.defineProperty(maliciousDoc, '__proto__', {
      value: { polluted: 'yes' },
      enumerable: true,
      configurable: true,
    });

    const { repo } = buildRepoWithDoc(maliciousDoc);
    const result = await repo.getById('brand-2');

    expect(result).not.toBeNull();
    expect((result as any).polluted).toBeUndefined();
  });

  it('preserves non-plain objects instead of converting them to plain objects', async () => {
    const createdAt = new Date('2026-02-26T12:00:00.000Z');
    const lastUpdatedAt = new Date('2026-02-26T13:00:00.000Z');

    class FirestoreLikeReference {
      constructor(public readonly path: string) {}
    }

    const ref = new FirestoreLikeReference('brandGuides/brand-3');

    const { repo } = buildRepoWithDoc({
      id: 'brand-3',
      brandId: 'brand-3',
      brandName: 'Reference Brand',
      createdAt: makeTimestamp(createdAt),
      lastUpdatedAt: makeTimestamp(lastUpdatedAt),
      reference: ref,
    });

    const result = await repo.getById('brand-3');

    expect(result).not.toBeNull();
    expect((result as any).reference).toBe(ref);
  });
});
