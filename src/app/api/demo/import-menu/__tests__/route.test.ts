
// Mock next/server before any other imports
jest.mock('next/server', () => ({
  NextRequest: class {
    url: string;
    body: string;
    constructor(url: string, init: any) {
      this.url = url;
      this.body = init.body;
    }
    async json() {
      return JSON.parse(this.body);
    }
  },
  NextResponse: {
    json: (data: any, init?: any) => ({
      status: init?.status || 200,
      json: async () => data,
    }),
  },
}));

import { POST } from '../route';
import { discovery } from '@/server/services/firecrawl';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/server/services/firecrawl', () => ({
  discovery: {
    isConfigured: jest.fn(),
    extractData: jest.fn(),
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Menu Import API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 503 if discovery is not configured', async () => {
    (discovery.isConfigured as jest.Mock).mockReturnValue(false);

    const req = new NextRequest('http://localhost/api/demo/import-menu', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://dispensary.com' }),
    });

    const response = await POST(req);
    expect(response.status).toBe(503);
    const data = await response.json();
    expect(data.error).toContain('not configured');
  });

  it('should successfully extract and normalize menu data', async () => {
    (discovery.isConfigured as jest.Mock).mockReturnValue(true);
    (discovery.extractData as jest.Mock).mockResolvedValue({
      dispensary: {
        name: 'Quality Roots Mock',
        primaryColor: '#ff0000'
      },
      products: [
        { name: 'Red velvet', category: 'flower', price: 35 },
        { name: 'Gummy bear', category: 'edible', price: 20 }
      ],
      promotions: [
        { title: 'BOGO' }
      ]
    });

    const req = new NextRequest('http://localhost/api/demo/import-menu', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://example.com/menu' }),
    });

    const response = await POST(req);
    expect(response.status).toBe(200);
    
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.data.dispensary.name).toBe('Quality Roots Mock');
    // Verify normalization
    expect(json.data.products[0].category).toBe('Flower'); // flower -> Flower
    expect(json.data.products[1].category).toBe('Edibles'); // edible -> Edibles
    expect(json.meta.productCount).toBe(2);
  });

  it('should return 422 if extraction fails', async () => {
    (discovery.isConfigured as jest.Mock).mockReturnValue(true);
    (discovery.extractData as jest.Mock).mockResolvedValue(null);

    const req = new NextRequest('http://localhost/api/demo/import-menu', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://bad-url.com' }),
    });

    const response = await POST(req);
    expect(response.status).toBe(422);
  });

  it('should return 400 for invalid URL', async () => {
    const req = new NextRequest('http://localhost/api/demo/import-menu', {
      method: 'POST',
      body: JSON.stringify({ url: 'not-a-url' }),
    });

    const response = await POST(req);
    expect(response.status).toBe(400);
  });
});
