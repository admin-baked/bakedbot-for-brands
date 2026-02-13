/**
 * Integration tests for Role-Based Ground Truth Loader (v2.0)
 *
 * Tests the dynamic loader that integrates with agent initialization
 * to provide role-specific context, QA pairs, and workflow guidance.
 */

import {
    loadRoleGroundTruth,
    buildRoleSystemPrompt,
    getPresetPromptsForRole,
    getWorkflowGuidesForRole,
    hasRoleGroundTruth,
    invalidateRoleGroundTruthCache,
} from '@/server/grounding/role-loader';
import { getAdminFirestore } from '@/firebase/admin';
import type { RoleGroundTruth, PresetPromptTemplate, WorkflowGuide } from '@/types/ground-truth';

// Mock dependencies
jest.mock('@/firebase/admin', () => ({
    getAdminFirestore: jest.fn(),
}));

// Mock Firestore
const mockGet = jest.fn();
const mockDoc = jest.fn();
const mockCollection = jest.fn();
const mockOrderBy = jest.fn();

const mockDocRef = {
    get: mockGet,
    collection: mockCollection,
};

const mockCollectionRef = {
    get: mockGet,
    doc: mockDoc,
    orderBy: mockOrderBy,
};

const mockFirestore = {
    collection: mockCollection,
};

// Test data
const mockPresetPrompt: PresetPromptTemplate = {
    id: 'brand-product-launch',
    label: 'Product Launch',
    description: 'Launch a new product',
    threadType: 'campaign',
    defaultAgent: 'craig',
    promptTemplate: 'Launch {{product_name}} on {{target_date}}',
    variables: ['product_name', 'target_date'],
    category: 'marketing',
    roles: ['brand'],
    version: '2.0',
};

const mockWorkflowGuide: WorkflowGuide = {
    id: 'brand-campaign-workflow',
    title: 'Multi-Channel Campaign',
    description: 'Run a coordinated campaign',
    steps: [
        {
            title: 'Define objectives',
            description: 'Set campaign goals',
            agentId: 'craig',
            toolsUsed: [],
            expectedOutput: 'Campaign brief',
        },
    ],
    tags: ['marketing'],
    difficulty: 'intermediate',
};

const mockRoleGroundTruth: RoleGroundTruth = {
    role: 'brand',
    metadata: {
        dispensary: 'Brand Ground Truth',
        address: 'N/A',
        version: '2.0',
        created: '2026-01-29T00:00:00Z',
        last_updated: '2026-01-29T00:00:00Z',
        total_qa_pairs: 5,
        author: 'System',
    },
    categories: {
        marketing: {
            description: 'Marketing and campaigns',
            qa_pairs: [
                {
                    id: 'marketing-1',
                    question: 'How do I create a product launch campaign?',
                    ideal_answer: 'Start by defining your target audience and key messaging...',
                    context: 'Product launches',
                    intent: 'Create campaign',
                    keywords: ['launch', 'campaign', 'product'],
                    priority: 'high',
                },
                {
                    id: 'marketing-2',
                    question: 'What are best practices for email campaigns?',
                    ideal_answer: 'Segment your audience, personalize content...',
                    context: 'Email marketing',
                    intent: 'Email best practices',
                    keywords: ['email', 'campaign', 'best practices'],
                    priority: 'medium',
                },
            ],
        },
        compliance: {
            description: 'Compliance and regulations',
            qa_pairs: [
                {
                    id: 'compliance-1',
                    question: 'What are cannabis advertising restrictions?',
                    ideal_answer: 'Federal and state regulations prohibit...',
                    context: 'Advertising compliance',
                    intent: 'Compliance guidance',
                    keywords: ['advertising', 'compliance', 'restrictions'],
                    priority: 'critical',
                },
            ],
        },
    },
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
    agent_personas: {
        craig: {
            system_prompt_additions: 'You are helping a cannabis brand with marketing.',
            example_responses: ['I can help you create a product launch campaign...'],
            dos: ['Focus on compliant messaging', 'Suggest multi-channel strategies'],
            donts: ['Make health claims', 'Target minors'],
        },
    },
};

