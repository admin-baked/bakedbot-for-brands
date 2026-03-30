jest.mock('next/server', () => ({
  NextRequest: class {
    url: string;
    private readonly formDataValue: FormData;

    constructor(url: string, init: { body?: FormData } = {}) {
      this.url = url;
      this.formDataValue = init.body ?? new FormData();
    }

    async formData() {
      return this.formDataValue;
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

import { uploadFile } from '@/server/actions/drive';
import { POST } from '../route';

jest.mock('@/server/actions/drive', () => ({
  uploadFile: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('POST /api/drive/upload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 when no file is provided', async () => {
    const request = new NextRequest('http://localhost/api/drive/upload', {
      body: new FormData(),
    });

    const response = await POST(request as never);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      success: false,
      error: 'No file provided',
    });
    expect(uploadFile).not.toHaveBeenCalled();
  });

  it('returns 400 for an invalid category', async () => {
    const formData = new FormData();
    formData.append('file', new File(['image'], 'logo.png', { type: 'image/png' }));
    formData.append('category', 'not-real');

    const request = new NextRequest('http://localhost/api/drive/upload', {
      body: formData,
    });

    const response = await POST(request as never);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      success: false,
      error: 'Invalid drive category',
    });
    expect(uploadFile).not.toHaveBeenCalled();
  });

  it('returns uploaded file data on success', async () => {
    (uploadFile as jest.Mock).mockResolvedValue({
      success: true,
      data: {
        id: 'file-123',
        name: 'logo.png',
        storagePath: 'drive/user/images/logo.png',
        downloadUrl: 'https://example.com/logo.png',
      },
    });

    const formData = new FormData();
    formData.append('file', new File(['image'], 'logo.png', { type: 'image/png' }));
    formData.append('folderId', 'folder-123');
    formData.append('category', 'images');

    const request = new NextRequest('http://localhost/api/drive/upload', {
      body: formData,
    });

    const response = await POST(request as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      data: {
        id: 'file-123',
        name: 'logo.png',
        storagePath: 'drive/user/images/logo.png',
        downloadUrl: 'https://example.com/logo.png',
      },
    });
    expect(uploadFile).toHaveBeenCalledTimes(1);
    expect(uploadFile).toHaveBeenCalledWith(formData);
  });

  it('accepts file-like multipart payloads that are not native File instances', async () => {
    (uploadFile as jest.Mock).mockResolvedValue({
      success: true,
      data: {
        id: 'file-123',
        name: 'logo.png',
        storagePath: 'drive/user/images/logo.png',
        downloadUrl: 'https://example.com/logo.png',
      },
    });

    const fileLike = {
      name: 'logo.png',
      size: 5,
      type: 'image/png',
      arrayBuffer: async () => new ArrayBuffer(5),
    };

    const formData = {
      get: (key: string) => {
        switch (key) {
          case 'file':
            return fileLike;
          case 'category':
            return 'images';
          default:
            return null;
        }
      },
    };

    const request = {
      formData: async () => formData,
    };

    const response = await POST(request as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      success: true,
      data: {
        id: 'file-123',
        name: 'logo.png',
        storagePath: 'drive/user/images/logo.png',
        downloadUrl: 'https://example.com/logo.png',
      },
    });
    expect(uploadFile).toHaveBeenCalledWith(formData);
  });

  it('maps forbidden drive action failures to 403', async () => {
    (uploadFile as jest.Mock).mockResolvedValue({
      success: false,
      error: 'Forbidden: This action requires Super User privileges.',
    });

    const formData = new FormData();
    formData.append('file', new File(['image'], 'logo.png', { type: 'image/png' }));

    const request = new NextRequest('http://localhost/api/drive/upload', {
      body: formData,
    });

    const response = await POST(request as never);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({
      success: false,
      error: 'Forbidden: This action requires Super User privileges.',
    });
  });
});
