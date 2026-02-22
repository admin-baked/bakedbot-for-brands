import {
    createHeroSlide,
    deleteHeroSlide,
    getAllHeroSlides,
    getHeroSlides,
    reorderHeroSlides,
    updateHeroSlide,
} from '@/app/actions/hero-slides';

const mockGetAdminFirestore = jest.fn();
const mockRequireUser = jest.fn();
const mockRevalidatePath = jest.fn();

jest.mock('@/firebase/admin', () => ({
    getAdminFirestore: (...args: unknown[]) => mockGetAdminFirestore(...args),
}));

jest.mock('@/server/auth/auth', () => ({
    requireUser: (...args: unknown[]) => mockRequireUser(...args),
}));

jest.mock('next/cache', () => ({
    revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

jest.mock('uuid', () => ({
    v4: () => 'generated-slide-id',
}));

jest.mock('@/lib/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

type SlideRecord = {
    id: string;
    orgId: string;
    title: string;
    subtitle: string;
    description: string;
    ctaText: string;
    ctaAction: 'scroll' | 'link' | 'none';
    ctaTarget: string;
    imageUrl: string;
    backgroundColor: string;
    textAlign: 'left' | 'center' | 'right';
    active: boolean;
    displayOrder: number;
    createdAt: Date;
    updatedAt: Date;
};

function makeSlide(id: string, orgId: string, displayOrder: number, active = true): SlideRecord {
    return {
        id,
        orgId,
        title: `Slide ${id}`,
        subtitle: 'Sub',
        description: 'Description',
        ctaText: 'Shop',
        ctaAction: 'scroll',
        ctaTarget: 'products',
        imageUrl: '',
        backgroundColor: '#000',
        textAlign: 'left',
        active,
        displayOrder,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
}

function createMockDb({
    userOrgId = 'org-1',
    initialSlides = [],
}: {
    userOrgId?: string;
    initialSlides?: SlideRecord[];
} = {}) {
    const slides = new Map<string, SlideRecord>(
        initialSlides.map((slide) => [slide.id, { ...slide }]),
    );

    const applyFilters = (
        entries: SlideRecord[],
        filters: Array<{ field: string; op: string; value: unknown }>,
    ) =>
        entries.filter((entry) =>
            filters.every((filter) => {
                if (filter.op === '==') {
                    return (entry as Record<string, unknown>)[filter.field] === filter.value;
                }
                return true;
            }),
        );

    const createQuery = (
        filters: Array<{ field: string; op: string; value: unknown }> = [],
    ) => ({
        where: (field: string, op: string, value: unknown) =>
            createQuery([...filters, { field, op, value }]),
        orderBy: (_field: string, _direction?: string) => ({
            get: async () => {
                const rows = applyFilters(Array.from(slides.values()), filters).sort(
                    (a, b) => a.displayOrder - b.displayOrder,
                );
                return {
                    empty: rows.length === 0,
                    docs: rows.map((row) => ({ id: row.id, data: () => row })),
                };
            },
        }),
        get: async () => {
            const rows = applyFilters(Array.from(slides.values()), filters).sort(
                (a, b) => a.displayOrder - b.displayOrder,
            );
            return {
                empty: rows.length === 0,
                docs: rows.map((row) => ({ id: row.id, data: () => row })),
            };
        },
    });

    const heroCollection = {
        where: (field: string, op: string, value: unknown) =>
            createQuery([{ field, op, value }]),
        doc: (id: string) => ({
            id,
            get: async () => {
                const data = slides.get(id);
                return {
                    exists: Boolean(data),
                    data: () => data,
                };
            },
            set: async (data: SlideRecord) => {
                slides.set(id, { ...data });
            },
            update: async (data: Partial<SlideRecord>) => {
                const existing = slides.get(id);
                if (!existing) throw new Error('missing');
                slides.set(id, { ...existing, ...data });
            },
            delete: async () => {
                slides.delete(id);
            },
        }),
    };

    const usersCollection = {
        doc: (_id: string) => ({
            get: async () => ({
                exists: true,
                data: () => ({ currentOrgId: userOrgId }),
            }),
        }),
    };

    const db = {
        collection: (name: string) => {
            if (name === 'hero_slides') return heroCollection;
            if (name === 'users') return usersCollection;
            throw new Error(`Unexpected collection ${name}`);
        },
        batch: () => {
            const updates: Array<{ id: string; data: Partial<SlideRecord> }> = [];
            return {
                update: (docRef: { id: string }, data: Partial<SlideRecord>) => {
                    updates.push({ id: docRef.id, data });
                },
                commit: async () => {
                    updates.forEach(({ id, data }) => {
                        const existing = slides.get(id);
                        if (existing) slides.set(id, { ...existing, ...data });
                    });
                },
            };
        },
    };

    return { db, slides };
}

function createInput() {
    return {
        title: 'New Slide',
        subtitle: 'Subtitle',
        description: 'Description',
        ctaText: 'Shop',
        ctaAction: 'scroll' as const,
        ctaTarget: 'products',
        imageUrl: '',
        backgroundColor: '#111111',
        textAlign: 'left' as const,
        active: true,
        displayOrder: 0,
    };
}

describe('Hero slides server actions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockRequireUser.mockResolvedValue({ uid: 'user-1' });
    });

    it('returns active slides in display order', async () => {
        const { db } = createMockDb({
            initialSlides: [
                makeSlide('slide-b', 'org-1', 1, true),
                makeSlide('slide-a', 'org-1', 0, true),
                makeSlide('slide-inactive', 'org-1', 2, false),
            ],
        });
        mockGetAdminFirestore.mockReturnValue(db);

        const result = await getHeroSlides('org-1');

        expect(result).toHaveLength(2);
        expect(result[0].id).toBe('slide-a');
        expect(result[1].id).toBe('slide-b');
    });

    it('rejects create when user org does not match target org', async () => {
        const { db } = createMockDb({ userOrgId: 'org-other' });
        mockGetAdminFirestore.mockReturnValue(db);

        const result = await createHeroSlide('org-1', createInput());

        expect(result.success).toBe(false);
        expect(result.error).toBe('Unauthorized');
    });

    it('creates a slide and revalidates dashboard path', async () => {
        const { db, slides } = createMockDb({ userOrgId: 'org-1' });
        mockGetAdminFirestore.mockReturnValue(db);

        const result = await createHeroSlide('org-1', createInput());

        expect(result.success).toBe(true);
        expect(result.data?.id).toBe('generated-slide-id');
        expect(slides.has('generated-slide-id')).toBe(true);
        expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard');
    });

    it('returns not found when updating a missing slide', async () => {
        const { db } = createMockDb();
        mockGetAdminFirestore.mockReturnValue(db);

        const result = await updateHeroSlide('missing-slide', { title: 'Updated' });

        expect(result.success).toBe(false);
        expect(result.error).toBe('Slide not found');
    });

    it('deletes existing slide for authorized user', async () => {
        const { db, slides } = createMockDb({
            initialSlides: [makeSlide('slide-1', 'org-1', 0, true)],
        });
        mockGetAdminFirestore.mockReturnValue(db);

        const result = await deleteHeroSlide('slide-1');

        expect(result.success).toBe(true);
        expect(slides.has('slide-1')).toBe(false);
    });

    it('reorders slides and persists display order updates', async () => {
        const { db, slides } = createMockDb({
            initialSlides: [
                makeSlide('slide-1', 'org-1', 0, true),
                makeSlide('slide-2', 'org-1', 1, true),
            ],
        });
        mockGetAdminFirestore.mockReturnValue(db);

        const result = await reorderHeroSlides([
            { id: 'slide-1', displayOrder: 5 },
            { id: 'slide-2', displayOrder: 3 },
        ]);

        expect(result.success).toBe(true);
        expect(slides.get('slide-1')?.displayOrder).toBe(5);
        expect(slides.get('slide-2')?.displayOrder).toBe(3);
        expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard');
    });

    it('fails fast when getAllHeroSlides is called without orgId', async () => {
        const { db } = createMockDb();
        mockGetAdminFirestore.mockReturnValue(db);

        const result = await getAllHeroSlides('');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Failed to fetch hero slides');
    });
});
