import { DiscoveryTools } from '@/server/tools/discovery';
import { discovery } from '@/server/services/firecrawl';

jest.mock('@/server/services/firecrawl', () => ({
    discovery: {
        search: jest.fn(),
        discoverUrl: jest.fn(),
        mapSite: jest.fn()
    }
}));

describe('DiscoveryTools', () => {
    describe('search', () => {
        it('should call discovery.search', async () => {
            (discovery.search as jest.Mock).mockResolvedValue(['result']);
            const result = await DiscoveryTools.search('query');
            expect(discovery.search).toHaveBeenCalledWith('query');
            expect(result).toEqual(['result']);
        });
    });

    describe('discoverUrl', () => {
        it('should call discovery.discoverUrl', async () => {
            (discovery.discoverUrl as jest.Mock).mockResolvedValue({ content: 'test' });
            const result = await DiscoveryTools.discoverUrl('https://example.com');
            expect(discovery.discoverUrl).toHaveBeenCalledWith('https://example.com');
            expect(result).toEqual({ content: 'test' });
        });
    });

    describe('mapSite', () => {
        it('should call discovery.mapSite', async () => {
             (discovery.mapSite as jest.Mock).mockResolvedValue(['url1', 'url2']);
             const result = await DiscoveryTools.mapSite('https://example.com');
             expect(discovery.mapSite).toHaveBeenCalledWith('https://example.com');
             expect(result).toEqual(['url1', 'url2']);
        });
    });
});
