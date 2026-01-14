
import { searchDemoRetailers } from '@/app/dashboard/intelligence/actions/demo-setup';
import { discovery } from '@/server/services/firecrawl';

// Mock dependencies
jest.mock('@/server/services/geo-discovery', () => ({
  getZipCodeCoordinates: jest.fn().mockResolvedValue({
    city: 'Robbins',
    state: 'CA',
    lat: 38.8,
    lng: -121.6
  })
}));

jest.mock('@/server/services/firecrawl', () => ({
  discovery: {
    search: jest.fn(),
    isConfigured: jest.fn().mockReturnValue(true),
    discoverUrl: jest.fn().mockResolvedValue({ success: true, data: { markdown: 'some content' } })
  }
}));

describe('searchDemoRetailers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should filter out directory and "best of" results', async () => {
    (discovery.search as jest.Mock).mockResolvedValue([
      {
        title: 'Dispensaries Near Robbins, California - AllBud',
        url: 'https://www.allbud.com/dispensaries/ca/robbins',
        description: 'Find marijuana dispensaries near Robbins...'
      },
      {
        title: 'Best Cannabis Dispensaries in Robbins, CA | The Top 3',
        url: 'https://weedmaps.com/dispensaries/in/usa/ca/robbins',
        description: 'Top 3 Cannabis Dispensaries...'
      },
      {
        title: 'The Green Door',
        url: 'https://thegreendoor.com',
        description: 'San Francisco Premier Dispensary'
      }
    ]);

    const result = await searchDemoRetailers('95676');

    expect(result.success).toBe(true);
    // Should filter out AllBud and "Best..."
    // Should keep "The Green Door"
    expect(result.daa.length).toBe(1);
    expect(result.daa[0].name).toBe('The Green Door');
  });

  it('should handle zero valid results gracefully', async () => {
    (discovery.search as jest.Mock).mockResolvedValue([
      {
        title: 'Just directories here - AllBud',
        url: 'https://allbud.com/something',
        description: 'Directory'
      }
    ]);

    const result = await searchDemoRetailers('95676');
    
    // Depending on desired behavior: either empty array or error
    // Current impl might return successful empty list or handle it. 
    // We expect it to be successful in returning a proper response object even if empty, OR an error string if logic dictates.
    // Based on code: "if (!searchResults || searchResults.length === 0) return error"
    // BUT mapped length is what matters. 
    // The current code does NOT check mapped length > 0 before returning. 
    // It returns mapped list. If mapped list is empty, it returns success: true, daa: []
    
    expect(result.success).toBe(true);
    if (result.daa) {
        expect(result.daa.length).toBe(0);
    }
  });
});
