jest.mock('@/server/agents/agent-runner', () => ({
    runAgentCore: jest.fn(),
}));

jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn(),
}));

jest.mock('@/server/repos/productRepo', () => ({
    makeProductRepo: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
    },
}));

jest.mock('@/app/actions/gamification', () => ({
    updateStreakAction: jest.fn().mockResolvedValue(undefined),
}));

import { runAgentCore } from '@/server/agents/agent-runner';
import { createServerClient } from '@/firebase/server-client';
import { makeProductRepo } from '@/server/repos/productRepo';
import { fetchMenuProducts, runConsumerAgent } from '../consumer-adapter';

const mockRunAgentCore = runAgentCore as jest.MockedFunction<typeof runAgentCore>;
const mockCreateServerClient = createServerClient as jest.MockedFunction<typeof createServerClient>;
const mockMakeProductRepo = makeProductRepo as jest.MockedFunction<typeof makeProductRepo>;

function createLocationFirestore(
    matches: Partial<Record<'orgId' | 'brandId', Record<string, Array<{ id: string; data?: Record<string, unknown> }>>>>
) {
    return {
        collection: jest.fn((name: string) => {
            if (name !== 'locations') {
                throw new Error(`Unexpected collection: ${name}`);
            }

            return {
                doc: jest.fn((id: string) => ({
                    get: jest.fn().mockResolvedValue({
                        exists: false,
                        id,
                        data: () => undefined,
                    }),
                })),
                where: jest.fn((field: 'orgId' | 'brandId', _op: string, value: string) => ({
                    limit: jest.fn(() => ({
                        get: jest.fn().mockResolvedValue({
                            empty: !(matches[field]?.[value]?.length),
                            docs: (matches[field]?.[value] || []).map((doc) => ({
                                id: doc.id,
                                data: () => doc.data || {},
                            })),
                        }),
                    })),
                })),
            };
        }),
    } as unknown as FirebaseFirestore.Firestore;
}

describe('consumer adapter', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('answers age requirement questions without invoking the agent runtime', async () => {
        const result = await runConsumerAgent('Are you 18+ or 21+?', {
            brandId: '10982',
            state: 'New York',
            products: [],
        });

        expect(result).toEqual({
            message: '21+ only. New York requires a valid ID.',
            products: [],
            clientAction: undefined,
        });
        expect(mockRunAgentCore).not.toHaveBeenCalled();
    });

    it('falls back to deterministic menu search when the agent returns no products', async () => {
        mockRunAgentCore.mockResolvedValue({
            content: "I couldn't find any products matching that description.",
            toolCalls: [],
        } as any);

        const result = await runConsumerAgent('Do you have any edibles?', {
            brandId: '10982',
            state: 'New York',
            products: [
                {
                    id: 'prod-edible-1',
                    name: 'Midnight Gummies',
                    category: 'Edibles',
                    price: 18,
                    description: 'CBN gummies for nighttime and sleep support.',
                    stock: 10,
                },
                {
                    id: 'prod-flower-1',
                    name: 'Blue Dream',
                    category: 'Flower',
                    price: 35,
                    description: 'Balanced daytime hybrid flower.',
                    stock: 10,
                },
            ],
        });

        expect(result.products).toHaveLength(1);
        expect(result.products[0]?.name).toBe('Midnight Gummies');
        expect(result.message.toLowerCase()).toContain('edible');
    });

    it('resolves public menu products through location aliases for org-backed brands', async () => {
        const mockFirestore = createLocationFirestore({
            orgId: {
                org_thrive_syracuse: [{ id: 'loc_thrive_syracuse' }],
            },
        });
        const mockRepo = {
            getAllByLocation: jest.fn(async (locationId: string) => (
                locationId === 'loc_thrive_syracuse' ? [{ id: 'prod-1', name: 'Calm Drops' }] : []
            )),
            getAllByBrand: jest.fn(async () => []),
        };

        mockCreateServerClient.mockResolvedValue({ firestore: mockFirestore } as never);
        mockMakeProductRepo.mockReturnValue(mockRepo as never);

        const result = await fetchMenuProducts('org_thrive_syracuse');

        expect(result).toEqual([{ id: 'prod-1', name: 'Calm Drops' }]);
        expect(mockRepo.getAllByLocation).toHaveBeenCalledWith('loc_thrive_syracuse');
        expect(mockRepo.getAllByBrand).not.toHaveBeenCalled();
    });

    it('falls back across org aliases when brand lookup is stored under a different prefix', async () => {
        const mockFirestore = createLocationFirestore({});
        const mockRepo = {
            getAllByLocation: jest.fn(async () => []),
            getAllByBrand: jest.fn(async (candidate: string) => (
                candidate === 'brand_thrive_syracuse' ? [{ id: 'prod-2', name: 'Social Flower' }] : []
            )),
        };

        mockCreateServerClient.mockResolvedValue({ firestore: mockFirestore } as never);
        mockMakeProductRepo.mockReturnValue(mockRepo as never);

        const result = await fetchMenuProducts('org_thrive_syracuse');

        expect(result).toEqual([{ id: 'prod-2', name: 'Social Flower' }]);
        expect(mockRepo.getAllByBrand).toHaveBeenCalledWith('brand_thrive_syracuse');
    });
});
