import {
  uploadThemeAction,
  listThemesAction,
  activateThemeAction,
  deleteThemeAction,
  getActiveThemeAction,
} from '@/server/actions/themes';
import { requireUser } from '@/server/auth/auth';
import { getAdminFirestore } from '@/firebase/admin';
import { wordPressThemeService } from '@/server/services/wordpress-theme-service';
import { logger } from '@/lib/logger';

jest.mock('@/server/auth/auth');
jest.mock('@/firebase/admin');
jest.mock('@/server/services/wordpress-theme-service');
jest.mock('@/lib/logger');

const mockRequireUser = requireUser as jest.MockedFunction<typeof requireUser>;
const mockGetAdminFirestore = getAdminFirestore as jest.MockedFunction<typeof getAdminFirestore>;
const mockWordPressThemeService = wordPressThemeService as jest.Mocked<typeof wordPressThemeService>;

describe('WordPress Theme Management Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireUser.mockResolvedValue({
      uid: 'user_123',
      email: 'admin@example.com',
    } as any);
  });

  describe('uploadThemeAction', () => {
    it('requires user authentication', async () => {
      mockRequireUser.mockRejectedValue(new Error('Unauthenticated'));

      const formData = new FormData();
      formData.append('file', new File(['content'], 'theme.zip', { type: 'application/zip' }));

      const result = await uploadThemeAction('org_test', formData);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('requires org admin role (brand_admin or dispensary_admin)', async () => {
      const mockDb = {
        collection: jest.fn().mockReturnThis(),
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => ({ role: 'brand_member', orgMemberships: { org_test: {} } }),
          }),
        }),
      };

      mockGetAdminFirestore.mockReturnValue(mockDb as any);

      const formData = new FormData();
      formData.append('file', new File(['content'], 'theme.zip', { type: 'application/zip' }));

      const result = await uploadThemeAction('org_test', formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('permission');
    });

    it('blocks upload if user not member of org', async () => {
      const mockDb = {
        collection: jest.fn().mockReturnThis(),
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => ({ role: 'brand_admin', orgMemberships: { org_other: {} } }),
          }),
        }),
      };

      mockGetAdminFirestore.mockReturnValue(mockDb as any);

      const formData = new FormData();
      formData.append('file', new File(['content'], 'theme.zip', { type: 'application/zip' }));

      const result = await uploadThemeAction('org_test', formData);

      expect(result.success).toBe(false);
    });

    it('returns error if no file provided', async () => {
      const mockDb = {
        collection: jest.fn().mockReturnThis(),
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => ({ role: 'brand_admin', orgMemberships: { org_test: {} } }),
          }),
        }),
      };

      mockGetAdminFirestore.mockReturnValue(mockDb as any);

      const formData = new FormData();
      const result = await uploadThemeAction('org_test', formData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No file provided');
    });

    it('delegates to wordPressThemeService for upload', async () => {
      const mockDb = {
        collection: jest.fn().mockReturnThis(),
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => ({ role: 'brand_admin', orgMemberships: { org_test: {} } }),
          }),
        }),
      };

      mockGetAdminFirestore.mockReturnValue(mockDb as any);
      mockWordPressThemeService.uploadTheme.mockResolvedValue({
        success: true,
        theme: {
          id: 'theme_123',
          name: 'Test Theme',
          version: '1.0',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      const formData = new FormData();
      formData.append('file', new File(['content'], 'theme.zip', { type: 'application/zip' }));

      const result = await uploadThemeAction('org_test', formData);

      expect(result.success).toBe(true);
      expect(result.themeId).toBe('theme_123');
      expect(mockWordPressThemeService.uploadTheme).toHaveBeenCalled();
    });

    it('returns validation errors from service', async () => {
      const mockDb = {
        collection: jest.fn().mockReturnThis(),
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => ({ role: 'brand_admin', orgMemberships: { org_test: {} } }),
          }),
        }),
      };

      mockGetAdminFirestore.mockReturnValue(mockDb as any);
      mockWordPressThemeService.uploadTheme.mockResolvedValue({
        success: false,
        error: 'Invalid theme format',
        validationErrors: ['Missing stylesheet.css'],
      });

      const formData = new FormData();
      formData.append('file', new File(['invalid'], 'bad.zip', { type: 'application/zip' }));

      const result = await uploadThemeAction('org_test', formData);

      expect(result.success).toBe(false);
      expect(result.validationErrors).toEqual(['Missing stylesheet.css']);
    });
  });

  describe('listThemesAction', () => {
    it('requires user authentication', async () => {
      mockRequireUser.mockRejectedValue(new Error('Unauthenticated'));

      const result = await listThemesAction('org_test');

      expect(result.success).toBe(false);
    });

    it('requires org admin access', async () => {
      const mockDb = {
        collection: jest.fn().mockReturnThis(),
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => ({ role: 'viewer', orgMemberships: { org_test: {} } }),
          }),
        }),
      };

      mockGetAdminFirestore.mockReturnValue(mockDb as any);

      const result = await listThemesAction('org_test');

      expect(result.success).toBe(false);
    });

    it('returns paginated theme list', async () => {
      const mockDb = {
        collection: jest.fn().mockReturnThis(),
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => ({ role: 'brand_admin', orgMemberships: { org_test: {} } }),
          }),
        }),
      };

      mockGetAdminFirestore.mockReturnValue(mockDb as any);
      mockWordPressThemeService.listThemes.mockResolvedValue({
        success: true,
        themes: [
          { id: 't1', name: 'Theme 1', active: true, createdAt: new Date(), updatedAt: new Date() },
          { id: 't2', name: 'Theme 2', active: false, createdAt: new Date(), updatedAt: new Date() },
        ],
        total: 2,
        pageNumber: 1,
        pageSize: 5,
      });

      const result = await listThemesAction('org_test', 5, 1);

      expect(result.success).toBe(true);
      expect(result.themes).toHaveLength(2);
      expect(mockWordPressThemeService.listThemes).toHaveBeenCalledWith('org_test', 5, 1);
    });

    it('respects pageSize and pageNumber parameters', async () => {
      const mockDb = {
        collection: jest.fn().mockReturnThis(),
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => ({ role: 'brand_admin', orgMemberships: { org_test: {} } }),
          }),
        }),
      };

      mockGetAdminFirestore.mockReturnValue(mockDb as any);
      mockWordPressThemeService.listThemes.mockResolvedValue({
        success: true,
        themes: [],
        total: 0,
        pageNumber: 2,
        pageSize: 10,
      });

      await listThemesAction('org_test', 10, 2);

      expect(mockWordPressThemeService.listThemes).toHaveBeenCalledWith('org_test', 10, 2);
    });
  });

  describe('activateThemeAction', () => {
    it('requires authentication and org access', async () => {
      mockRequireUser.mockRejectedValue(new Error('Unauthenticated'));

      const result = await activateThemeAction('org_test', 'theme_123');

      expect(result.success).toBe(false);
    });

    it('activates theme via service', async () => {
      const mockDb = {
        collection: jest.fn().mockReturnThis(),
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => ({ role: 'brand_admin', orgMemberships: { org_test: {} } }),
          }),
        }),
      };

      mockGetAdminFirestore.mockReturnValue(mockDb as any);
      mockWordPressThemeService.activateTheme.mockResolvedValue({
        success: true,
        activeTheme: {
          id: 'theme_123',
          name: 'Test Theme',
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        previouslyActive: { id: 'theme_old', name: 'Old Theme' },
      });

      const result = await activateThemeAction('org_test', 'theme_123');

      expect(result.success).toBe(true);
      expect(mockWordPressThemeService.activateTheme).toHaveBeenCalledWith('org_test', 'theme_123');
    });
  });

  describe('deleteThemeAction', () => {
    it('requires org admin access', async () => {
      mockRequireUser.mockRejectedValue(new Error('Unauthenticated'));

      const result = await deleteThemeAction('org_test', 'theme_123');

      expect(result.success).toBe(false);
    });

    it('returns fallbackToDefault flag when deleting active theme', async () => {
      const mockDb = {
        collection: jest.fn().mockReturnThis(),
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => ({ role: 'brand_admin', orgMemberships: { org_test: {} } }),
          }),
        }),
      };

      mockGetAdminFirestore.mockReturnValue(mockDb as any);
      mockWordPressThemeService.deleteTheme.mockResolvedValue({
        success: true,
        fallbackToDefault: true,
        message: 'Theme was active and reverted to default',
      });

      const result = await deleteThemeAction('org_test', 'theme_123');

      expect(result.success).toBe(true);
      expect(result.fallbackToDefault).toBe(true);
    });

    it('deletes theme without fallback if not active', async () => {
      const mockDb = {
        collection: jest.fn().mockReturnThis(),
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => ({ role: 'brand_admin', orgMemberships: { org_test: {} } }),
          }),
        }),
      };

      mockGetAdminFirestore.mockReturnValue(mockDb as any);
      mockWordPressThemeService.deleteTheme.mockResolvedValue({
        success: true,
        fallbackToDefault: false,
        message: 'Theme deleted',
      });

      const result = await deleteThemeAction('org_test', 'theme_123');

      expect(result.success).toBe(true);
      expect(result.fallbackToDefault).toBe(false);
    });
  });

  describe('getActiveThemeAction', () => {
    it('requires authentication', async () => {
      mockRequireUser.mockRejectedValue(new Error('Unauthenticated'));

      const result = await getActiveThemeAction('org_test');

      expect(result.success).toBe(false);
    });

    it('returns active theme for organization', async () => {
      const mockDb = {
        collection: jest.fn().mockReturnThis(),
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => ({ role: 'brand_admin', orgMemberships: { org_test: {} } }),
          }),
        }),
      };

      mockGetAdminFirestore.mockReturnValue(mockDb as any);
      mockWordPressThemeService.getActiveTheme.mockResolvedValue({
        success: true,
        theme: {
          id: 'theme_active',
          name: 'Active Theme',
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      const result = await getActiveThemeAction('org_test');

      expect(result.success).toBe(true);
      expect(result.theme?.id).toBe('theme_active');
      expect(result.theme?.active).toBe(true);
    });

    it('returns null when no active theme', async () => {
      const mockDb = {
        collection: jest.fn().mockReturnThis(),
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => ({ role: 'brand_admin', orgMemberships: { org_test: {} } }),
          }),
        }),
      };

      mockGetAdminFirestore.mockReturnValue(mockDb as any);
      mockWordPressThemeService.getActiveTheme.mockResolvedValue({
        success: true,
        theme: null,
      });

      const result = await getActiveThemeAction('org_test');

      expect(result.success).toBe(true);
      expect(result.theme).toBeNull();
    });
  });

  describe('Org Isolation', () => {
    it('prevents user from accessing themes of another org', async () => {
      const mockDb = {
        collection: jest.fn().mockReturnThis(),
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => ({ role: 'brand_admin', orgMemberships: { org_a: {} } }),
          }),
        }),
      };

      mockGetAdminFirestore.mockReturnValue(mockDb as any);

      const result = await listThemesAction('org_b');

      expect(result.success).toBe(false);
    });

    it('allows user with multiple org memberships to access their orgs', async () => {
      const mockDb = {
        collection: jest.fn().mockReturnThis(),
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => ({ role: 'brand_admin', orgMemberships: { org_a: {}, org_b: {} } }),
          }),
        }),
      };

      mockGetAdminFirestore.mockReturnValue(mockDb as any);
      mockWordPressThemeService.listThemes.mockResolvedValue({
        success: true,
        themes: [],
        total: 0,
        pageNumber: 1,
        pageSize: 5,
      });

      const result = await listThemesAction('org_b', 5, 1);

      expect(result.success).toBe(true);
    });
  });
});
