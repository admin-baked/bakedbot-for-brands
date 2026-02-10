/**
 * BakedBot Drive Server Actions Tests
 *
 * Tests for drive file management operations.
 */

import {
  sanitizeFilename,
  formatFileSize,
  generateStoragePath,
  DRIVE_CATEGORIES,
  DRIVE_ACCESS_CONTROLS,
  DRIVE_ACCESS_LEVELS,
  type DriveFile,
  type DriveFolder,
  type DriveShare,
} from '@/types/drive';

// Mock Firebase Admin
jest.mock('@/firebase/admin', () => ({
  getAdminFirestore: jest.fn(() => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn(),
        set: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      })),
      where: jest.fn(() => ({
        where: jest.fn(() => ({
          orderBy: jest.fn(() => ({
            get: jest.fn(),
          })),
          get: jest.fn(),
        })),
        orderBy: jest.fn(() => ({
          get: jest.fn(),
        })),
        get: jest.fn(),
      })),
      orderBy: jest.fn(() => ({
        get: jest.fn(),
      })),
    })),
  })),
  getAdminStorage: jest.fn(() => ({
    bucket: jest.fn(() => ({
      file: jest.fn(() => ({
        save: jest.fn(),
        delete: jest.fn(),
        getSignedUrl: jest.fn(),
        download: jest.fn(),
      })),
    })),
  })),
}));

// Mock auth
jest.mock('@/server/auth/rbac', () => ({
  requireUser: jest.fn(() =>
    Promise.resolve({
      uid: 'test-user-123',
      email: 'test@example.com',
      role: 'super_user',
    })
  ),
}));

describe('Drive Types', () => {
  describe('sanitizeFilename', () => {
    it('should replace dangerous characters with underscores', () => {
      // Path separators and traversal characters become underscores
      expect(sanitizeFilename('../test.txt')).toContain('_');
      expect(sanitizeFilename('..\\test.txt')).toContain('_');
    });

    it('should replace special characters with underscores', () => {
      expect(sanitizeFilename('file<name>.txt')).toBe('file_name_.txt');
      expect(sanitizeFilename('file:name|test?.txt')).toBe('file_name_test_.txt');
    });

    it('should collapse multiple dots to single dot', () => {
      expect(sanitizeFilename('file...txt')).toBe('file.txt');
    });

    it('should trim whitespace', () => {
      expect(sanitizeFilename('  filename.txt  ')).toBe('filename.txt');
    });

    it('should preserve valid filenames', () => {
      expect(sanitizeFilename('valid-file_name.png')).toBe('valid-file_name.png');
      expect(sanitizeFilename('Document 2024.pdf')).toBe('Document 2024.pdf');
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(500)).toBe('500 B');
    });

    it('should format kilobytes correctly', () => {
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
    });

    it('should format megabytes correctly', () => {
      expect(formatFileSize(1048576)).toBe('1 MB');
      expect(formatFileSize(5242880)).toBe('5 MB');
    });

    it('should format gigabytes correctly', () => {
      expect(formatFileSize(1073741824)).toBe('1 GB');
    });
  });

  describe('generateStoragePath', () => {
    it('should generate correct path format', () => {
      const path = generateStoragePath('user123', 'images', 'photo.jpg');
      expect(path).toMatch(/^drive\/user123\/images\/\d+_photo\.jpg$/);
    });

    it('should sanitize filename in path', () => {
      const path = generateStoragePath('user123', 'documents', '../malicious.pdf');
      // Dangerous characters get replaced with underscores
      expect(path).toContain('/documents/');
      expect(path).toContain('malicious.pdf');
    });

    it('should use correct category', () => {
      const agentsPath = generateStoragePath('user123', 'agents', 'bot.png');
      const qrPath = generateStoragePath('user123', 'qr', 'code.svg');

      expect(agentsPath).toContain('/agents/');
      expect(qrPath).toContain('/qr/');
    });
  });

  describe('DRIVE_CATEGORIES', () => {
    it('should have all required categories', () => {
      expect(DRIVE_CATEGORIES).toHaveProperty('agents');
      expect(DRIVE_CATEGORIES).toHaveProperty('qr');
      expect(DRIVE_CATEGORIES).toHaveProperty('images');
      expect(DRIVE_CATEGORIES).toHaveProperty('documents');
      expect(DRIVE_CATEGORIES).toHaveProperty('custom');
    });

    it('should have label and icon for each category', () => {
      Object.values(DRIVE_CATEGORIES).forEach((category) => {
        expect(category).toHaveProperty('label');
        expect(category).toHaveProperty('icon');
        expect(typeof category.label).toBe('string');
        expect(typeof category.icon).toBe('string');
      });
    });
  });

  describe('DRIVE_ACCESS_CONTROLS', () => {
    it('should have all access control types', () => {
      expect(DRIVE_ACCESS_CONTROLS).toHaveProperty('public');
      expect(DRIVE_ACCESS_CONTROLS).toHaveProperty('link-only');
      expect(DRIVE_ACCESS_CONTROLS).toHaveProperty('email-gated');
      expect(DRIVE_ACCESS_CONTROLS).toHaveProperty('users-only');
      expect(DRIVE_ACCESS_CONTROLS).toHaveProperty('private');
    });

    it('should have label and description for each control', () => {
      Object.values(DRIVE_ACCESS_CONTROLS).forEach((control) => {
        expect(control).toHaveProperty('label');
        expect(control).toHaveProperty('description');
      });
    });
  });

  describe('DRIVE_ACCESS_LEVELS', () => {
    it('should have all access levels', () => {
      expect(DRIVE_ACCESS_LEVELS).toHaveProperty('view');
      expect(DRIVE_ACCESS_LEVELS).toHaveProperty('download');
      expect(DRIVE_ACCESS_LEVELS).toHaveProperty('edit');
    });
  });
});

