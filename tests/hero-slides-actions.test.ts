import {
    createHeroSlide,
    updateHeroSlide,
    deleteHeroSlide,
    reorderHeroSlides,
    getHeroSlides,
    getAllHeroSlides,
} from '@/app/actions/hero-slides';
import { getAdminFirestore } from '@/firebase/admin';
import { requireUser } from '@/server/auth/auth';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

vi.mock('@/firebase/admin');
vi.mock('@/server/auth/auth');

describe('Hero Slides Server Actions', () => {
    const mockOrgId = 'test-org-123';
    const mockUserId = 'test-user-456';
    const mockSlideId = 'test-slide-789';

    const mockUser = { uid: mockUserId, role: 'brand_admin' };
    const mockSlideData = {
        id: mockSlideId,
        orgId: mockOrgId,
        title: 'Test Slide',
        subtitle: 'Test Subtitle',
        description: 'Test Description',
        ctaText: 'Shop Now',
        ctaAction: 'scroll' as const,
        ctaTarget: 'products',
        imageUrl: 'https://example.com/image.jpg',
        backgroundColor: '#16a34a',
        textAlign: 'left' as const,
        displayOrder: 0,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        (requireUser as any).mockResolvedValue(mockUser);
    });

    describe('getHeroSlides', () => {
        it('should return active slides without auth requirement', async () => {
            const mockDb = {
                collection: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        where: vi.fn().mockReturnValue({
                            orderBy: vi.fn().mockReturnValue({
                                get: vi.fn().mockResolvedValue({
                                    empty: false,
                                    docs: [
                                        {
                                            id: mockSlideId,
                                            data: () => mockSlideData,
                                        },
                                    ],
                                }),
                            }),
                        }),
                    }),
                }),
            };

            (getAdminFirestore as any).mockReturnValue(mockDb);

            const result = await getHeroSlides(mockOrgId);

            expect(result).toHaveLength(1);
            expect(result[0].id).toBe(mockSlideId);
            expect(result[0].orgId).toBe(mockOrgId);
        });

        it('should return empty array for invalid orgId', async () => {
            const result = await getHeroSlides('');
            expect(result).toEqual([]);
        });
    });

    describe('createHeroSlide', () => {
        it('should create slide with valid auth and org access', async () => {
            const mockDb = {
                collection: vi.fn().mockReturnValue({
                    doc: vi.fn().mockReturnValue({
                        set: vi.fn().mockResolvedValue(undefined),
                    }),
                }),
            };

            const mockUserDoc = {
                exists: true,
                data: () => ({ currentOrgId: mockOrgId }),
            };

            (getAdminFirestore as any).mockReturnValue({
                ...mockDb,
                collection: vi.fn((name) => {
                    if (name === 'users') {
                        return {
                            doc: vi.fn().mockReturnValue({
                                get: vi.fn().mockResolvedValue(mockUserDoc),
                            }),
                        };
                    }
                    return mockDb.collection(name);
                }),
            });

            const result = await createHeroSlide(mockOrgId, {
                title: 'New Slide',
                subtitle: 'New Subtitle',
                description: 'New Description',
                ctaText: 'Click Here',
                ctaAction: 'scroll',
                ctaTarget: '',
                imageUrl: '',
                backgroundColor: '#000000',
                textAlign: 'center',
                active: true,
                displayOrder: 0,
            });

            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.data?.orgId).toBe(mockOrgId);
        });

        it('should deny create when user org does not match', async () => {
            const mockDb = {
                collection: vi.fn().mockReturnValue({
                    doc: vi.fn().mockReturnValue({
                        get: vi.fn().mockResolvedValue({
                            exists: true,
                            data: () => ({ currentOrgId: 'different-org' }),
                        }),
                    }),
                }),
            };

            (getAdminFirestore as any).mockReturnValue(mockDb);

            const result = await createHeroSlide(mockOrgId, {
                title: 'New Slide',
                subtitle: 'New Subtitle',
                description: 'New Description',
                ctaText: 'Click Here',
                ctaAction: 'scroll',
                ctaTarget: '',
                imageUrl: '',
                backgroundColor: '#000000',
                textAlign: 'center',
                active: true,
                displayOrder: 0,
            });

            expect(result.success).toBe(false);
            expect(result.error).toBe('Unauthorized');
        });

        it('should fail when orgId is missing', async () => {
            const result = await createHeroSlide('', {
                title: 'New Slide',
                subtitle: 'New Subtitle',
                description: 'New Description',
                ctaText: 'Click Here',
                ctaAction: 'scroll',
                ctaTarget: '',
                imageUrl: '',
                backgroundColor: '#000000',
                textAlign: 'center',
                active: true,
                displayOrder: 0,
            });

            expect(result.success).toBe(false);
        });
    });

    describe('updateHeroSlide', () => {
        it('should update slide with valid auth', async () => {
            const mockDb = {
                collection: vi.fn().mockReturnValue({
                    doc: vi.fn().mockReturnValue({
                        get: vi.fn().mockResolvedValue({
                            exists: true,
                            data: () => mockSlideData,
                        }),
                        update: vi.fn().mockResolvedValue(undefined),
                    }),
                }),
            };

            (getAdminFirestore as any).mockReturnValue({
                ...mockDb,
                collection: vi.fn((name) => {
                    if (name === 'users') {
                        return {
                            doc: vi.fn().mockReturnValue({
                                get: vi.fn().mockResolvedValue({
                                    exists: true,
                                    data: () => ({ currentOrgId: mockOrgId }),
                                }),
                            }),
                        };
                    }
                    return mockDb.collection(name);
                }),
            });

            const result = await updateHeroSlide(mockSlideId, { title: 'Updated Title' });

            expect(result.success).toBe(true);
        });

        it('should deny update when slide belongs to different org', async () => {
            const mockDb = {
                collection: vi.fn().mockReturnValue({
                    doc: vi.fn().mockReturnValue({
                        get: vi.fn().mockResolvedValue({
                            exists: true,
                            data: () => ({ ...mockSlideData, orgId: 'different-org' }),
                        }),
                    }),
                }),
            };

            (getAdminFirestore as any).mockReturnValue(mockDb);

            const result = await updateHeroSlide(mockSlideId, { title: 'Updated Title' });

            expect(result.success).toBe(false);
            expect(result.error).toBe('Unauthorized');
        });

        it('should fail when slide does not exist', async () => {
            const mockDb = {
                collection: vi.fn().mockReturnValue({
                    doc: vi.fn().mockReturnValue({
                        get: vi.fn().mockResolvedValue({
                            exists: false,
                        }),
                    }),
                }),
            };

            (getAdminFirestore as any).mockReturnValue(mockDb);

            const result = await updateHeroSlide('nonexistent-id', { title: 'Updated Title' });

            expect(result.success).toBe(false);
            expect(result.error).toBe('Slide not found');
        });
    });

    describe('deleteHeroSlide', () => {
        it('should delete slide with valid auth', async () => {
            const mockDb = {
                collection: vi.fn().mockReturnValue({
                    doc: vi.fn().mockReturnValue({
                        get: vi.fn().mockResolvedValue({
                            exists: true,
                            data: () => mockSlideData,
                        }),
                        delete: vi.fn().mockResolvedValue(undefined),
                    }),
                }),
            };

            (getAdminFirestore as any).mockReturnValue({
                ...mockDb,
                collection: vi.fn((name) => {
                    if (name === 'users') {
                        return {
                            doc: vi.fn().mockReturnValue({
                                get: vi.fn().mockResolvedValue({
                                    exists: true,
                                    data: () => ({ currentOrgId: mockOrgId }),
                                }),
                            }),
                        };
                    }
                    return mockDb.collection(name);
                }),
            });

            const result = await deleteHeroSlide(mockSlideId);

            expect(result.success).toBe(true);
        });

        it('should deny delete when user org does not match', async () => {
            const mockDb = {
                collection: vi.fn().mockReturnValue({
                    doc: vi.fn().mockReturnValue({
                        get: vi.fn().mockResolvedValue({
                            exists: true,
                            data: () => ({ ...mockSlideData, orgId: 'different-org' }),
                        }),
                    }),
                }),
            };

            (getAdminFirestore as any).mockReturnValue(mockDb);

            const result = await deleteHeroSlide(mockSlideId);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Unauthorized');
        });
    });

    describe('reorderHeroSlides', () => {
        it('should reorder multiple slides with valid auth', async () => {
            const slides = [
                { id: 'slide-1', displayOrder: 0 },
                { id: 'slide-2', displayOrder: 1 },
            ];

            const mockDb = {
                collection: vi.fn().mockReturnValue({
                    doc: vi.fn().mockReturnValue({
                        get: vi.fn().mockResolvedValue({
                            exists: true,
                            data: () => mockSlideData,
                        }),
                    }),
                }),
                batch: vi.fn().mockReturnValue({
                    update: vi.fn(),
                    commit: vi.fn().mockResolvedValue(undefined),
                }),
            };

            (getAdminFirestore as any).mockReturnValue({
                ...mockDb,
                collection: vi.fn((name) => {
                    if (name === 'users') {
                        return {
                            doc: vi.fn().mockReturnValue({
                                get: vi.fn().mockResolvedValue({
                                    exists: true,
                                    data: () => ({ currentOrgId: mockOrgId }),
                                }),
                            }),
                        };
                    }
                    return mockDb.collection(name);
                }),
                batch: mockDb.batch,
            });

            const result = await reorderHeroSlides(slides);

            expect(result.success).toBe(true);
        });

        it('should fail with empty slide list', async () => {
            const result = await reorderHeroSlides([]);

            expect(result.success).toBe(false);
            expect(result.error).toBe('No slides to reorder');
        });
    });

    describe('getAllHeroSlides', () => {
        it('should return all slides for org', async () => {
            const mockDb = {
                collection: vi.fn().mockReturnValue({
                    where: vi.fn().mockReturnValue({
                        orderBy: vi.fn().mockReturnValue({
                            get: vi.fn().mockResolvedValue({
                                empty: false,
                                docs: [
                                    {
                                        id: mockSlideId,
                                        data: () => mockSlideData,
                                    },
                                ],
                            }),
                        }),
                    }),
                }),
            };

            (getAdminFirestore as any).mockReturnValue(mockDb);

            const result = await getAllHeroSlides(mockOrgId);

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(1);
            expect(result.data?.[0].id).toBe(mockSlideId);
        });

        it('should fail without orgId', async () => {
            const result = await getAllHeroSlides('');

            expect(result.success).toBe(false);
        });
    });
});
