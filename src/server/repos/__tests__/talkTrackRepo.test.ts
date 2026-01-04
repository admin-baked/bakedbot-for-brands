
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
});
