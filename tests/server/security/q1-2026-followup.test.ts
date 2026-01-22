/**
 * Unit tests for Q1 2026 Security Audit Follow-up Fixes
 *
 * Tests verify that security patterns are correctly implemented by:
 * 1. Checking source files contain required security imports and checks
 * 2. Validating security patterns in route handlers
 *
 * Note: Cannot directly test Next.js route handlers in Jest, so we verify
 * the security code patterns are present in the source files.
 */

import { jest, describe, it, expect, beforeAll } from '@jest/globals';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Helper to read route file
async function readRouteFile(routePath: string): Promise<string> {
  const fullPath = path.join(process.cwd(), routePath);
  return fs.readFile(fullPath, 'utf-8');
}

// ============================================================================
// CRITICAL: Jobs Process API Authentication
// ============================================================================

describe('Jobs Process API Security', () => {
  let content: string;

  beforeAll(async () => {
    content = await readRouteFile('src/app/api/jobs/process/route.ts');
  });

  it('should import requireSuperUser', () => {
    expect(content).toContain("import { requireSuperUser }");
    expect(content).toContain("from '@/server/auth/auth'");
  });

  it('should call requireSuperUser() before processing', () => {
    expect(content).toContain('await requireSuperUser()');
  });

  it('should have security comment', () => {
    expect(content).toContain('SECURITY');
    expect(content).toContain('Super User authentication');
  });
});

// ============================================================================
// CRITICAL: Playbooks Execute API Authentication + IDOR
// ============================================================================

describe('Playbooks Execute API Security', () => {
  let content: string;

  beforeAll(async () => {
    content = await readRouteFile('src/app/api/playbooks/execute/route.ts');
  });

  it('should import requireUser', () => {
    expect(content).toContain("import { requireUser }");
    expect(content).toContain("from '@/server/auth/auth'");
  });

  it('should call requireUser() for authentication', () => {
    expect(content).toContain('await requireUser()');
  });

  it('should verify org membership before execution', () => {
    expect(content).toContain('verifyOrgMembership');
    expect(content).toContain('session.uid');
    expect(content).toContain('orgId');
  });

  it('should use session.uid instead of request body userId', () => {
    expect(content).toContain('userId: session.uid');
  });

  it('should return 403 for unauthorized org access', () => {
    expect(content).toContain('status: 403');
    expect(content).toContain('Forbidden');
  });
});

// ============================================================================
// CRITICAL: Billing API Authentication
// ============================================================================

