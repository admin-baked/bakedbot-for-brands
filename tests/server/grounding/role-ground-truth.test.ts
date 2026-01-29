/**
 * Unit tests for Role-Based Ground Truth Server Actions (v2.0)
 *
 * Tests CRUD operations for role-specific ground truth with preset prompts,
 * workflow guides, and tenant overrides.
 */

import {
    getRoleGroundTruth,
    getMergedGroundTruth,
    getPresetPrompts,
    getWorkflowGuides,
    upsertPresetPrompt,
    deletePresetPrompt,
    upsertWorkflowGuide,
    addTenantPresetOverride,
    disableTenantPreset,
    enableTenantPreset,
    getTenantOverrides,
    deleteTenantPresetOverride,
} from '@/server/actions/role-ground-truth';
import { getAdminFirestore } from '@/firebase/admin';
import { requireUser } from '@/server/auth/auth';
import type { RoleGroundTruth, PresetPromptTemplate, WorkflowGuide, TenantGroundTruthOverride } from '@/types/ground-truth';

// Mock dependencies
jest.mock('@/firebase/admin', () => ({
    getAdminFirestore: jest.fn(),
}));

jest.mock('@/server/auth/auth', () => ({
    requireUser: jest.fn(),
}));

// Mock Firestore
const mockDocGet = jest.fn(); // For document.get()
const mockCollectionGet = jest.fn(); // For collection.get()
const mockSet = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();
const mockOrderBy = jest.fn();
const mockDoc = jest.fn();
const mockCollection = jest.fn();

// Need to declare mockDocRef first so mockSubCollectionRef can reference it
let mockDocRef: any;

// Mock subcollection reference (for categories, qa_pairs, ground_truth_overrides)
const mockSubCollectionRef = {
    get: mockCollectionGet,
    doc: jest.fn(() => mockDocRef), // Return mockDocRef for nested doc calls
};

mockDocRef = {
    get: mockDocGet,
    set: mockSet,
    update: mockUpdate,
    delete: mockDelete,
    collection: jest.fn((name) => {
        // Return subcollection ref for nested collections
        if (name === 'categories' || name === 'qa_pairs' || name === 'ground_truth_overrides') {
            return mockSubCollectionRef;
        }
        return mockCollectionRef;
    }),
};

const mockCollectionRef = {
    get: mockCollectionGet,
    doc: jest.fn(() => mockDocRef),
    orderBy: mockOrderBy,
};

const mockFirestore = {
    collection: mockCollection,
};

// Test data
const mockUser = {
    uid: 'user123',
    email: 'test@example.com',
    role: 'super_user',
};

const mockPresetPrompt: PresetPromptTemplate = {
    id: 'brand-product-launch',
    label: 'Product Launch',
    description: 'Launch a new product with coordinated marketing',
    threadType: 'campaign',
    defaultAgent: 'craig',
    promptTemplate: 'Launch {{product_name}} on {{target_date}}',
    variables: ['product_name', 'target_date'],
    category: 'marketing',
    roles: ['brand'],
    version: '2.0',
    createdAt: '2026-01-29T00:00:00Z',
    updatedAt: '2026-01-29T00:00:00Z',
};

const mockWorkflowGuide: WorkflowGuide = {
    id: 'brand-campaign-workflow',
    title: 'Multi-Channel Campaign',
    description: 'Run a coordinated campaign across multiple channels',
    steps: [
        {
            title: 'Define objectives',
            description: 'Set campaign goals and KPIs',
            agentId: 'craig',
            toolsUsed: [],
            expectedOutput: 'Campaign brief document',
        },
        {
            title: 'Create content',
            description: 'Generate marketing materials',
            agentId: 'craig',
            toolsUsed: ['creative_tool'],
            expectedOutput: 'Content calendar',
        },
    ],
    tags: ['marketing', 'campaign'],
    difficulty: 'intermediate',
    estimatedTime: '2-3 hours',
};

const mockRoleGroundTruth: RoleGroundTruth = {
    role: 'brand',
    metadata: {
        dispensary: 'Brand Ground Truth',
        version: '2.0',
        created: '2026-01-29T00:00:00Z',
        last_updated: '2026-01-29T00:00:00Z',
        total_qa_pairs: 0,
        author: 'System',
    },
    categories: {},
    evaluation_config: {
        scoring_weights: {
            keyword_coverage: 0.3,
            intent_match: 0.4,
            factual_accuracy: 0.2,
            tone_appropriateness: 0.1,
        },
        target_metrics: {
            overall_accuracy: 0.85,
            compliance_accuracy: 1.0,
            product_recommendations: 0.9,
            store_information: 0.95,
        },
        priority_levels: {
            critical: 'Must be 100% accurate',
            high: 'Target 95% accuracy',
            medium: 'Target 85% accuracy',
        },
    },
    maintenance_schedule: {
        weekly: [],
        monthly: [],
        quarterly: [],
    },
    preset_prompts: [mockPresetPrompt],
    workflow_guides: [mockWorkflowGuide],
};

