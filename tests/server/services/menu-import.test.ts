import { extractMenuDataFromUrl, normalizeMenuData } from '@/server/services/menu-import';
import { ai } from '@/ai/genkit';
import { discovery } from '@/server/services/firecrawl';

jest.mock('@/server/services/firecrawl', () => ({
  discovery: {
    extractData: jest.fn(),
    discoverWithActions: jest.fn(),
  },
}));

jest.mock('@/ai/genkit', () => ({
  ai: {
    generate: jest.fn(),
  },
}));

jest.mock('@/ai/model-selector', () => ({
  getGenerateOptions: jest.fn(() => ({ model: 'googleai/gemini-2.5-flash-lite' })),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('menu import service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('normalizes loosely typed extraction results', () => {
    const normalized = normalizeMenuData(
      {
        dispensary: {
          primaryColor: '',
        },
        products: [
          {
            name: 'Blue Dream',
            category: 'flower',
            price: '$35.00',
            thcPercent: '28%',
            effects: 'Relaxed, Euphoric',
          },
        ],
      },
      'https://gotham.nyc/menu/'
    );

    expect(normalized.dispensary.name).toBe('Gotham');
    expect(normalized.products[0].category).toBe('Flower');
    expect(normalized.products[0].price).toBe(35);
    expect(normalized.products[0].thcPercent).toBe(28);
    expect(normalized.products[0].effects).toEqual(['Relaxed', 'Euphoric']);
  });

  it('returns direct extraction when products are available', async () => {
    (discovery.extractData as jest.Mock).mockResolvedValue({
      dispensary: { name: 'Gotham' },
      products: [{ name: 'Blue Dream', category: 'flower', price: 35 }],
    });

    const result = await extractMenuDataFromUrl('https://gotham.nyc/menu/');

    expect(result.dispensary.name).toBe('Gotham');
    expect(result.products).toHaveLength(1);
    expect(discovery.discoverWithActions).not.toHaveBeenCalled();
  });

  it('falls back to age-gate scraping when direct extraction has no products', async () => {
    (discovery.extractData as jest.Mock).mockResolvedValue({
      dispensary: { name: 'Gotham' },
      products: [],
    });
    (discovery.discoverWithActions as jest.Mock).mockResolvedValue({
      markdown: '# Gotham Menu\n\nBlue Dream - Flower - $35',
    });
    (ai.generate as jest.Mock).mockResolvedValue({
      output: {
        data: {
          dispensary: { name: 'Gotham' },
          products: [{ name: 'Blue Dream', category: 'flower', price: 35 }],
          promotions: [],
        },
      },
    });

    const result = await extractMenuDataFromUrl('https://gotham.nyc/menu/');

    expect(discovery.discoverWithActions).toHaveBeenCalled();
    expect(ai.generate).toHaveBeenCalled();
    expect(result.products[0].name).toBe('Blue Dream');
  });

  it('throws when neither extraction path yields products', async () => {
    (discovery.extractData as jest.Mock).mockResolvedValue({ products: [] });
    (discovery.discoverWithActions as jest.Mock).mockResolvedValue({ markdown: '' });

    await expect(extractMenuDataFromUrl('https://gotham.nyc/menu/')).rejects.toThrow(
      'Failed to extract menu data'
    );
  });
});
