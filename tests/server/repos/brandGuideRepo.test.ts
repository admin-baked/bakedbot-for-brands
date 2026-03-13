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

function buildRepoForWrites() {
  const rootSet = jest.fn().mockResolvedValue(undefined);
  const versionSet = jest.fn().mockResolvedValue(undefined);
  const rootGet = jest.fn().mockResolvedValue({ exists: false, data: () => undefined });

  const firestore = {
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        set: rootSet,
        get: rootGet,
        collection: jest.fn(() => ({
          doc: jest.fn(() => ({
            set: versionSet,
          })),
        })),
      })),
    })),
  };

  return {
    repo: makeBrandGuideRepo(firestore as any),
    rootSet,
    versionSet,
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

  it('writes create payloads with plain Date fields for Firestore-safe serialization', async () => {
    const { repo, rootSet } = buildRepoForWrites();
    const uploadedAt = new Date('2026-03-12T12:00:00.000Z');

    await repo.create('brand-4', {
      brandName: 'Write Test Brand',
      assets: {
        heroImages: [
          {
            id: 'featured-image-brand-4',
            type: 'image',
            name: 'Featured image',
            url: 'https://cdn.example.com/featured.jpg',
            uploadedBy: 'brand-4',
            uploadedAt,
          },
        ],
      } as any,
    });

    expect(rootSet).toHaveBeenCalledTimes(1);
    const payload = rootSet.mock.calls[0]?.[0] as Record<string, any>;
    expect(payload.createdAt).toBeInstanceOf(Date);
    expect(payload.lastUpdatedAt).toBeInstanceOf(Date);
    expect(payload.assets.heroImages[0].uploadedAt).toBeInstanceOf(Date);
  });

  it('writes version snapshots with plain Date fields instead of custom timestamp prototypes', async () => {
    const { repo, versionSet } = buildRepoForWrites();
    const createdAt = new Date('2026-03-12T12:00:00.000Z');
    const uploadedAt = new Date('2026-03-12T12:05:00.000Z');

    await repo.createVersion('brand-4', {
      version: 1,
      timestamp: new Date('2026-03-12T12:10:00.000Z'),
      updatedBy: 'brand-4',
      changes: [],
      snapshot: {
        createdAt,
        assets: {
          heroImages: [
            {
              id: 'featured-image-brand-4',
              type: 'image',
              name: 'Featured image',
              url: 'https://cdn.example.com/featured.jpg',
              uploadedBy: 'brand-4',
              uploadedAt,
            },
          ],
        },
      } as any,
      isActive: true,
    });

    expect(versionSet).toHaveBeenCalledTimes(1);
    const payload = versionSet.mock.calls[0]?.[0] as Record<string, any>;
    expect(payload.timestamp).toBeInstanceOf(Date);
    expect(payload.snapshot.createdAt).toBeInstanceOf(Date);
    expect(payload.snapshot.assets.heroImages[0].uploadedAt).toBeInstanceOf(Date);
  });
});
