
import { researchService } from '@/server/services/research-service';

// Mock Firecrawl Discovery
jest.mock('@/server/services/firecrawl', () => ({
    discovery: {
        isConfigured: jest.fn().mockReturnValue(true),
        search: jest.fn().mockImplementation(async (query: string) => {
            if (query.includes('site:arxiv.org')) {
                return [{ title: 'Academic Paper', url: 'https://arxiv.org/abs/1234' }];
            }
            return [{ title: 'Web Result', url: 'https://example.com' }];
        })
    }
}));

// Mock Firestore (since ResearchService uses it)
jest.mock('@/firebase/admin', () => ({
    getAdminFirestore: jest.fn().mockReturnValue({
        collection: jest.fn().mockReturnThis(),
        doc: jest.fn().mockReturnThis(),
        set: jest.fn().mockResolvedValue({}),
        get: jest.fn().mockResolvedValue({ exists: false }),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
    })
}));

describe('ResearchService (Extensions)', () => {
    it('should perform a deep dive', async () => {
        const res = await researchService.performDeepDive('Market Trends', 1);
        expect(res.query).toBe('Market Trends');
        expect(res.results).toHaveLength(1);
        expect(res.results[0].title).toBe('Web Result');
    });

    it('should perform a scholar search', async () => {
        const res = await researchService.performScholarSearch('Cannabis Compliance');
        expect(res.type).toBe('academic');
        expect(res.results).toHaveLength(1);
        expect(res.results[0].title).toBe('Academic Paper');
    });
});
