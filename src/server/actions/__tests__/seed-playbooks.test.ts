/**
 * Unit tests for seed-playbooks server action
 * Tests template seeding and installation logic
 */

import type { Playbook } from '@/types/playbook';

// Mock Firebase Admin
const mockSet = jest.fn();
const mockGet = jest.fn();
const mockDoc = jest.fn(() => ({
    set: mockSet,
    get: mockGet,
}));
const mockCollection = jest.fn(() => ({
    doc: mockDoc,
}));

jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn(async () => ({
        firestore: {
            collection: mockCollection,
        },
    })),
}));

jest.mock('@/server/auth/auth', () => ({
    requireUser: jest.fn(async () => ({
        user: {
            uid: 'test_user_123',
            email: 'admin@bakedbot.ai',
        },
    })),
}));

jest.mock('@/lib/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

describe('Seed Playbooks Server Actions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('seedPlaybookTemplates', () => {
        it('should successfully seed templates when none exist', async () => {
            mockGet.mockResolvedValue({ exists: false });
            mockSet.mockResolvedValue(undefined);

            const { seedPlaybookTemplates } = await import('../seed-playbooks');

            const result = await seedPlaybookTemplates();

            expect(result.success).toBe(true);
            expect(result.seeded.length).toBeGreaterThan(0);
            expect(result.seeded).toContain('weekly-deals-video');
            expect(result.seeded).toContain('daily-product-spotlight');
            expect(result.seeded).toContain('competitor-price-alert');
            expect(result.errors.length).toBe(0);
        });

        it('should skip templates that already exist', async () => {
            mockGet.mockResolvedValue({ exists: true });

            const { seedPlaybookTemplates } = await import('../seed-playbooks');

            const result = await seedPlaybookTemplates();

            expect(result.success).toBe(true);
            expect(result.skipped.length).toBeGreaterThan(0);
            expect(result.seeded.length).toBe(0);
            expect(result.errors.length).toBe(0);
        });

        it('should handle partial failures gracefully', async () => {
            let callCount = 0;
            mockGet.mockImplementation(() => {
                callCount++;
                if (callCount === 1) {
                    return Promise.resolve({ exists: false });
                } else if (callCount === 2) {
                    return Promise.reject(new Error('Firestore timeout'));
                } else {
                    return Promise.resolve({ exists: false });
                }
            });

            mockSet.mockResolvedValue(undefined);

            const { seedPlaybookTemplates } = await import('../seed-playbooks');

            const result = await seedPlaybookTemplates();

            expect(result.success).toBe(false);
            expect(result.seeded.length).toBeGreaterThan(0);
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors.some(e => e.includes('Firestore timeout'))).toBe(true);
        });

        it('should seed Weekly Deals Video template with correct structure', async () => {
            mockGet.mockResolvedValue({ exists: false });
            const savedPlaybooks: Partial<Playbook>[] = [];

            mockSet.mockImplementation(async (data: Partial<Playbook>) => {
                savedPlaybooks.push(data);
            });

            const { seedPlaybookTemplates } = await import('../seed-playbooks');

            await seedPlaybookTemplates();

            const savedPlaybook = savedPlaybooks.find(p => p.id === 'weekly-deals-video');

            expect(savedPlaybook).not.toBeUndefined();
            expect(savedPlaybook?.id).toBe('weekly-deals-video');
            expect(savedPlaybook?.name).toBe('Weekly Deals Video');
            expect(savedPlaybook?.agent).toBe('craig');
            expect(savedPlaybook?.category).toBe('marketing');
            expect(savedPlaybook?.status).toBe('active');
            expect(savedPlaybook?.requiresApproval).toBe(true);
            expect(savedPlaybook?.steps).toBeDefined();
            expect(savedPlaybook?.steps?.length).toBeGreaterThan(0);
        });

        it('should include all required steps in Weekly Deals template', async () => {
            mockGet.mockResolvedValue({ exists: false });
            const savedPlaybooks: Partial<Playbook>[] = [];

            mockSet.mockImplementation(async (data: Partial<Playbook>) => {
                savedPlaybooks.push(data);
            });

            const { seedPlaybookTemplates } = await import('../seed-playbooks');

            await seedPlaybookTemplates();

            const savedPlaybook = savedPlaybooks.find(p => p.id === 'weekly-deals-video');
            const steps = savedPlaybook?.steps || [];
            const stepActions = steps.map(s => s.action);

            expect(stepActions).toContain('fetch_deals');
            expect(stepActions).toContain('generate_video');
            expect(stepActions).toContain('generate_caption');
            expect(stepActions).toContain('review');
            expect(stepActions).toContain('submit_approval');
            expect(stepActions).toContain('notify');
        });

        it('should include schedule trigger for Weekly Deals', async () => {
            mockGet.mockResolvedValue({ exists: false });
            const savedPlaybooks: Partial<Playbook>[] = [];

            mockSet.mockImplementation(async (data: Partial<Playbook>) => {
                savedPlaybooks.push(data);
            });

            const { seedPlaybookTemplates } = await import('../seed-playbooks');

            await seedPlaybookTemplates();

            const savedPlaybook = savedPlaybooks.find(p => p.id === 'weekly-deals-video');

            expect(savedPlaybook?.triggers).toBeDefined();
            expect(savedPlaybook?.triggers?.length).toBeGreaterThan(0);

            const scheduleTrigger = savedPlaybook?.triggers?.[0];
            expect(scheduleTrigger?.type).toBe('schedule');
            expect(scheduleTrigger?.cron).toBe('0 9 * * 1'); // Monday 9am
        });

        it('should set correct metadata for templates', async () => {
            mockGet.mockResolvedValue({ exists: false });
            const savedPlaybooks: Partial<Playbook>[] = [];

            mockSet.mockImplementation(async (data: Partial<Playbook>) => {
                savedPlaybooks.push(data);
            });

            const { seedPlaybookTemplates } = await import('../seed-playbooks');

            await seedPlaybookTemplates();

            const savedPlaybook = savedPlaybooks.find(p => p.id === 'weekly-deals-video');

            expect(savedPlaybook?.metadata).toBeDefined();
            expect(savedPlaybook?.metadata?.estimatedDuration).toBeDefined();
            expect(savedPlaybook?.metadata?.estimatedCost).toBeDefined();
        });
    });

    describe('installPlaybookTemplate', () => {
        it('should successfully install template for an org', async () => {
            mockGet.mockImplementation(async () => ({
                exists: true,
                data: () => ({
                    id: 'weekly-deals-video',
                    name: 'Weekly Deals Video',
                    steps: [],
                    triggers: [],
                }),
            }));

            // Template exists, playbook doesn't
            mockGet
                .mockResolvedValueOnce({
                    exists: true,
                    data: () => ({
                        id: 'weekly-deals-video',
                        name: 'Weekly Deals Video',
                    }),
                })
                .mockResolvedValueOnce({ exists: false });

            mockSet.mockResolvedValue(undefined);

            const { installPlaybookTemplate } = await import('../seed-playbooks');

            const result = await installPlaybookTemplate('weekly-deals-video', 'org_test');

            expect(result.success).toBe(true);
            expect(result.playbookId).toBe('org_test_weekly-deals-video');
        });

        it('should fail if template does not exist', async () => {
            mockGet.mockResolvedValue({ exists: false });

            const { installPlaybookTemplate } = await import('../seed-playbooks');

            const result = await installPlaybookTemplate('non-existent-template', 'org_test');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Template not found');
        });

        it('should fail if playbook already installed for org', async () => {
            // Template exists, playbook also exists
            mockGet
                .mockResolvedValueOnce({
                    exists: true,
                    data: () => ({
                        id: 'weekly-deals-video',
                        name: 'Weekly Deals Video',
                    }),
                })
                .mockResolvedValueOnce({ exists: true });

            const { installPlaybookTemplate } = await import('../seed-playbooks');

            const result = await installPlaybookTemplate('weekly-deals-video', 'org_test');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Playbook already installed for this org');
        });

        it('should set correct orgId and templateId on installed playbook', async () => {
            mockGet
                .mockResolvedValueOnce({
                    exists: true,
                    data: () => ({
                        id: 'weekly-deals-video',
                        name: 'Weekly Deals Video',
                        steps: [],
                    }),
                })
                .mockResolvedValueOnce({ exists: false });

            let installedPlaybook: Partial<Playbook> | null = null;

            mockSet.mockImplementation(async (data: Partial<Playbook>) => {
                installedPlaybook = data;
            });

            const { installPlaybookTemplate } = await import('../seed-playbooks');

            await installPlaybookTemplate('weekly-deals-video', 'org_thrive_syracuse');

            expect(installedPlaybook).not.toBeNull();
            expect(installedPlaybook?.orgId).toBe('org_thrive_syracuse');
            expect(installedPlaybook?.templateId).toBe('weekly-deals-video');
            expect(installedPlaybook?.id).toBe('org_thrive_syracuse_weekly-deals-video');
            expect(installedPlaybook?.isCustom).toBe(false);
        });

        it('should reset counters on installed playbook', async () => {
            mockGet
                .mockResolvedValueOnce({
                    exists: true,
                    data: () => ({
                        id: 'weekly-deals-video',
                        runCount: 999,
                        successCount: 888,
                        failureCount: 111,
                    }),
                })
                .mockResolvedValueOnce({ exists: false });

            let installedPlaybook: Partial<Playbook> | null = null;

            mockSet.mockImplementation(async (data: Partial<Playbook>) => {
                installedPlaybook = data;
            });

            const { installPlaybookTemplate } = await import('../seed-playbooks');

            await installPlaybookTemplate('weekly-deals-video', 'org_test');

            expect(installedPlaybook?.runCount).toBe(0);
            expect(installedPlaybook?.successCount).toBe(0);
            expect(installedPlaybook?.failureCount).toBe(0);
        });
    });

    describe('Template Validation', () => {
        it('should include Daily Product Spotlight template', async () => {
            mockGet.mockResolvedValue({ exists: false });
            const savedTemplates: Partial<Playbook>[] = [];

            mockSet.mockImplementation(async (data: Partial<Playbook>) => {
                savedTemplates.push(data);
            });

            const { seedPlaybookTemplates } = await import('../seed-playbooks');

            await seedPlaybookTemplates();

            const spotlight = savedTemplates.find(t => t.id === 'daily-product-spotlight');

            expect(spotlight).toBeDefined();
            expect(spotlight?.category).toBe('marketing');
            expect(spotlight?.agent).toBe('craig');
            expect(spotlight?.steps?.some(s => s.action === 'generate_image')).toBe(true);
        });

        it('should include Competitor Price Alert template', async () => {
            mockGet.mockResolvedValue({ exists: false });
            const savedTemplates: Partial<Playbook>[] = [];

            mockSet.mockImplementation(async (data: Partial<Playbook>) => {
                savedTemplates.push(data);
            });

            const { seedPlaybookTemplates } = await import('../seed-playbooks');

            await seedPlaybookTemplates();

            const alert = savedTemplates.find(t => t.id === 'competitor-price-alert');

            expect(alert).toBeDefined();
            expect(alert?.category).toBe('intel');
            expect(alert?.agent).toBe('ezal');
            expect(alert?.steps?.some(s => s.action === 'generate_video')).toBe(true);
            expect(alert?.requiresApproval).toBe(false);
        });
    });
});
