jest.mock('next/server', () => ({
  NextRequest: class {
    url: string;
    private readonly bodyText: string;

    constructor(url: string, init: { body?: string } = {}) {
      this.url = url;
      this.bodyText = init.body ?? '{}';
    }

    async json() {
      return JSON.parse(this.bodyText);
    }
  },
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => data,
    }),
  },
}));

import { NextRequest } from 'next/server';

import { uploadFileFromUrl } from '@/server/actions/drive';
import { POST } from '../route';

jest.mock('@/server/actions/drive', () => ({
  uploadFileFromUrl: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

describe('POST /api/drive/upload-from-url', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 when url is missing', async () => {
    const request = new NextRequest('http://localhost/api/drive/upload-from-url', {
      body: JSON.stringify({ category: 'images' }),
    });

    const response = await POST(request as never);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      success: false,
      error: 'URL is required',
    });
    expect(uploadFileFromUrl).not.toHaveBeenCalled();
  });

  it('returns 400 for an invalid category', async () => {
    const request = new NextRequest('http://localhost/api/drive/upload-from-url', {
      body: JSON.stringify({
        url: 'https://example.com/logo.png',
        category: 'not-real',
      }),
    });

    const response = await POST(request as never);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      success: false,
      error: 'Invalid drive category',
    });
    expect(uploadFileFromUrl).not.toHaveBeenCalled();
  });

  it('returns uploaded file data on success', async () => {
    (uploadFileFromUrl as jest.Mock).mockResolvedValue({
      success: true,
      data: {
        id: 'file-456',
        name: 'logo.png',
        storagePath: 'drive/user/images/logo.png',
        downloadUrl: 'https://example.com/logo.png',
      },
    });

    const request = new NextRequest('http://localhost/api/drive/upload-from-url', {
      body: JSON.stringify({
        url: 'https://example.com/logo.png',
        folderId: 'folder-123',
        category: 'images',
      }),
    });

    const response = await POST(request as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      data: {
        id: 'file-456',
        name: 'logo.png',
        storagePath: 'drive/user/images/logo.png',
        downloadUrl: 'https://example.com/logo.png',
      },
    });
    expect(uploadFileFromUrl).toHaveBeenCalledWith(
      'https://example.com/logo.png',
      'folder-123',
      'images',
    );
  });

  it('maps unauthorized drive action failures to 401', async () => {
    (uploadFileFromUrl as jest.Mock).mockResolvedValue({
      success: false,
      error: 'Unauthorized: No session cookie found.',
    });

    const request = new NextRequest('http://localhost/api/drive/upload-from-url', {
      body: JSON.stringify({
        url: 'https://example.com/logo.png',
      }),
    });

    const response = await POST(request as never);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({
      success: false,
      error: 'Unauthorized: No session cookie found.',
    });
  });
});
