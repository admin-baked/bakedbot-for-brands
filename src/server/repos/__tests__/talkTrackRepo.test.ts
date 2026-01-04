
import { getAllTalkTracks, saveTalkTrack, findTalkTrackByTrigger } from '../talkTrackRepo';
import { TalkTrack } from '@/types/talk-track';

// Mock everything needed
jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn().mockResolvedValue({
        firestore: {
            collection: jest.fn().mockReturnThis(),
            doc: jest.fn().mockReturnThis(),
            startAfter: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            get: jest.fn(),
            add: jest.fn(),
            set: jest.fn(),
            where: jest.fn().mockReturnThis(),
        }
    })
}));

// Mock unstable_cache to just execute the function immediately
jest.mock('next/cache', () => ({
    unstable_cache: (fn: any) => fn,
    revalidateTag: jest.fn(),
}));

describe('TalkTrack Repository', () => {
    const mockTalkTrack: TalkTrack = {
        id: 'test-track',
        name: 'Test Track',
        role: 'dispensary',
        triggerKeywords: ['hello', 'test trigger'],
        steps: [
            {
                id: 'step-1',
                order: 1,
                type: 'response',
                message: 'Hello world',
                thought: 'Thinking...',
            }
        ],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'tester',
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should find talk track by trigger', async () => {
        // Mock getAllTalkTracks implementation locally or depend on the mocked repo
        // Since we are testing the repo functions, we need to make sure the mocked firestore returns data for getAllTalkTracks
        
        const { createServerClient } = require('@/firebase/server-client');
        const mockFirestore = await createServerClient();
        
        mockFirestore.firestore.get.mockResolvedValue({
            empty: false,
            docs: [{
                id: 'test-track',
                data: () => mockTalkTrack
            }]
        });

        const track = await findTalkTrackByTrigger('I want to test trigger something', 'dispensary');
        expect(track).toBeDefined();
        expect(track?.id).toBe('test-track');
    });

    it('should return null if no trigger matches', async () => {
        const { createServerClient } = require('@/firebase/server-client');
        const mockFirestore = await createServerClient();
        
        mockFirestore.firestore.get.mockResolvedValue({
            empty: false,
            docs: [{
                id: 'test-track',
                data: () => mockTalkTrack
            }]
        });

        const track = await findTalkTrackByTrigger('random text', 'dispensary');
        expect(track).toBeNull();
    });
    
    it('should save a talk track', async () => {
        const { createServerClient } = require('@/firebase/server-client');
        const mockFirestore = await createServerClient();
        
        mockFirestore.firestore.add.mockResolvedValue({ id: 'new-id' });
        
        // Test create
        const newTrack = { ...mockTalkTrack };
        delete (newTrack as any).id;
        
        const id = await saveTalkTrack(newTrack);
        expect(id).toBe('new-id');
        expect(mockFirestore.firestore.add).toHaveBeenCalled();
    });

    it('should update a talk track', async () => {
        const { createServerClient } = require('@/firebase/server-client');
        const mockFirestore = await createServerClient();
        
        await saveTalkTrack(mockTalkTrack);
        expect(mockFirestore.firestore.set).toHaveBeenCalled();
    });

    // =========================================================================
    // CUSTOMER TALK TRACK TRIGGER TESTS
    // =========================================================================

    describe('Customer Talk Track Triggers', () => {
        const customerTracks: Partial<TalkTrack>[] = [
            {
                id: 'customer-product-search',
                role: 'customer',
                triggerKeywords: ['find products', 'looking for', 'what strains', 'show me'],
                steps: [{ id: 'step-1', order: 1, type: 'question', message: 'What are you looking for?', thought: '' }],
                isActive: true,
            },
            {
                id: 'customer-effect-search',
                role: 'customer',
                triggerKeywords: ['help me relax', 'for energy', 'pain relief', 'sleep'],
                steps: [{ id: 'step-1', order: 1, type: 'action', message: 'Here are recommendations', thought: '' }],
                isActive: true,
            },
            {
                id: 'customer-store-locator',
                role: 'customer',
                triggerKeywords: ['where to buy', 'stores near me', 'closest dispensary'],
                steps: [{ id: 'step-1', order: 1, type: 'question', message: 'Whats your ZIP?', thought: '' }],
                isActive: true,
            },
            {
                id: 'customer-greeting',
                role: 'customer',
                triggerKeywords: ['hi', 'hello', 'hey smokey'],
                steps: [{ id: 'step-1', order: 1, type: 'response', message: 'Hey there!', thought: '' }],
                isActive: true,
            },
        ];

        beforeEach(async () => {
            const { createServerClient } = require('@/firebase/server-client');
            const mockFirestore = await createServerClient();
            mockFirestore.firestore.get.mockResolvedValue({
                empty: false,
                docs: customerTracks.map(t => ({ id: t.id, data: () => t }))
            });
        });

        it('should match product search trigger', async () => {
            const track = await findTalkTrackByTrigger('I am looking for some flower', 'customer');
            expect(track).toBeDefined();
            expect(track?.id).toBe('customer-product-search');
        });

        it('should match effect-based search trigger', async () => {
            const track = await findTalkTrackByTrigger('I need something for sleep', 'customer');
            expect(track).toBeDefined();
            expect(track?.id).toBe('customer-effect-search');
        });

        it('should match store locator trigger', async () => {
            const track = await findTalkTrackByTrigger('where to buy cannabis near Denver', 'customer');
            expect(track).toBeDefined();
            expect(track?.id).toBe('customer-store-locator');
        });

        it('should match greeting trigger', async () => {
            const track = await findTalkTrackByTrigger('hey smokey whats up', 'customer');
            expect(track).toBeDefined();
            expect(track?.id).toBe('customer-greeting');
        });
    });

    // =========================================================================
    // DISPENSARY TALK TRACK TRIGGER TESTS
    // =========================================================================

    describe('Dispensary Talk Track Triggers', () => {
        const dispensaryTracks: Partial<TalkTrack>[] = [
            {
                id: 'dispensary-menu-sync',
                role: 'dispensary',
                triggerKeywords: ['sync menu', 'update menu', 'refresh inventory'],
                steps: [{ id: 'step-1', order: 1, type: 'action', message: 'Syncing now...', thought: '' }],
                isActive: true,
            },
            {
                id: 'dispensary-low-stock',
                role: 'dispensary',
                triggerKeywords: ['low stock', 'running low', 'stock alerts'],
                steps: [{ id: 'step-1', order: 1, type: 'action', message: 'Checking stock...', thought: '' }],
                isActive: true,
            },
            {
                id: 'dispensary-competitor-prices',
                role: 'dispensary',
                triggerKeywords: ['competitor prices', 'price comparison'],
                steps: [{ id: 'step-1', order: 1, type: 'action', message: 'Analyzing prices...', thought: '' }],
                isActive: true,
            },
        ];

        beforeEach(async () => {
            const { createServerClient } = require('@/firebase/server-client');
            const mockFirestore = await createServerClient();
            mockFirestore.firestore.get.mockResolvedValue({
                empty: false,
                docs: dispensaryTracks.map(t => ({ id: t.id, data: () => t }))
            });
        });

        it('should match menu sync trigger', async () => {
            const track = await findTalkTrackByTrigger('please sync menu from POS', 'dispensary');
            expect(track).toBeDefined();
            expect(track?.id).toBe('dispensary-menu-sync');
        });

        it('should match low stock trigger', async () => {
            const track = await findTalkTrackByTrigger('show me products running low', 'dispensary');
            expect(track).toBeDefined();
            expect(track?.id).toBe('dispensary-low-stock');
        });
    });

    // =========================================================================
    // BRAND TALK TRACK TRIGGER TESTS
    // =========================================================================

    describe('Brand Talk Track Triggers', () => {
        const brandTracks: Partial<TalkTrack>[] = [
            {
                id: 'brand-find-retailers',
                role: 'brand',
                triggerKeywords: ['find retailers', 'distribution partners', 'expand distribution'],
                steps: [{ id: 'step-1', order: 1, type: 'question', message: 'Which market?', thought: '' }],
                isActive: true,
            },
            {
                id: 'brand-sell-through',
                role: 'brand',
                triggerKeywords: ['sell through', 'sell-through analytics', 'velocity report'],
                steps: [{ id: 'step-1', order: 1, type: 'action', message: 'Analyzing...', thought: '' }],
                isActive: true,
            },
            {
                id: 'brand-competitor-watch',
                role: 'brand',
                triggerKeywords: ['competitor watch', 'track competitors', 'competitive analysis'],
                steps: [{ id: 'step-1', order: 1, type: 'action', message: 'Scanning...', thought: '' }],
                isActive: true,
            },
        ];

        beforeEach(async () => {
            const { createServerClient } = require('@/firebase/server-client');
            const mockFirestore = await createServerClient();
            mockFirestore.firestore.get.mockResolvedValue({
                empty: false,
                docs: brandTracks.map(t => ({ id: t.id, data: () => t }))
            });
        });

        it('should match find retailers trigger', async () => {
            const track = await findTalkTrackByTrigger('help me find retailers in Colorado', 'brand');
            expect(track).toBeDefined();
            expect(track?.id).toBe('brand-find-retailers');
        });

        it('should match sell-through analytics trigger', async () => {
            const track = await findTalkTrackByTrigger('show me sell-through analytics', 'brand');
            expect(track).toBeDefined();
            expect(track?.id).toBe('brand-sell-through');
        });

        it('should match competitor watch trigger', async () => {
            const track = await findTalkTrackByTrigger('set up competitor watch for Cookies', 'brand');
            expect(track).toBeDefined();
            expect(track?.id).toBe('brand-competitor-watch');
        });
    });

    // =========================================================================
    // ROLE FILTERING TESTS
    // =========================================================================

    describe('Role Filtering', () => {
        const mixedTracks: Partial<TalkTrack>[] = [
            {
                id: 'customer-greeting',
                role: 'customer',
                triggerKeywords: ['hello'],
                steps: [{ id: 'step-1', order: 1, type: 'response', message: 'Hi customer!', thought: '' }],
                isActive: true,
            },
            {
                id: 'dispensary-hello',
                role: 'dispensary',
                triggerKeywords: ['hello'],
                steps: [{ id: 'step-1', order: 1, type: 'response', message: 'Hi dispensary!', thought: '' }],
                isActive: true,
            },
            {
                id: 'all-roles-greeting',
                role: 'all',
                triggerKeywords: ['greetings'],
                steps: [{ id: 'step-1', order: 1, type: 'response', message: 'Hi everyone!', thought: '' }],
                isActive: true,
            },
        ];

        beforeEach(async () => {
            const { createServerClient } = require('@/firebase/server-client');
            const mockFirestore = await createServerClient();
            mockFirestore.firestore.get.mockResolvedValue({
                empty: false,
                docs: mixedTracks.map(t => ({ id: t.id, data: () => t }))
            });
        });

        it('should only match customer role tracks for customer', async () => {
            const track = await findTalkTrackByTrigger('hello there', 'customer');
            expect(track).toBeDefined();
            expect(track?.id).toBe('customer-greeting');
        });

        it('should only match dispensary role tracks for dispensary', async () => {
            const track = await findTalkTrackByTrigger('hello there', 'dispensary');
            expect(track).toBeDefined();
            expect(track?.id).toBe('dispensary-hello');
        });

        it('should match all-role tracks for any role', async () => {
            const customerTrack = await findTalkTrackByTrigger('greetings friend', 'customer');
            const dispensaryTrack = await findTalkTrackByTrigger('greetings friend', 'dispensary');
            
            expect(customerTrack).toBeDefined();
            expect(customerTrack?.id).toBe('all-roles-greeting');
            expect(dispensaryTrack).toBeDefined();
            expect(dispensaryTrack?.id).toBe('all-roles-greeting');
        });
    });
});
