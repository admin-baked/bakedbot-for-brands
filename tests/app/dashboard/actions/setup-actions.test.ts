import { startMenuImport } from '@/app/dashboard/actions/setup-actions';
import { requireUser } from '@/server/auth/auth';
import { createImport } from '@/server/actions/import-actions';
import { extractMenuDataFromUrl } from '@/server/services/menu-import';

jest.mock('@/server/auth/auth', () => ({
  requireUser: jest.fn(),
}));

jest.mock('@/server/actions/import-actions', () => ({
  createImport: jest.fn(),
}));

jest.mock('@/server/services/menu-import', () => ({
  extractMenuDataFromUrl: jest.fn(),
}));

jest.mock('@/app/dashboard/intelligence/actions/setup', () => ({
  searchLocalCompetitors: jest.fn(),
  finalizeCompetitorSetup: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('startMenuImport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireUser as jest.Mock).mockResolvedValue({ uid: 'user-123' });
    (createImport as jest.Mock).mockResolvedValue({ importId: 'import-123' });
  });

  it('imports normalized menu data and returns the extracted dispensary name', async () => {
    (extractMenuDataFromUrl as jest.Mock).mockResolvedValue({
      dispensary: { name: 'Gotham' },
      products: [
        {
          name: 'Blue Dream',
          brand: 'Gotham',
          category: 'Flower',
          price: 35,
          thcPercent: 28,
          cbdPercent: null,
          description: 'Top shelf flower',
          effects: ['Relaxed'],
          imageUrl: 'https://cdn.example.com/blue-dream.jpg',
          weight: '3.5g',
        },
      ],
      promotions: [],
    });

    const result = await startMenuImport('https://gotham.nyc/menu/');

    expect(extractMenuDataFromUrl).toHaveBeenCalledWith('https://gotham.nyc/menu/');
    expect(createImport).toHaveBeenCalledWith(
      'user-123',
      'headless-menu-import',
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Blue Dream',
          brandName: 'Gotham',
          category: 'Flower',
          price: 35,
        }),
      ])
    );
    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        importId: 'import-123',
        importedName: 'Gotham',
      })
    );
  });

  it('returns a user-facing error when extraction fails', async () => {
    (extractMenuDataFromUrl as jest.Mock).mockRejectedValue(new Error('Failed to extract menu data'));

    const result = await startMenuImport('https://gotham.nyc/menu/');

    expect(result).toEqual({
      success: false,
      error: 'Failed to extract menu data',
    });
  });
});
