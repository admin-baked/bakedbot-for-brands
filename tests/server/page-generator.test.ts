
import { PageGeneratorService } from '../../src/server/services/page-generator';

// Mock fetch globally
global.fetch = jest.fn();

describe('PageGeneratorService', () => {
    let service: PageGeneratorService;

    beforeEach(() => {
        service = new PageGeneratorService();
        jest.clearAllMocks();
    });

    describe('resolveCityToZips', () => {
        it('should resolve ZIP codes for a valid city', async () => {
            const mockResponse = {
                places: [
                    { 'post code': '48201' },
                    { 'post code': '48202' }
                ]
            };

            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: async () => mockResponse
            });

            const zips = await service.resolveCityToZips('Detroit', 'MI');

            expect(global.fetch).toHaveBeenCalledWith('https://api.zippopotam.us/us/mi/detroit');
            expect(zips).toHaveLength(2);
            expect(zips).toContain('48201');
            expect(zips).toContain('48202');
        });

        it('should return empty array when API returns no places', async () => {
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: async () => ({})
            });

            const zips = await service.resolveCityToZips('Unknown', 'XX');
            expect(zips).toEqual([]);
        });

        it('should return empty array on API error', async () => {
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: false
            });

            const zips = await service.resolveCityToZips('ErrorCity', 'MI');
            expect(zips).toEqual([]);
        });

        it('should handle fetch exceptions gracefully', async () => {
            (global.fetch as jest.Mock).mockRejectedValue(new Error('Network Error'));

            const zips = await service.resolveCityToZips('CrashCity', 'MI');
            expect(zips).toEqual([]);
        });
    });
});