const mockTenantOverride: TenantGroundTruthOverride = {
    tenantId: 'tenant123',
    roleId: 'brand',
    preset_prompts: [],
    disabled_presets: [],
    custom_workflows: [],
    createdAt: '2026-01-29T00:00:00Z',
    updatedAt: '2026-01-29T00:00:00Z',
};

describe('Role-Based Ground Truth Server Actions', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Setup default mocks - chain properly
        mockCollection.mockReturnValue(mockCollectionRef);
        mockCollectionRef.doc.mockReturnValue(mockDocRef);
        mockOrderBy.mockReturnValue(mockCollectionRef);

        // Mock subcollection get() to return empty docs by default
        mockCollectionGet.mockResolvedValue({ docs: [] });

        (getAdminFirestore as jest.Mock).mockReturnValue(mockFirestore);
        (requireUser as jest.Mock).mockResolvedValue(mockUser);
    });

    describe('getRoleGroundTruth', () => {
        it('loads role ground truth with QA pairs and preset prompts', async () => {
            // Mock ground truth document
            mockDocGet.mockResolvedValueOnce({
                exists: true,
                data: () => mockRoleGroundTruth,
            });

            // Mock categories collection
            mockDocGet.mockResolvedValueOnce({
                docs: [],
            });

            const result = await getRoleGroundTruth('brand');

            expect(result.success).toBe(true);
            expect(result.data?.role).toBe('brand');
            expect(result.data?.preset_prompts).toHaveLength(1);
            expect(mockCollection).toHaveBeenCalledWith('ground_truth_v2');
        });

        it('returns error if role ground truth not found', async () => {
            mockDocGet.mockResolvedValueOnce({
                exists: false,
            });

            const result = await getRoleGroundTruth('brand');

            expect(result.success).toBe(false);
            expect(result.error).toBe('NOT_FOUND');
        });

        it('enforces role-based access control', async () => {
            (requireUser as jest.Mock).mockResolvedValueOnce({
                uid: 'user123',
                email: 'test@example.com',
                role: 'brand', // Not owner
            });

            mockDocGet.mockResolvedValueOnce({
                exists: true,
                data: () => mockRoleGroundTruth,
            });

            mockDocGet.mockResolvedValueOnce({
                docs: [],
            });

            const result = await getRoleGroundTruth('brand');

            expect(result.success).toBe(true);
        });

        it('denies access to super_user ground truth for brand role', async () => {
            (requireUser as jest.Mock).mockResolvedValueOnce({
                uid: 'user123',
                email: 'test@example.com',
                role: 'brand',
            });

            const result = await getRoleGroundTruth('super_user');

            expect(result.success).toBe(false);
            expect(result.error).toBe('FORBIDDEN');
        });
    });

    describe('getMergedGroundTruth', () => {
        it('merges global role ground truth with tenant overrides', async () => {
            // Mock base ground truth
            mockDocGet.mockResolvedValueOnce({
                exists: true,
                data: () => mockRoleGroundTruth,
            });

            mockDocGet.mockResolvedValueOnce({
                docs: [],
            });

            // Mock tenant override
            mockDocGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({
                    ...mockTenantOverride,
                    disabled_presets: ['brand-product-launch'],
                }),
            });

            const result = await getMergedGroundTruth('brand', 'tenant123');

            expect(result.success).toBe(true);
            expect(result.data?.preset_prompts).toHaveLength(0); // Disabled preset filtered out
        });

        it('returns base ground truth if no tenant overrides exist', async () => {
            mockDocGet.mockResolvedValueOnce({
                exists: true,
                data: () => mockRoleGroundTruth,
            });

            mockDocGet.mockResolvedValueOnce({
                docs: [],
            });

            mockDocGet.mockResolvedValueOnce({
                exists: false,
            });

            const result = await getMergedGroundTruth('brand', 'tenant123');

            expect(result.success).toBe(true);
            expect(result.data?.preset_prompts).toHaveLength(1);
        });
    });

    describe('getPresetPrompts', () => {
        it('returns preset prompts for a role', async () => {
            mockDocGet.mockResolvedValueOnce({
                exists: true,
                data: () => mockRoleGroundTruth,
            });

            mockDocGet.mockResolvedValueOnce({
                docs: [],
            });

            const result = await getPresetPrompts('brand');

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(1);
            expect(result.data?.[0].id).toBe('brand-product-launch');
        });

        it('includes tenant custom presets when tenantId provided', async () => {
            mockDocGet.mockResolvedValueOnce({
                exists: true,
                data: () => mockRoleGroundTruth,
            });

            mockDocGet.mockResolvedValueOnce({
                docs: [],
            });

            const customPreset = { ...mockPresetPrompt, id: 'custom-preset' };
            mockDocGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({
                    ...mockTenantOverride,
                    preset_prompts: [customPreset],
                }),
            });

            const result = await getPresetPrompts('brand', 'tenant123');

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(2);
        });
    });

    describe('getWorkflowGuides', () => {
        it('returns workflow guides for a role', async () => {
            mockDocGet.mockResolvedValueOnce({
                exists: true,
                data: () => mockRoleGroundTruth,
            });

            mockDocGet.mockResolvedValueOnce({
                docs: [],
            });

            const result = await getWorkflowGuides('brand');

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(1);
            expect(result.data?.[0].id).toBe('brand-campaign-workflow');
        });
    });

    describe('upsertPresetPrompt', () => {
        it('creates a new preset prompt', async () => {
            mockDocGet.mockResolvedValueOnce({
                exists: true,
                data: () => mockRoleGroundTruth,
            });

            mockDocGet.mockResolvedValueOnce({
                docs: [],
            });

            mockUpdate.mockResolvedValueOnce(undefined);

            const result = await upsertPresetPrompt('brand', mockPresetPrompt);

            expect(result.success).toBe(true);
            expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
                preset_prompts: expect.arrayContaining([mockPresetPrompt]),
            }));
        });

        it('updates existing preset prompt', async () => {
            mockDocGet.mockResolvedValueOnce({
                exists: true,
                data: () => mockRoleGroundTruth,
            });

            mockDocGet.mockResolvedValueOnce({
                docs: [],
            });

            mockUpdate.mockResolvedValueOnce(undefined);

            const updatedPreset = { ...mockPresetPrompt, label: 'Updated Launch' };
            const result = await upsertPresetPrompt('brand', updatedPreset);

            expect(result.success).toBe(true);
            expect(mockUpdate).toHaveBeenCalled();
        });

        it('denies access for non-owner users', async () => {
            (requireUser as jest.Mock).mockResolvedValueOnce({
                uid: 'user123',
                email: 'test@example.com',
                role: 'brand',
            });

            const result = await upsertPresetPrompt('brand', mockPresetPrompt);

            expect(result.success).toBe(false);
            expect(result.error).toBe('FORBIDDEN');
        });
    });

    describe('deletePresetPrompt', () => {
        it('deletes a preset prompt', async () => {
            mockDocGet.mockResolvedValueOnce({
                exists: true,
                data: () => mockRoleGroundTruth,
            });

            mockDocGet.mockResolvedValueOnce({
                docs: [],
            });

            mockUpdate.mockResolvedValueOnce(undefined);

            const result = await deletePresetPrompt('brand', 'brand-product-launch');

            expect(result.success).toBe(true);
            expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
                preset_prompts: [],
            }));
        });
    });

    describe('upsertWorkflowGuide', () => {
        it('creates a new workflow guide', async () => {
            mockDocGet.mockResolvedValueOnce({
                exists: true,
                data: () => mockRoleGroundTruth,
            });

            mockDocGet.mockResolvedValueOnce({
                docs: [],
            });

            mockUpdate.mockResolvedValueOnce(undefined);

            const result = await upsertWorkflowGuide('brand', mockWorkflowGuide);

            expect(result.success).toBe(true);
            expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
                workflow_guides: expect.arrayContaining([mockWorkflowGuide]),
            }));
        });

        it('validates workflow guide schema', async () => {
            const invalidWorkflow = { ...mockWorkflowGuide, steps: 'invalid' } as any;

            const result = await upsertWorkflowGuide('brand', invalidWorkflow);

            expect(result.success).toBe(false);
            expect(result.message).toContain('validation failed');
        });
    });

    describe('addTenantPresetOverride', () => {
        it('adds a custom preset prompt for tenant', async () => {
            // Mock user document fetch (happens in canManageTenantOverrides)
            mockDocGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({ role: 'super_user', brandId: 'tenant123' }),
            });

            // Mock tenant override document
            mockDocGet.mockResolvedValueOnce({
                exists: true,
                data: () => mockTenantOverride,
            });

            mockUpdate.mockResolvedValueOnce(undefined);

            const result = await addTenantPresetOverride('tenant123', 'brand', mockPresetPrompt);

            expect(result.success).toBe(true);
            expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
                preset_prompts: expect.arrayContaining([mockPresetPrompt]),
            }));
        });

        it('creates override document if not exists', async () => {
            // Mock user document fetch
            mockDocGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({ role: 'super_user', brandId: 'tenant123' }),
            });

            // Mock tenant override document (not found)
            mockDocGet.mockResolvedValueOnce({
                exists: false,
            });

            mockSet.mockResolvedValueOnce(undefined);

            const result = await addTenantPresetOverride('tenant123', 'brand', mockPresetPrompt);

            expect(result.success).toBe(true);
            expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({
                tenantId: 'tenant123',
                roleId: 'brand',
                preset_prompts: [mockPresetPrompt],
            }));
        });
    });

    describe('disableTenantPreset', () => {
        it('disables a global preset for tenant', async () => {
            // Mock user document fetch
            mockDocGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({ role: 'super_user', brandId: 'tenant123' }),
            });

            // Mock tenant override document
            mockDocGet.mockResolvedValueOnce({
                exists: true,
                data: () => mockTenantOverride,
            });

            mockUpdate.mockResolvedValueOnce(undefined);

            const result = await disableTenantPreset('tenant123', 'brand', 'brand-product-launch');

            expect(result.success).toBe(true);
            expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
                disabled_presets: ['brand-product-launch'],
            }));
        });

        it('creates override document if not exists', async () => {
            // Mock user document fetch
            mockDocGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({ role: 'super_user', brandId: 'tenant123' }),
            });

            // Mock tenant override document (not found)
            mockDocGet.mockResolvedValueOnce({
                exists: false,
            });

            mockSet.mockResolvedValueOnce(undefined);

            const result = await disableTenantPreset('tenant123', 'brand', 'brand-product-launch');

            expect(result.success).toBe(true);
            expect(mockSet).toHaveBeenCalled();
        });
    });

    describe('enableTenantPreset', () => {
        it('re-enables a disabled preset for tenant', async () => {
            // Mock user document fetch
            mockDocGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({ role: 'super_user', brandId: 'tenant123' }),
            });

            // Mock tenant override document with disabled preset
            mockDocGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({
                    ...mockTenantOverride,
                    disabled_presets: ['brand-product-launch'],
                }),
            });

            mockUpdate.mockResolvedValueOnce(undefined);

            const result = await enableTenantPreset('tenant123', 'brand', 'brand-product-launch');

            expect(result.success).toBe(true);
            expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
                disabled_presets: [],
            }));
        });
    });

    describe('getTenantOverrides', () => {
        it('returns tenant overrides for a role', async () => {
            // Mock user document fetch
            mockDocGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({ role: 'super_user', brandId: 'tenant123' }),
            });

            // Mock tenant override document
            mockDocGet.mockResolvedValueOnce({
                exists: true,
                data: () => mockTenantOverride,
            });

            const result = await getTenantOverrides('tenant123', 'brand');

            expect(result.success).toBe(true);
            expect(result.data?.tenantId).toBe('tenant123');
            expect(result.data?.roleId).toBe('brand');
        });

        it('returns empty override if not found', async () => {
            // Mock user document fetch
            mockDocGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({ role: 'super_user', brandId: 'tenant123' }),
            });

            // Mock tenant override document (not found)
            mockDocGet.mockResolvedValueOnce({
                exists: false,
            });

            const result = await getTenantOverrides('tenant123', 'brand');

            expect(result.success).toBe(true);
            expect(result.data?.preset_prompts).toHaveLength(0);
        });
    });

    describe('deleteTenantPresetOverride', () => {
        it('deletes a custom tenant preset', async () => {
            // Mock user document fetch
            mockDocGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({ role: 'super_user', brandId: 'tenant123' }),
            });

            // Mock tenant override document with preset
            mockDocGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({
                    ...mockTenantOverride,
                    preset_prompts: [mockPresetPrompt],
                }),
            });

            mockUpdate.mockResolvedValueOnce(undefined);

            const result = await deleteTenantPresetOverride('tenant123', 'brand', 'brand-product-launch');

            expect(result.success).toBe(true);
            expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
                preset_prompts: [],
            }));
        });

        it('returns error if override document not found', async () => {
            // Mock user document fetch
            mockDocGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({ role: 'super_user', brandId: 'tenant123' }),
            });

            // Mock tenant override document (not found)
            mockDocGet.mockResolvedValueOnce({
                exists: false,
            });

            const result = await deleteTenantPresetOverride('tenant123', 'brand', 'brand-product-launch');

            expect(result.success).toBe(false);
            expect(result.error).toBe('NOT_FOUND');
        });
    });
});