describe('Role-Based Ground Truth Loader', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Setup default mocks
        mockDoc.mockReturnValue(mockDocRef);
        mockCollection.mockReturnValue(mockCollectionRef);
        mockOrderBy.mockReturnValue(mockCollectionRef);

        (getAdminFirestore as jest.Mock).mockReturnValue(mockFirestore);

        // Invalidate cache before each test
        invalidateRoleGroundTruthCache('brand');
        invalidateRoleGroundTruthCache('dispensary');
        invalidateRoleGroundTruthCache('super_user');
        invalidateRoleGroundTruthCache('customer');
    });

    describe('loadRoleGroundTruth', () => {
        it('loads base role ground truth from Firestore', async () => {
            mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({
                    metadata: mockRoleGroundTruth.metadata,
                    evaluation_config: mockRoleGroundTruth.evaluation_config,
                    maintenance_schedule: mockRoleGroundTruth.maintenance_schedule,
                    preset_prompts: mockRoleGroundTruth.preset_prompts,
                    workflow_guides: mockRoleGroundTruth.workflow_guides,
                    agent_personas: mockRoleGroundTruth.agent_personas,
                }),
            });

            // Mock categories subcollection
            mockGet.mockResolvedValueOnce({
                docs: [
                    {
                        id: 'marketing',
                        data: () => ({ description: 'Marketing and campaigns', sort_order: 1 }),
                        ref: {
                            collection: jest.fn().mockReturnValue({
                                get: jest.fn().mockResolvedValue({
                                    docs: mockRoleGroundTruth.categories.marketing.qa_pairs.map(qa => ({
                                        id: qa.id,
                                        data: () => qa,
                                    })),
                                }),
                            }),
                        },
                    },
                ],
            });

            const result = await loadRoleGroundTruth('brand');

            expect(result).not.toBeNull();
            expect(result?.role).toBe('brand');
            expect(result?.preset_prompts).toHaveLength(1);
            expect(result?.workflow_guides).toHaveLength(1);
            expect(result?.categories.marketing).toBeDefined();
        });

        it('merges tenant overrides when tenantId provided', async () => {
            // Mock base ground truth
            mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({
                    metadata: mockRoleGroundTruth.metadata,
                    evaluation_config: mockRoleGroundTruth.evaluation_config,
                    maintenance_schedule: mockRoleGroundTruth.maintenance_schedule,
                    preset_prompts: mockRoleGroundTruth.preset_prompts,
                    workflow_guides: mockRoleGroundTruth.workflow_guides,
                    agent_personas: mockRoleGroundTruth.agent_personas,
                }),
            });

            mockGet.mockResolvedValueOnce({
                docs: [],
            });

            // Mock tenant override
            const customPreset = { ...mockPresetPrompt, id: 'custom-preset', label: 'Custom Launch' };
            mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({
                    tenantId: 'tenant123',
                    roleId: 'brand',
                    preset_prompts: [customPreset],
                    disabled_presets: ['brand-product-launch'],
                    custom_workflows: [],
                    createdAt: '2026-01-29T00:00:00Z',
                    updatedAt: '2026-01-29T00:00:00Z',
                }),
            });

            const result = await loadRoleGroundTruth('brand', 'tenant123');

            expect(result).not.toBeNull();
            expect(result?.preset_prompts).toHaveLength(1);
            expect(result?.preset_prompts[0].id).toBe('custom-preset');
        });

        it('returns null if role ground truth does not exist', async () => {
            mockGet.mockResolvedValueOnce({
                exists: false,
            });

            const result = await loadRoleGroundTruth('brand');

            expect(result).toBeNull();
        });

        it('handles Firebase unavailable gracefully', async () => {
            (getAdminFirestore as jest.Mock).mockImplementation(() => {
                throw new Error('Firebase not initialized');
            });

            const result = await loadRoleGroundTruth('brand');

            expect(result).toBeNull();
        });
    });

    describe('buildRoleSystemPrompt', () => {
        it('builds full system prompt with all sections', () => {
            const prompt = buildRoleSystemPrompt(mockRoleGroundTruth, 'craig', 'full');

            expect(prompt).toContain('ROLE-SPECIFIC GUIDANCE');
            expect(prompt).toContain('You are helping a cannabis brand with marketing');
            expect(prompt).toContain('DO:');
            expect(prompt).toContain('Focus on compliant messaging');
            expect(prompt).toContain('DON\'T:');
            expect(prompt).toContain('Make health claims');
            expect(prompt).toContain('ROLE-SPECIFIC KNOWLEDGE BASE');
            expect(prompt).toContain('How do I create a product launch campaign?');
            expect(prompt).toContain('AVAILABLE WORKFLOWS');
            expect(prompt).toContain('Multi-Channel Campaign');
        });

        it('builds condensed prompt with critical and high priority QA only', () => {
            const prompt = buildRoleSystemPrompt(mockRoleGroundTruth, 'craig', 'condensed');

            expect(prompt).toContain('ROLE-SPECIFIC KNOWLEDGE BASE');
            expect(prompt).toContain('How do I create a product launch campaign?'); // High priority
            expect(prompt).toContain('What are cannabis advertising restrictions?'); // Critical
            expect(prompt).not.toContain('What are best practices for email campaigns?'); // Medium priority
        });

        it('builds critical-only prompt without workflows', () => {
            const prompt = buildRoleSystemPrompt(mockRoleGroundTruth, 'craig', 'critical_only');

            expect(prompt).toContain('ROLE-SPECIFIC KNOWLEDGE BASE');
            expect(prompt).toContain('What are cannabis advertising restrictions?'); // Critical only
            expect(prompt).not.toContain('AVAILABLE WORKFLOWS');
        });

        it('handles agent without persona customization', () => {
            const prompt = buildRoleSystemPrompt(mockRoleGroundTruth, 'smokey', 'full');

            expect(prompt).toContain('ROLE-SPECIFIC KNOWLEDGE BASE');
            expect(prompt).not.toContain('ROLE-SPECIFIC GUIDANCE'); // No persona for Smokey
        });

        it('returns empty string if no content to add', () => {
            const emptyGT = {
                ...mockRoleGroundTruth,
                categories: {},
                workflow_guides: [],
                agent_personas: undefined,
            };

            const prompt = buildRoleSystemPrompt(emptyGT, 'craig', 'full');

            expect(prompt).toBe('');
        });
    });

    describe('getPresetPromptsForRole', () => {
        it('loads preset prompts for a role', async () => {
            mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({
                    metadata: mockRoleGroundTruth.metadata,
                    evaluation_config: mockRoleGroundTruth.evaluation_config,
                    maintenance_schedule: mockRoleGroundTruth.maintenance_schedule,
                    preset_prompts: mockRoleGroundTruth.preset_prompts,
                    workflow_guides: mockRoleGroundTruth.workflow_guides,
                }),
            });

            mockGet.mockResolvedValueOnce({
                docs: [],
            });

            const result = await getPresetPromptsForRole('brand');

            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('brand-product-launch');
        });

        it('returns empty array if role not found', async () => {
            mockGet.mockResolvedValueOnce({
                exists: false,
            });

            const result = await getPresetPromptsForRole('brand');

            expect(result).toEqual([]);
        });
    });

    describe('getWorkflowGuidesForRole', () => {
        it('loads workflow guides for a role', async () => {
            mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({
                    metadata: mockRoleGroundTruth.metadata,
                    evaluation_config: mockRoleGroundTruth.evaluation_config,
                    maintenance_schedule: mockRoleGroundTruth.maintenance_schedule,
                    preset_prompts: mockRoleGroundTruth.preset_prompts,
                    workflow_guides: mockRoleGroundTruth.workflow_guides,
                }),
            });

            mockGet.mockResolvedValueOnce({
                docs: [],
            });

            const result = await getWorkflowGuidesForRole('brand');

            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('brand-campaign-workflow');
        });
    });

    describe('hasRoleGroundTruth', () => {
        it('returns true if role ground truth exists', async () => {
            mockGet.mockResolvedValueOnce({
                exists: true,
            });

            const result = await hasRoleGroundTruth('brand');

            expect(result).toBe(true);
        });

        it('returns false if role ground truth does not exist', async () => {
            mockGet.mockResolvedValueOnce({
                exists: false,
            });

            const result = await hasRoleGroundTruth('brand');

            expect(result).toBe(false);
        });
    });

    describe('Cache behavior', () => {
        it('uses cached data for subsequent calls within TTL', async () => {
            // First call
            mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({
                    metadata: mockRoleGroundTruth.metadata,
                    evaluation_config: mockRoleGroundTruth.evaluation_config,
                    maintenance_schedule: mockRoleGroundTruth.maintenance_schedule,
                    preset_prompts: mockRoleGroundTruth.preset_prompts,
                    workflow_guides: mockRoleGroundTruth.workflow_guides,
                }),
            });

            mockGet.mockResolvedValueOnce({
                docs: [],
            });

            await loadRoleGroundTruth('brand');

            // Second call (should use cache)
            const result = await loadRoleGroundTruth('brand');

            expect(result).not.toBeNull();
            expect(mockGet).toHaveBeenCalledTimes(2); // Only called once due to cache
        });

        it('invalidates cache when explicitly called', async () => {
            mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({
                    metadata: mockRoleGroundTruth.metadata,
                    evaluation_config: mockRoleGroundTruth.evaluation_config,
                    maintenance_schedule: mockRoleGroundTruth.maintenance_schedule,
                    preset_prompts: mockRoleGroundTruth.preset_prompts,
                    workflow_guides: mockRoleGroundTruth.workflow_guides,
                }),
            });

            mockGet.mockResolvedValueOnce({
                docs: [],
            });

            await loadRoleGroundTruth('brand');

            // Invalidate cache
            invalidateRoleGroundTruthCache('brand');

            // Next call should hit Firestore again
            mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({
                    metadata: mockRoleGroundTruth.metadata,
                    evaluation_config: mockRoleGroundTruth.evaluation_config,
                    maintenance_schedule: mockRoleGroundTruth.maintenance_schedule,
                    preset_prompts: mockRoleGroundTruth.preset_prompts,
                    workflow_guides: mockRoleGroundTruth.workflow_guides,
                }),
            });

            mockGet.mockResolvedValueOnce({
                docs: [],
            });

            await loadRoleGroundTruth('brand');

            expect(mockGet).toHaveBeenCalledTimes(4); // Called twice due to cache invalidation
        });

        it('maintains separate cache entries for different roles', async () => {
            // Load brand
            mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({
                    metadata: { ...mockRoleGroundTruth.metadata, dispensary: 'Brand GT' },
                    evaluation_config: mockRoleGroundTruth.evaluation_config,
                    maintenance_schedule: mockRoleGroundTruth.maintenance_schedule,
                    preset_prompts: mockRoleGroundTruth.preset_prompts,
                    workflow_guides: mockRoleGroundTruth.workflow_guides,
                }),
            });

            mockGet.mockResolvedValueOnce({
                docs: [],
            });

            const brandGT = await loadRoleGroundTruth('brand');

            // Load dispensary
            mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({
                    metadata: { ...mockRoleGroundTruth.metadata, dispensary: 'Dispensary GT' },
                    evaluation_config: mockRoleGroundTruth.evaluation_config,
                    maintenance_schedule: mockRoleGroundTruth.maintenance_schedule,
                    preset_prompts: [],
                    workflow_guides: [],
                }),
            });

            mockGet.mockResolvedValueOnce({
                docs: [],
            });

            const dispensaryGT = await loadRoleGroundTruth('dispensary');

            expect(brandGT?.metadata.dispensary).toBe('Brand GT');
            expect(dispensaryGT?.metadata.dispensary).toBe('Dispensary GT');
            expect(mockGet).toHaveBeenCalledTimes(4);
        });
    });
});