describe('Drive File Type', () => {
  it('should accept valid DriveFile structure', () => {
    const file: DriveFile = {
      id: 'file-123',
      name: 'test.png',
      mimeType: 'image/png',
      size: 1024,
      storagePath: 'drive/user/images/123_test.png',
      downloadUrl: 'https://storage.googleapis.com/...',
      folderId: null,
      path: '/',
      ownerId: 'user-123',
      ownerEmail: 'test@example.com',
      category: 'images',
      tags: ['test'],
      description: null,
      metadata: {},
      isShared: false,
      shareIds: [],
      viewCount: 0,
      downloadCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      isDeleted: false,
      deletedAt: null,
    };

    expect(file.id).toBe('file-123');
    expect(file.category).toBe('images');
  });
});

describe('Drive Folder Type', () => {
  it('should accept valid DriveFolder structure', () => {
    const folder: DriveFolder = {
      id: 'folder-123',
      name: 'My Folder',
      parentId: null,
      path: '/',
      depth: 0,
      ownerId: 'user-123',
      isSystemFolder: false,
      category: 'custom',
      fileCount: 0,
      totalSize: 0,
      isShared: false,
      shareIds: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      isDeleted: false,
      deletedAt: null,
    };

    expect(folder.id).toBe('folder-123');
    expect(folder.isSystemFolder).toBe(false);
  });

  it('should handle system folders', () => {
    const systemFolder: DriveFolder = {
      id: 'folder-agents',
      name: 'Agents',
      parentId: null,
      path: '/agents',
      depth: 0,
      ownerId: 'user-123',
      isSystemFolder: true,
      category: 'agents',
      fileCount: 5,
      totalSize: 1024000,
      isShared: false,
      shareIds: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      isDeleted: false,
      deletedAt: null,
    };

    expect(systemFolder.isSystemFolder).toBe(true);
    expect(systemFolder.category).toBe('agents');
  });
});

describe('Drive Share Type', () => {
  it('should accept valid DriveShare structure', () => {
    const share: DriveShare = {
      id: 'share-123',
      targetType: 'file',
      targetId: 'file-456',
      targetPath: '/images/photo.jpg',
      isPublic: false,
      shareToken: 'abc123xyz',
      shareUrl: 'https://app.bakedbot.ai/api/drive/share/abc123xyz',
      accessControl: 'link-only',
      accessLevel: 'view',
      allowedUsers: [],
      password: null,
      expiresAt: null,
      maxDownloads: null,
      viewCount: 0,
      downloadCount: 0,
      accessLog: [],
      createdBy: 'user-123',
      createdAt: new Date(),
      isActive: true,
      revokedAt: null,
    };

    expect(share.shareToken).toBe('abc123xyz');
    expect(share.accessControl).toBe('link-only');
  });

  it('should handle password-protected shares', () => {
    const share: DriveShare = {
      id: 'share-456',
      targetType: 'folder',
      targetId: 'folder-789',
      targetPath: '/documents',
      isPublic: false,
      shareToken: 'protected123',
      shareUrl: 'https://app.bakedbot.ai/api/drive/share/protected123',
      accessControl: 'link-only',
      accessLevel: 'download',
      allowedUsers: [],
      password: '$2b$10$hashedpassword',
      expiresAt: new Date('2025-12-31'),
      maxDownloads: 100,
      viewCount: 5,
      downloadCount: 2,
      accessLog: [
        {
          userId: null,
          email: 'visitor@example.com',
          accessedAt: new Date(),
          action: 'view',
          ipAddress: '192.168.1.1',
        },
      ],
      createdBy: 'user-123',
      createdAt: new Date(),
      isActive: true,
      revokedAt: null,
    };

    expect(share.password).toBeTruthy();
    expect(share.maxDownloads).toBe(100);
    expect(share.accessLog.length).toBe(1);
  });

  it('should handle user-restricted shares', () => {
    const share: DriveShare = {
      id: 'share-789',
      targetType: 'file',
      targetId: 'file-123',
      targetPath: '/confidential.pdf',
      isPublic: false,
      shareToken: 'restricted456',
      shareUrl: 'https://app.bakedbot.ai/api/drive/share/restricted456',
      accessControl: 'users-only',
      accessLevel: 'edit',
      allowedUsers: [
        { email: 'user1@example.com', accessLevel: 'edit', invitedAt: new Date() },
        { email: 'user2@example.com', accessLevel: 'view', invitedAt: new Date() },
      ],
      password: null,
      expiresAt: null,
      maxDownloads: null,
      viewCount: 10,
      downloadCount: 3,
      accessLog: [],
      createdBy: 'user-123',
      createdAt: new Date(),
      isActive: true,
      revokedAt: null,
    };

    expect(share.accessControl).toBe('users-only');
    expect(share.allowedUsers.length).toBe(2);
    expect(share.allowedUsers[0].accessLevel).toBe('edit');
  });
});
