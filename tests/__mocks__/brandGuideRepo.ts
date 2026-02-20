/**
 * Mock Brand Guide Repository for Testing
 *
 * Provides a mock implementation of BrandGuideRepo for unit tests.
 */

import { Timestamp } from '@google-cloud/firestore';
import type { BrandGuide, BrandGuideVersion } from '@/types/brand-guide';

export interface MockBrandGuideRepo {
  create: jest.Mock;
  getById: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
  createVersion: jest.Mock;
  getVersionHistory: jest.Mock;
  getVersion: jest.Mock;
  rollbackToVersion: jest.Mock;
  saveExport: jest.Mock;
  getExports: jest.Mock;
  saveAuditReport: jest.Mock;
  getLatestAuditReport: jest.Mock;
  getAuditReports: jest.Mock;
  createABTest: jest.Mock;
  updateABTest: jest.Mock;
  getABTests: jest.Mock;
  getActiveABTests: jest.Mock;
  getByBrandId: jest.Mock;
}

/**
 * Create a mock repository with default implementations
 */
export function createMockBrandGuideRepo(): MockBrandGuideRepo {
  return {
    create: jest.fn().mockImplementation(async (brandId: string, data: Partial<BrandGuide>) => {
      return {
        id: brandId,
        brandId,
        brandName: data.brandName || 'Test Brand',
        status: data.status || 'draft',
        version: 1,
        completenessScore: 0,
        createdAt: Timestamp.now(),
        lastUpdatedAt: Timestamp.now(),
        createdBy: brandId,
        lastUpdatedBy: brandId,
        versionHistory: [],
        suggestions: [],
        ...data,
      } as BrandGuide;
    }),

    getById: jest.fn().mockResolvedValue(null),

    update: jest.fn().mockResolvedValue(undefined),

    delete: jest.fn().mockResolvedValue(undefined),

    createVersion: jest.fn().mockResolvedValue(undefined),

    getVersionHistory: jest.fn().mockResolvedValue([]),

    getVersion: jest.fn().mockResolvedValue(null),

    rollbackToVersion: jest.fn().mockResolvedValue(undefined),

    saveExport: jest.fn().mockResolvedValue(undefined),

    getExports: jest.fn().mockResolvedValue([]),

    saveAuditReport: jest.fn().mockResolvedValue(undefined),

    getLatestAuditReport: jest.fn().mockResolvedValue(null),

    getAuditReports: jest.fn().mockResolvedValue([]),

    createABTest: jest.fn().mockResolvedValue('test-id'),

    updateABTest: jest.fn().mockResolvedValue(undefined),

    getABTests: jest.fn().mockResolvedValue([]),

    getActiveABTests: jest.fn().mockResolvedValue([]),

    getByBrandId: jest.fn().mockResolvedValue([]),
  };
}

/**
 * Mock factory function for makeBrandGuideRepo
 */
export const makeBrandGuideRepo = jest.fn(() => createMockBrandGuideRepo());
