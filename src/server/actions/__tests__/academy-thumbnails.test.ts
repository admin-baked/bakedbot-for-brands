/**
 * Academy Thumbnail Generation Tests
 *
 * Tests for Gemini-powered thumbnail generation and Firebase Storage caching.
 */

// Mock dependencies before imports
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const mockGet = jest.fn();
const mockSet = jest.fn();
const mockDoc = jest.fn(() => ({ get: mockGet, set: mockSet }));
const mockGetAll = jest.fn();
const mockCollection = jest.fn(() => ({
  doc: mockDoc,
  get: mockGetAll,
}));
jest.mock('@/firebase/admin', () => ({
  getAdminFirestore: jest.fn(() => ({
    collection: mockCollection,
  })),
  getAdminStorage: jest.fn(() => ({
    bucket: jest.fn(() => ({
      name: 'test-bucket',
      file: jest.fn(() => ({
        save: jest.fn().mockResolvedValue(undefined),
        makePublic: jest.fn().mockResolvedValue(undefined),
      })),
    })),
  })),
}));

jest.mock('@/ai/flows/generate-social-image', () => ({
  generateImageFromPrompt: jest
    .fn()
    .mockResolvedValue('data:image/png;base64,iVBORw0KGgoAAAANS'),
}));

jest.mock('@/lib/academy/curriculum', () => ({
  ACADEMY_EPISODES: [
    {
      id: 'ep1-intro',
      track: 'general',
      title: 'What Is AI Marketing for Cannabis',
      episodeNumber: 1,
      description: 'Learn the fundamentals',
    },
    {
      id: 'ep2-smokey',
      track: 'smokey',
      title: 'AI-Powered Product Recommendations',
      episodeNumber: 2,
      description: 'Build a smart budtender',
    },
  ],
  AGENT_TRACKS: {},
}));

import {
  generateEpisodeThumbnail,
  getEpisodeThumbnail,
  getAllCachedThumbnails,
  generateAllMissingThumbnails,
} from '../academy-thumbnails';
import { generateImageFromPrompt } from '@/ai/flows/generate-social-image';

describe('generateEpisodeThumbnail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return cached thumbnail if it exists', async () => {
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ imageUrl: 'https://storage.googleapis.com/test-bucket/cached.png' }),
    });

    const result = await generateEpisodeThumbnail({
      episodeId: 'ep1-intro',
      track: 'general',
      title: 'Test Episode',
      episodeNumber: 1,
      description: 'Test description',
    });

    expect(result.success).toBe(true);
    expect(result.imageUrl).toBe('https://storage.googleapis.com/test-bucket/cached.png');
    expect(generateImageFromPrompt).not.toHaveBeenCalled();
  });

  it('should generate and upload a new thumbnail when not cached', async () => {
    mockGet.mockResolvedValueOnce({ exists: false });

    const result = await generateEpisodeThumbnail({
      episodeId: 'ep1-intro',
      track: 'general',
      title: 'Test Episode',
      episodeNumber: 1,
      description: 'Test description',
    });

    expect(result.success).toBe(true);
    expect(result.imageUrl).toContain('https://storage.googleapis.com/test-bucket/');
    expect(generateImageFromPrompt).toHaveBeenCalledWith(
      expect.stringContaining('Episode 1'),
      { tier: 'free' }
    );
  });

  it('should use track-specific prompt for smokey', async () => {
    mockGet.mockResolvedValueOnce({ exists: false });

    await generateEpisodeThumbnail({
      episodeId: 'ep2-smokey',
      track: 'smokey',
      title: 'AI-Powered Product Recs',
      episodeNumber: 2,
      description: 'Terpene-based recommendations',
    });

    expect(generateImageFromPrompt).toHaveBeenCalledWith(
      expect.stringContaining('terpene'),
      { tier: 'free' }
    );
  });

  it('should fall back to general prompt for unknown tracks', async () => {
    mockGet.mockResolvedValueOnce({ exists: false });

    await generateEpisodeThumbnail({
      episodeId: 'ep-unknown',
      track: 'nonexistent',
      title: 'Unknown Track',
      episodeNumber: 99,
      description: 'Test',
    });

    expect(generateImageFromPrompt).toHaveBeenCalledWith(
      expect.stringContaining('Professional online course'),
      { tier: 'free' }
    );
  });

  it('should cache the generated thumbnail in Firestore', async () => {
    mockGet.mockResolvedValueOnce({ exists: false });

    await generateEpisodeThumbnail({
      episodeId: 'ep1-intro',
      track: 'general',
      title: 'Test',
      episodeNumber: 1,
      description: 'Test',
    });

    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        episodeId: 'ep1-intro',
        track: 'general',
        imageUrl: expect.stringContaining('https://storage.googleapis.com/'),
        storagePath: expect.stringContaining('academy/thumbnails/ep1-intro.png'),
      })
    );
  });

  it('should return error on generation failure', async () => {
    mockGet.mockResolvedValueOnce({ exists: false });
    (generateImageFromPrompt as jest.Mock).mockRejectedValueOnce(
      new Error('Gemini rate limit exceeded')
    );

    const result = await generateEpisodeThumbnail({
      episodeId: 'ep1-intro',
      track: 'general',
      title: 'Test',
      episodeNumber: 1,
      description: 'Test',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Gemini rate limit exceeded');
  });
});

