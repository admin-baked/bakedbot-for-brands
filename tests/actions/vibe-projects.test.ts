/**
 * Tests for Vibe Project CRUD server actions
 */

import {
  createVibeProject,
  getVibeProject,
  updateVibeProject,
  autoSaveVibeProject,
  getUserVibeProjects,
  deleteVibeProject,
  publishVibeProject,
} from '@/server/actions/vibe-projects';
import { getAdminFirestore } from '@/firebase/admin';

// Mock modules
jest.mock('@/firebase/admin', () => ({
  getAdminFirestore: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('vibe-projects', () => {
  const mockAdd = jest.fn();
  const mockGet = jest.fn();
  const mockUpdate = jest.fn();
  const mockDelete = jest.fn();
  const mockDoc = jest.fn();
  const mockCollection = jest.fn();
  const mockWhere = jest.fn();
  const mockOrderBy = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockDoc.mockReturnValue({
      get: mockGet,
      update: mockUpdate,
      delete: mockDelete,
    });

    const queryChain = {
      where: mockWhere,
      orderBy: mockOrderBy,
      get: mockGet,
    };
    mockWhere.mockReturnValue(queryChain);
    mockOrderBy.mockReturnValue(queryChain);

    mockCollection.mockReturnValue({
      add: mockAdd,
      doc: mockDoc,
      where: mockWhere,
    });

    (getAdminFirestore as jest.Mock).mockReturnValue({
      collection: mockCollection,
    });
  });

  // ─── createVibeProject ───────────────────────────────────────────────────

  describe('createVibeProject', () => {
    const validInput = {
      userId: 'user123',
      name: 'My Dispensary Site',
      html: '<h1>Hello</h1>',
      css: 'h1 { color: green; }',
      components: '[]',
      styles: '[]',
      status: 'draft' as const,
      visibility: 'private' as const,
    };

    it('should create a project and return projectId', async () => {
      mockAdd.mockResolvedValue({ id: 'proj_abc123' });

      const result = await createVibeProject(validInput);

      expect(result.success).toBe(true);
      expect(result.projectId).toBe('proj_abc123');
      expect(mockCollection).toHaveBeenCalledWith('vibe_projects');
      expect(mockAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user123',
          name: 'My Dispensary Site',
          html: '<h1>Hello</h1>',
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
          lastEditedAt: expect.any(String),
        })
      );
    });

    it('should set timestamps on creation', async () => {
      mockAdd.mockResolvedValue({ id: 'proj_new' });

      await createVibeProject(validInput);

      const addedData = mockAdd.mock.calls[0][0];
      expect(addedData.createdAt).toBeDefined();
      expect(addedData.updatedAt).toBeDefined();
      expect(addedData.lastEditedAt).toBeDefined();

      // Timestamps should be ISO strings
      expect(() => new Date(addedData.createdAt)).not.toThrow();
    });

    it('should return error on Firestore failure', async () => {
      mockAdd.mockRejectedValue(new Error('Firestore unavailable'));

      const result = await createVibeProject(validInput);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to create project');
      expect(result.projectId).toBeUndefined();
    });

    it('should pass through all input fields', async () => {
      const inputWithPOS = {
        ...validInput,
        connectedPOS: {
          type: 'alleaves' as const,
          orgId: 'org_thrive',
          syncEnabled: true,
        },
        description: 'A great dispensary',
        thumbnail: 'https://example.com/thumb.png',
      };

      mockAdd.mockResolvedValue({ id: 'proj_pos' });

      await createVibeProject(inputWithPOS);

      const addedData = mockAdd.mock.calls[0][0];
      expect(addedData.connectedPOS).toEqual({
        type: 'alleaves',
        orgId: 'org_thrive',
        syncEnabled: true,
      });
      expect(addedData.description).toBe('A great dispensary');
    });
  });

  // ─── getVibeProject ──────────────────────────────────────────────────────

  describe('getVibeProject', () => {
    it('should return a project when it exists', async () => {
      mockGet.mockResolvedValue({
        exists: true,
        id: 'proj_abc',
        data: () => ({
          userId: 'user123',
          name: 'Test Project',
          status: 'draft',
          html: '<div></div>',
          css: '',
          components: '[]',
          styles: '[]',
        }),
      });

      const result = await getVibeProject('proj_abc');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('proj_abc');
      expect(result!.name).toBe('Test Project');
    });

    it('should return null for non-existent project', async () => {
      mockGet.mockResolvedValue({ exists: false });

      const result = await getVibeProject('nonexistent');

      expect(result).toBeNull();
    });

    it('should return null on Firestore error', async () => {
      mockGet.mockRejectedValue(new Error('Permission denied'));

      const result = await getVibeProject('proj_error');

      expect(result).toBeNull();
    });

    it('should merge doc id with data', async () => {
      mockGet.mockResolvedValue({
        exists: true,
        id: 'proj_merge',
        data: () => ({
          name: 'Merged',
          userId: 'user1',
        }),
      });

      const result = await getVibeProject('proj_merge');

      expect(result!.id).toBe('proj_merge');
      expect(result!.name).toBe('Merged');
    });
  });

  // ─── updateVibeProject ───────────────────────────────────────────────────

  describe('updateVibeProject', () => {
    it('should update a project with new data', async () => {
      mockUpdate.mockResolvedValue(undefined);

      const result = await updateVibeProject('proj_abc', {
        name: 'Updated Name',
        description: 'New description',
      });

      expect(result.success).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Updated Name',
          description: 'New description',
          updatedAt: expect.any(String),
          lastEditedAt: expect.any(String),
        })
      );
    });

    it('should always update timestamps', async () => {
      mockUpdate.mockResolvedValue(undefined);

      await updateVibeProject('proj_abc', { name: 'X' });

      const updateData = mockUpdate.mock.calls[0][0];
      expect(updateData.updatedAt).toBeDefined();
      expect(updateData.lastEditedAt).toBeDefined();
    });

    it('should return error on Firestore failure', async () => {
      mockUpdate.mockRejectedValue(new Error('Not found'));

      const result = await updateVibeProject('nonexistent', { name: 'X' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to update project');
    });

    it('should allow updating status', async () => {
      mockUpdate.mockResolvedValue(undefined);

      const result = await updateVibeProject('proj_abc', { status: 'archived' });

      expect(result.success).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'archived' })
      );
    });
  });

  // ─── autoSaveVibeProject ─────────────────────────────────────────────────

  describe('autoSaveVibeProject', () => {
    const editorData = {
      html: '<div>Updated</div>',
      css: 'div { color: red; }',
      components: '[{"type":"text"}]',
      styles: '[{"selectors":["div"]}]',
    };

    it('should save editor data with auto-save timestamp', async () => {
      mockUpdate.mockResolvedValue(undefined);

      const result = await autoSaveVibeProject('proj_abc', editorData);

      expect(result.success).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          html: '<div>Updated</div>',
          css: 'div { color: red; }',
          components: '[{"type":"text"}]',
          styles: '[{"selectors":["div"]}]',
          lastAutoSaveAt: expect.any(String),
          hasUnsavedChanges: false,
        })
      );
    });

    it('should set hasUnsavedChanges to false', async () => {
      mockUpdate.mockResolvedValue(undefined);

      await autoSaveVibeProject('proj_abc', editorData);

      const updateData = mockUpdate.mock.calls[0][0];
      expect(updateData.hasUnsavedChanges).toBe(false);
    });

    it('should return error on failure', async () => {
      mockUpdate.mockRejectedValue(new Error('Quota exceeded'));

      const result = await autoSaveVibeProject('proj_abc', editorData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Auto-save failed');
    });

    it('should handle large HTML content', async () => {
      mockUpdate.mockResolvedValue(undefined);

      const largeHtml = '<div>' + 'x'.repeat(100_000) + '</div>';
      const result = await autoSaveVibeProject('proj_abc', {
        ...editorData,
        html: largeHtml,
      });

      expect(result.success).toBe(true);
      expect(mockUpdate.mock.calls[0][0].html).toBe(largeHtml);
    });
  });

  // ─── getUserVibeProjects ─────────────────────────────────────────────────

  describe('getUserVibeProjects', () => {
    it('should return all projects for a user', async () => {
      const mockDocs = [
        {
          id: 'proj_1',
          data: () => ({
            name: 'Project 1',
            status: 'draft',
            updatedAt: '2026-02-11T00:00:00Z',
            lastEditedAt: '2026-02-11T00:00:00Z',
          }),
        },
        {
          id: 'proj_2',
          data: () => ({
            name: 'Project 2',
            status: 'published',
            updatedAt: '2026-02-10T00:00:00Z',
            lastEditedAt: '2026-02-10T00:00:00Z',
            thumbnail: 'https://thumb.png',
          }),
        },
      ];

      mockGet.mockResolvedValue({
        forEach: (fn: (doc: typeof mockDocs[0]) => void) => mockDocs.forEach(fn),
      });

      const result = await getUserVibeProjects('user123');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('proj_1');
      expect(result[0].name).toBe('Project 1');
      expect(result[1].thumbnail).toBe('https://thumb.png');
    });

    it('should filter by status when provided', async () => {
      mockGet.mockResolvedValue({
        forEach: () => {},
      });

      await getUserVibeProjects('user123', 'published');

      // Should have two where calls: userId and status
      expect(mockWhere).toHaveBeenCalledWith('userId', '==', 'user123');
      expect(mockWhere).toHaveBeenCalledWith('status', '==', 'published');
    });

    it('should not filter by status when not provided', async () => {
      mockGet.mockResolvedValue({
        forEach: () => {},
      });

      await getUserVibeProjects('user123');

      // Only userId where clause
      expect(mockWhere).toHaveBeenCalledWith('userId', '==', 'user123');
      expect(mockWhere).not.toHaveBeenCalledWith('status', '==', expect.anything());
    });

    it('should order by updatedAt descending', async () => {
      mockGet.mockResolvedValue({
        forEach: () => {},
      });

      await getUserVibeProjects('user123');

      expect(mockOrderBy).toHaveBeenCalledWith('updatedAt', 'desc');
    });

    it('should return empty array on error', async () => {
      mockGet.mockRejectedValue(new Error('Index not found'));

      const result = await getUserVibeProjects('user123');

      expect(result).toEqual([]);
    });

    it('should return empty array for user with no projects', async () => {
      mockGet.mockResolvedValue({
        forEach: () => {},
      });

      const result = await getUserVibeProjects('user_no_projects');

      expect(result).toEqual([]);
    });
  });

  // ─── deleteVibeProject ───────────────────────────────────────────────────

  describe('deleteVibeProject', () => {
    it('should delete a project', async () => {
      mockDelete.mockResolvedValue(undefined);

      const result = await deleteVibeProject('proj_abc');

      expect(result.success).toBe(true);
      expect(mockDoc).toHaveBeenCalledWith('proj_abc');
      expect(mockDelete).toHaveBeenCalled();
    });

    it('should return error on Firestore failure', async () => {
      mockDelete.mockRejectedValue(new Error('Permission denied'));

      const result = await deleteVibeProject('proj_protected');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to delete project');
    });
  });

  // ─── publishVibeProject ──────────────────────────────────────────────────

  describe('publishVibeProject', () => {
    it('should update project status to published', async () => {
      mockUpdate.mockResolvedValue(undefined);

      const result = await publishVibeProject(
        'proj_abc',
        'https://mysite.bakedbot.site'
      );

      expect(result.success).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'published',
          publishedUrl: 'https://mysite.bakedbot.site',
          lastPublishedAt: expect.any(String),
          updatedAt: expect.any(String),
        })
      );
    });

    it('should return error on failure', async () => {
      mockUpdate.mockRejectedValue(new Error('Publish failed'));

      const result = await publishVibeProject('proj_abc', 'https://x.bakedbot.site');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to publish project');
    });
  });
});
