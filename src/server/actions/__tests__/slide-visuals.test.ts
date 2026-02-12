/**
 * Slide Visual Generation Tests
 *
 * Tests for Gemini-powered slide backgrounds and agent illustrations.
 * Follows the same pattern as academy-thumbnails.test.ts.
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

import {
  generateSlideBackground,
  generateAgentIllustration,
  getAllCachedSlideBackgrounds,
  getAllCachedAgentIllustrations,
  generateAllMissingSlideVisuals,
} from '../slide-visuals';
import { generateImageFromPrompt } from '@/ai/flows/generate-social-image';

describe('generateSlideBackground', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return cached background if it exists', async () => {
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ imageUrl: 'https://storage.googleapis.com/test-bucket/cached-bg.png' }),
    });

    const result = await generateSlideBackground({
      slideType: 'title',
      trackColor: '#10b981',
    });

    expect(result.success).toBe(true);
    expect(result.imageUrl).toBe('https://storage.googleapis.com/test-bucket/cached-bg.png');
    expect(generateImageFromPrompt).not.toHaveBeenCalled();
  });

  it('should generate and upload a new background when not cached', async () => {
    mockGet.mockResolvedValueOnce({ exists: false });

    const result = await generateSlideBackground({
      slideType: 'title',
      trackColor: '#10b981',
    });

    expect(result.success).toBe(true);
    expect(result.imageUrl).toContain('https://storage.googleapis.com/test-bucket/');
    expect(generateImageFromPrompt).toHaveBeenCalledWith(
      expect.stringContaining('emerald green'),
      { tier: 'free' }
    );
  });

  it('should use correct doc ID based on type and color', async () => {
    mockGet.mockResolvedValueOnce({ exists: false });

    await generateSlideBackground({
      slideType: 'stat',
      trackColor: '#3b82f6',
    });

    expect(mockCollection).toHaveBeenCalledWith('slide_backgrounds');
    expect(mockDoc).toHaveBeenCalledWith('stat_3b82f6');
  });

  it('should cache the generated background in Firestore', async () => {
    mockGet.mockResolvedValueOnce({ exists: false });

    await generateSlideBackground({
      slideType: 'quote',
      trackColor: '#8b5cf6',
    });

    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        slideType: 'quote',
        trackColor: '#8b5cf6',
        imageUrl: expect.stringContaining('https://storage.googleapis.com/'),
        storagePath: expect.stringContaining('academy/slide-backgrounds/quote_8b5cf6.png'),
      })
    );
  });

  it('should return error for unknown slide type', async () => {
    // Cache check runs first, so mock it
    mockGet.mockResolvedValueOnce({ exists: false });

    const result = await generateSlideBackground({
      slideType: 'nonexistent',
      trackColor: '#10b981',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Unknown slide type');
  });

  it('should return error on generation failure', async () => {
    mockGet.mockResolvedValueOnce({ exists: false });
    (generateImageFromPrompt as jest.Mock).mockRejectedValueOnce(
      new Error('Gemini rate limit exceeded')
    );

    const result = await generateSlideBackground({
      slideType: 'title',
      trackColor: '#10b981',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Gemini rate limit exceeded');
  });
});

describe('generateAgentIllustration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return cached illustration if it exists', async () => {
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ imageUrl: 'https://storage.googleapis.com/test-bucket/agent.png' }),
    });

    const result = await generateAgentIllustration({
      agentId: 'craig',
      type: 'character',
    });

    expect(result.success).toBe(true);
    expect(result.imageUrl).toBe('https://storage.googleapis.com/test-bucket/agent.png');
    expect(generateImageFromPrompt).not.toHaveBeenCalled();
  });

  it('should generate character illustration when not cached', async () => {
    mockGet.mockResolvedValueOnce({ exists: false });

    const result = await generateAgentIllustration({
      agentId: 'craig',
      type: 'character',
    });

    expect(result.success).toBe(true);
    expect(generateImageFromPrompt).toHaveBeenCalledWith(
      expect.stringContaining('marketing AI agent named Craig'),
      { tier: 'free' }
    );
  });

  it('should generate scene illustration when not cached', async () => {
    mockGet.mockResolvedValueOnce({ exists: false });

    const result = await generateAgentIllustration({
      agentId: 'smokey',
      type: 'scene',
    });

    expect(result.success).toBe(true);
    expect(generateImageFromPrompt).toHaveBeenCalledWith(
      expect.stringContaining('dispensary consultation room'),
      { tier: 'free' }
    );
  });

  it('should use correct doc ID: agentId_type', async () => {
    mockGet.mockResolvedValueOnce({ exists: false });

    await generateAgentIllustration({
      agentId: 'deebo',
      type: 'scene',
    });

    expect(mockCollection).toHaveBeenCalledWith('agent_illustrations');
    expect(mockDoc).toHaveBeenCalledWith('deebo_scene');
  });

  it('should return error for unknown agent character', async () => {
    // Cache check runs first, so mock it
    mockGet.mockResolvedValueOnce({ exists: false });

    const result = await generateAgentIllustration({
      agentId: 'nonexistent',
      type: 'character',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('No character prompt for agent');
  });

  it('should return error on generation failure', async () => {
    mockGet.mockResolvedValueOnce({ exists: false });
    (generateImageFromPrompt as jest.Mock).mockRejectedValueOnce(
      new Error('API timeout')
    );

    const result = await generateAgentIllustration({
      agentId: 'craig',
      type: 'character',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('API timeout');
  });
});

describe('getAllCachedSlideBackgrounds', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return a map of docId to imageUrl', async () => {
    const mockDocs = [
      { id: 'title_10b981', data: () => ({ imageUrl: 'https://bg1.png' }) },
      { id: 'stat_3b82f6', data: () => ({ imageUrl: 'https://bg2.png' }) },
    ];
    mockGetAll.mockResolvedValueOnce({
      forEach: (fn: (doc: any) => void) => mockDocs.forEach(fn),
    });

    const result = await getAllCachedSlideBackgrounds();
    expect(result).toEqual({
      title_10b981: 'https://bg1.png',
      stat_3b82f6: 'https://bg2.png',
    });
  });

  it('should skip entries without imageUrl', async () => {
    const mockDocs = [
      { id: 'title_10b981', data: () => ({ imageUrl: 'https://bg1.png' }) },
      { id: 'stat_3b82f6', data: () => ({}) },
    ];
    mockGetAll.mockResolvedValueOnce({
      forEach: (fn: (doc: any) => void) => mockDocs.forEach(fn),
    });

    const result = await getAllCachedSlideBackgrounds();
    expect(result).toEqual({ title_10b981: 'https://bg1.png' });
  });

  it('should return empty object on error', async () => {
    mockGetAll.mockRejectedValueOnce(new Error('Network error'));

    const result = await getAllCachedSlideBackgrounds();
    expect(result).toEqual({});
  });
});

describe('getAllCachedAgentIllustrations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return a map of docId to imageUrl', async () => {
    const mockDocs = [
      { id: 'craig_character', data: () => ({ imageUrl: 'https://craig.png' }) },
      { id: 'smokey_scene', data: () => ({ imageUrl: 'https://smokey-scene.png' }) },
    ];
    mockGetAll.mockResolvedValueOnce({
      forEach: (fn: (doc: any) => void) => mockDocs.forEach(fn),
    });

    const result = await getAllCachedAgentIllustrations();
    expect(result).toEqual({
      craig_character: 'https://craig.png',
      smokey_scene: 'https://smokey-scene.png',
    });
  });

  it('should return empty object on error', async () => {
    mockGetAll.mockRejectedValueOnce(new Error('Firestore down'));

    const result = await getAllCachedAgentIllustrations();
    expect(result).toEqual({});
  });
});

describe('generateAllMissingSlideVisuals', () => {
  const originalSetTimeout = global.setTimeout;

  beforeEach(() => {
    jest.clearAllMocks();
    // Eliminate 1s delays between generations for test speed
    global.setTimeout = ((cb: () => void) => {
      cb();
      return 0 as unknown as NodeJS.Timeout;
    }) as unknown as typeof global.setTimeout;
  });

  afterEach(() => {
    global.setTimeout = originalSetTimeout;
  });

  it('should skip already-cached backgrounds', async () => {
    // Return all backgrounds and agents as already cached
    // 11 slide types × 6 colors = 66 backgrounds
    const bgDocs: any[] = [];
    const slideTypes = ['title', 'objectives', 'content', 'split', 'agent', 'comparison', 'quote', 'stat', 'demo', 'recap', 'cta'];
    const colors = ['10b981', '3b82f6', '8b5cf6', 'f59e0b', 'ec4899', 'ef4444'];
    for (const type of slideTypes) {
      for (const color of colors) {
        bgDocs.push({ id: `${type}_${color}`, data: () => ({ imageUrl: `https://${type}_${color}.png` }) });
      }
    }

    // Return all agent illustrations as cached too
    const agentDocs: any[] = [];
    const characterAgents = ['craig', 'money-mike', 'mrs-parker', 'deebo'];
    const sceneAgents = ['smokey', 'craig', 'pops', 'ezal', 'money-mike', 'mrs-parker', 'deebo'];
    for (const a of characterAgents) {
      agentDocs.push({ id: `${a}_character`, data: () => ({ imageUrl: `https://${a}_char.png` }) });
    }
    for (const a of sceneAgents) {
      agentDocs.push({ id: `${a}_scene`, data: () => ({ imageUrl: `https://${a}_scene.png` }) });
    }

    // First call: getAllCachedSlideBackgrounds
    mockGetAll.mockResolvedValueOnce({
      forEach: (fn: (doc: any) => void) => bgDocs.forEach(fn),
    });
    // Second call: getAllCachedAgentIllustrations
    mockGetAll.mockResolvedValueOnce({
      forEach: (fn: (doc: any) => void) => agentDocs.forEach(fn),
    });

    const result = await generateAllMissingSlideVisuals();
    expect(result.backgroundsSkipped).toBe(66);
    expect(result.backgroundsGenerated).toBe(0);
    expect(result.agentsSkipped).toBe(11); // 4 character + 7 scene
    expect(result.agentsGenerated).toBe(0);
    expect(result.errors).toHaveLength(0);
    expect(generateImageFromPrompt).not.toHaveBeenCalled();
  });

  it('should generate missing backgrounds and skip cached ones', async () => {
    // Only one background cached
    const bgDocs = [
      { id: 'title_10b981', data: () => ({ imageUrl: 'https://cached.png' }) },
    ];
    mockGetAll.mockResolvedValueOnce({
      forEach: (fn: (doc: any) => void) => bgDocs.forEach(fn),
    });
    // No agents cached
    mockGetAll.mockResolvedValueOnce({
      forEach: () => {},
    });

    // Mock all generation calls to succeed
    mockGet.mockResolvedValue({ exists: false });

    const result = await generateAllMissingSlideVisuals();
    // 66 total - 1 cached = 65 backgrounds generated
    expect(result.backgroundsSkipped).toBe(1);
    expect(result.backgroundsGenerated).toBe(65);
    // 4 characters + 7 scenes = 11 agents
    expect(result.agentsGenerated).toBe(11);
    expect(result.errors).toHaveLength(0);
  });

  it('should collect errors without stopping batch', async () => {
    // No backgrounds cached
    mockGetAll.mockResolvedValueOnce({ forEach: () => {} });
    // No agents cached
    mockGetAll.mockResolvedValueOnce({ forEach: () => {} });

    mockGet.mockResolvedValue({ exists: false });

    // First call succeeds, second fails, rest succeed
    (generateImageFromPrompt as jest.Mock)
      .mockResolvedValueOnce('data:image/png;base64,abc')
      .mockRejectedValueOnce(new Error('Rate limited'))
      .mockResolvedValue('data:image/png;base64,abc');

    const result = await generateAllMissingSlideVisuals();
    expect(result.errors.length).toBeGreaterThanOrEqual(1);
    expect(result.errors[0]).toContain('Rate limited');
    // Should still have generated some despite the error
    expect(result.backgroundsGenerated + result.agentsGenerated).toBeGreaterThan(0);
  });
});