describe('getEpisodeThumbnail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return imageUrl if thumbnail exists', async () => {
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ imageUrl: 'https://example.com/thumb.png' }),
    });

    const url = await getEpisodeThumbnail('ep1-intro');
    expect(url).toBe('https://example.com/thumb.png');
  });

  it('should return null if thumbnail does not exist', async () => {
    mockGet.mockResolvedValueOnce({ exists: false });

    const url = await getEpisodeThumbnail('ep-missing');
    expect(url).toBeNull();
  });

  it('should return null on error', async () => {
    mockGet.mockRejectedValueOnce(new Error('Firestore error'));

    const url = await getEpisodeThumbnail('ep-error');
    expect(url).toBeNull();
  });
});

describe('getAllCachedThumbnails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return a map of episodeId to imageUrl', async () => {
    const mockDocs = [
      { id: 'ep1', data: () => ({ imageUrl: 'https://url1.png' }) },
      { id: 'ep2', data: () => ({ imageUrl: 'https://url2.png' }) },
    ];
    mockGetAll.mockResolvedValueOnce({
      forEach: (fn: (doc: any) => void) => mockDocs.forEach(fn),
    });

    const result = await getAllCachedThumbnails();
    expect(result).toEqual({
      ep1: 'https://url1.png',
      ep2: 'https://url2.png',
    });
  });

  it('should skip entries without imageUrl', async () => {
    const mockDocs = [
      { id: 'ep1', data: () => ({ imageUrl: 'https://url1.png' }) },
      { id: 'ep2', data: () => ({}) },
    ];
    mockGetAll.mockResolvedValueOnce({
      forEach: (fn: (doc: any) => void) => mockDocs.forEach(fn),
    });

    const result = await getAllCachedThumbnails();
    expect(result).toEqual({ ep1: 'https://url1.png' });
  });

  it('should return empty object on error', async () => {
    mockGetAll.mockRejectedValueOnce(new Error('Network error'));

    const result = await getAllCachedThumbnails();
    expect(result).toEqual({});
  });
});

describe('generateAllMissingThumbnails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should skip already-cached episodes', async () => {
    // Return all episodes as already cached
    const mockDocs = [
      { id: 'ep1-intro', data: () => ({ imageUrl: 'https://cached1.png' }) },
      { id: 'ep2-smokey', data: () => ({ imageUrl: 'https://cached2.png' }) },
    ];
    mockGetAll.mockResolvedValueOnce({
      forEach: (fn: (doc: any) => void) => mockDocs.forEach(fn),
    });

    const result = await generateAllMissingThumbnails();
    expect(result.skipped).toBe(2);
    expect(result.generated).toBe(0);
    expect(result.errors).toHaveLength(0);
    expect(generateImageFromPrompt).not.toHaveBeenCalled();
  });

  it('should generate thumbnails for uncached episodes', async () => {
    // Only ep1-intro is cached
    const mockDocs = [
      { id: 'ep1-intro', data: () => ({ imageUrl: 'https://cached1.png' }) },
    ];
    mockGetAll.mockResolvedValueOnce({
      forEach: (fn: (doc: any) => void) => mockDocs.forEach(fn),
    });
    // For the generation check of ep2-smokey
    mockGet.mockResolvedValueOnce({ exists: false });

    const result = await generateAllMissingThumbnails();
    expect(result.skipped).toBe(1);
    expect(result.generated).toBe(1);
    expect(generateImageFromPrompt).toHaveBeenCalledTimes(1);
  });

  it('should collect errors without stopping batch', async () => {
    // No episodes cached
    mockGetAll.mockResolvedValueOnce({
      forEach: () => {},
    });
    // First episode generates fine
    mockGet.mockResolvedValueOnce({ exists: false });
    // Second fails
    mockGet.mockResolvedValueOnce({ exists: false });
    (generateImageFromPrompt as jest.Mock)
      .mockResolvedValueOnce('data:image/png;base64,abc')
      .mockRejectedValueOnce(new Error('Rate limited'));

    const result = await generateAllMissingThumbnails();
    expect(result.generated).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('ep2-smokey');
    expect(result.errors[0]).toContain('Rate limited');
  });
});