describe('Billing Authorize.net API Security', () => {
  let content: string;

  beforeAll(async () => {
    content = await readRouteFile('src/app/api/billing/authorize-net/route.ts');
  });

  it('should import requireUser', () => {
    // Can be a named import or destructured import
    expect(content).toContain('requireUser');
    // Handle both single and double quotes for the import path
    expect(content).toMatch(/from\s+['"]@\/server\/auth\/auth['"]/);
  });

  it('should call requireUser() for authentication', () => {
    expect(content).toContain('await requireUser()');
  });

  it('should verify org admin access', () => {
    expect(content).toContain('verifyOrgAccess');
  });

  it('should return 403 for unauthorized billing access', () => {
    expect(content).toContain('status: 403');
    expect(content).toContain('Forbidden');
  });
});

// ============================================================================
// CRITICAL: Dev Routes Production Gate
// ============================================================================

describe('Dev Routes Production Gate', () => {
  const devRoutes = [
    'src/app/api/dev/crawl/route.ts',
    'src/app/api/dev/normalize/route.ts',
    'src/app/api/dev/seed-cannmenus-stub/route.ts',
    'src/app/api/dev/build-cannmenus-embeddings/route.ts',
    'src/app/api/dev/delete-all-pages/route.ts',
    'src/app/api/dev/run-pilot/route.ts',
    'src/app/api/dev/seed-test-pages/route.ts',
    'src/app/api/dev/verify-pilot/route.ts',
  ];

  it.each(devRoutes)('should gate %s to non-production', async (routePath) => {
    const content = await readRouteFile(routePath);

    // Check for production environment gate
    expect(content).toContain("process.env.NODE_ENV === 'production'");
    expect(content).toContain('Dev route disabled in production');
    expect(content).toContain('status: 403');
  });

  it.each(devRoutes)('should require authentication in %s', async (routePath) => {
    const content = await readRouteFile(routePath);

    // Check for authentication
    expect(content).toMatch(/require(?:Super)?User/);
  });

  it.each(devRoutes)('should have security documentation in %s', async (routePath) => {
    const content = await readRouteFile(routePath);

    expect(content).toContain('SECURITY');
    expect(content).toContain('DEV ONLY');
  });
});

// ============================================================================
// HIGH: CORS Wildcard Fix
// ============================================================================

describe('Browser Session CORS Security', () => {
  let content: string;

  beforeAll(async () => {
    content = await readRouteFile('src/app/api/browser/session/route.ts');
  });

  it('should NOT use CORS wildcard *', () => {
    // Should not have a static corsHeaders with '*'
    expect(content).not.toMatch(/['"]Access-Control-Allow-Origin['"]\s*:\s*['"]\*['"]/);
  });

  it('should implement getAllowedOrigin function', () => {
    expect(content).toContain('getAllowedOrigin');
    expect(content).toContain('ALLOWED_ORIGINS');
  });

  it('should use dynamic CORS headers', () => {
    expect(content).toContain('getCorsHeaders');
  });

  it('should set Access-Control-Allow-Credentials', () => {
    expect(content).toContain('Access-Control-Allow-Credentials');
    expect(content).toContain("'true'");
  });
});

// ============================================================================
// HIGH: CRON_SECRET Required
// ============================================================================

describe('Cron Routes CRON_SECRET Required', () => {
  const cronRoutes = [
    'src/app/api/cron/evaluate-alerts/route.ts',
    'src/app/api/cron/brand-pilot/route.ts',
    'src/app/api/cron/seo-pilot/route.ts',
    'src/app/api/cron/cleanup-brands/route.ts',
    'src/app/api/cron/dayday-discovery/route.ts',
    'src/app/api/cron/dayday-review/route.ts',
  ];

  it.each(cronRoutes)('should require CRON_SECRET to be configured in %s', async (routePath) => {
    const content = await readRouteFile(routePath);

    // Check that CRON_SECRET is required (not optional)
    expect(content).toContain('!cronSecret');
    expect(content).toContain('CRON_SECRET environment variable is not configured');
    expect(content).toContain('status: 500');
  });

  it.each(cronRoutes)('should check Bearer token in %s', async (routePath) => {
    const content = await readRouteFile(routePath);

    expect(content).toContain('Bearer');
    expect(content).toContain('cronSecret');
  });

  it.each(cronRoutes)('should use logger instead of console in %s', async (routePath) => {
    const content = await readRouteFile(routePath);

    // Should import and use logger
    expect(content).toContain("import { logger }");
    expect(content).toContain('logger.error');

    // Should NOT use console.log/error directly
    expect(content).not.toContain('console.log');
    expect(content).not.toContain('console.error');
  });
});

// ============================================================================
// MEDIUM: Error Handling Patterns
// ============================================================================

describe('Error Handling Security', () => {
  const routesWithErrorHandling = [
    'src/app/api/dev/delete-all-pages/route.ts',
    'src/app/api/dev/run-pilot/route.ts',
    'src/app/api/dev/seed-test-pages/route.ts',
    'src/app/api/dev/verify-pilot/route.ts',
    'src/app/api/cron/brand-pilot/route.ts',
    'src/app/api/cron/seo-pilot/route.ts',
    'src/app/api/cron/cleanup-brands/route.ts',
  ];

  it.each(routesWithErrorHandling)('should use logger instead of console in %s', async (routePath) => {
    const content = await readRouteFile(routePath);

    // Should use logger
    expect(content).toContain('logger.');

    // Should NOT use console.log/error
    expect(content).not.toContain('console.log');
    expect(content).not.toContain('console.error');
  });

  it.each(routesWithErrorHandling)('should use safe error extraction in %s', async (routePath) => {
    const content = await readRouteFile(routePath);

    // Should check instanceof Error before accessing .message
    // Pattern matches: `e instanceof Error`, `error instanceof Error`, etc.
    expect(content).toMatch(/\w+\s+instanceof\s+Error/);
  });
});

// ============================================================================
// Org Membership Verification Pattern
// ============================================================================

describe('Org Membership Verification', () => {
  it('should have verifyOrgMembership in playbooks route', async () => {
    const content = await readRouteFile('src/app/api/playbooks/execute/route.ts');

    // Check function exists
    expect(content).toContain('async function verifyOrgMembership');

    // Check it queries Firestore for membership
    expect(content).toContain('members');
    expect(content).toContain('uid');

    // Check it also checks ownership
    expect(content).toContain('ownerId');
    expect(content).toContain('ownerUid');
  });

  it('should have verifyOrgAccess in billing route', async () => {
    const content = await readRouteFile('src/app/api/billing/authorize-net/route.ts');

    // Check function exists
    expect(content).toContain('async function verifyOrgAccess');

    // Check it queries for admin-level access
    expect(content).toContain('members');
    expect(content).toContain("'admin'");
    expect(content).toContain("'brand_admin'");
  });
});
