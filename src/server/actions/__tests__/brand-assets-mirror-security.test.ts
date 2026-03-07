import { mirrorBrandAssetFromUrl } from '../brand-assets';
import { getBrandAssetUploader } from '@/server/services/brand-asset-uploader';
import { lookup } from 'node:dns/promises';

jest.mock('node:dns/promises', () => ({
  lookup: jest.fn(),
}));

jest.mock('@/server/services/brand-asset-uploader', () => ({
  getBrandAssetUploader: jest.fn(),
  validateAssetType: jest.fn(() => ({ valid: true })),
  validateFileSize: jest.fn((size: number, category: string) =>
    size <= (category === 'logo' ? 512 : 1024)
      ? { valid: true }
      : { valid: false, error: `File too large for ${category}` }
  ),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('mirrorBrandAssetFromUrl security', () => {
  const uploadAsset = jest.fn();

  function makeReader(chunks: number[]): ReadableStreamDefaultReader<Uint8Array> {
    let idx = 0;
    return {
      read: jest.fn(async () => {
        if (idx >= chunks.length) return { done: true, value: undefined } as any;
        const len = chunks[idx++];
        return { done: false, value: new Uint8Array(len) } as any;
      }),
      releaseLock: jest.fn(),
      cancel: jest.fn(),
      closed: Promise.resolve(undefined),
    } as any;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    (getBrandAssetUploader as jest.Mock).mockReturnValue({ uploadAsset });
    uploadAsset.mockResolvedValue({ success: true, asset: { url: 'https://cdn.example/logo.png' } });
    (global as any).fetch = jest.fn();
    (lookup as jest.Mock).mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);
  });

  it('blocks IPv4-mapped IPv6 loopback hosts', async () => {
    const result = await mirrorBrandAssetFromUrl('brand-1', {
      sourceUrl: 'http://[::ffff:127.0.0.1]:8080/private.png',
      category: 'image',
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Private or local source URLs are not allowed/i);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('rejects oversized body using content-length before buffering', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      headers: {
        get: (name: string) => {
          if (name.toLowerCase() === 'content-length') return '2048';
          if (name.toLowerCase() === 'content-type') return 'image/png';
          return null;
        },
      },
      body: { getReader: () => makeReader([50]) },
    });

    const result = await mirrorBrandAssetFromUrl('brand-1', {
      sourceUrl: 'https://example.com/too-large.png',
      category: 'image',
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/File too large/i);
    expect(uploadAsset).not.toHaveBeenCalled();
  });

  it('rejects oversized stream when content-length is missing', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      headers: {
        get: (name: string) => {
          if (name.toLowerCase() === 'content-type') return 'image/png';
          return null;
        },
      },
      body: { getReader: () => makeReader([400, 400, 400]) },
    });

    const result = await mirrorBrandAssetFromUrl('brand-1', {
      sourceUrl: 'https://example.com/chunked-large.png',
      category: 'image',
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/File too large/i);
    expect(uploadAsset).not.toHaveBeenCalled();
  });

  it('rejects hostnames that resolve to private addresses', async () => {
    (lookup as jest.Mock).mockResolvedValue([{ address: '127.0.0.1', family: 4 }]);

    const result = await mirrorBrandAssetFromUrl('brand-1', {
      sourceUrl: 'https://example.com/private.png',
      category: 'image',
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/resolves to a private or local address/i);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('blocks redirects to private hosts', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        status: 302,
        headers: { get: (name: string) => (name.toLowerCase() === 'location' ? 'http://127.0.0.1/secret.png' : null) },
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => {
            if (name.toLowerCase() === 'content-type') return 'image/png';
            return null;
          },
        },
        body: { getReader: () => makeReader([10]) },
      });

    const result = await mirrorBrandAssetFromUrl('brand-1', {
      sourceUrl: 'https://example.com/logo.png',
      category: 'image',
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/private or local/i);
    expect(uploadAsset).not.toHaveBeenCalled();
  });
});
