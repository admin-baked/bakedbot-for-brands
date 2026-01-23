/**
 * Unit tests for Q1 2026 Security Audit Part 2 Fixes
 *
 * Tests verify that security patterns are correctly implemented by:
 * 1. Checking source files contain required security imports and checks
 * 2. Validating security patterns in route handlers
 * 3. Verifying prompt injection protections
 * 4. Checking Firestore rules security
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
// CRITICAL: Debug Env Route Security
// ============================================================================

describe('Debug Env Route Security', () => {
  let content: string;

  beforeAll(async () => {
    content = await readRouteFile('src/app/api/debug/env/route.ts');
  });

  it('should be marked as DEV ONLY', () => {
    expect(content).toContain('DEV ONLY');
  });

  it('should have production environment gate', () => {
    expect(content).toContain("process.env.NODE_ENV === 'production'");
    expect(content).toContain('Dev route disabled in production');
    expect(content).toContain('status: 403');
  });

  it('should require Super User authentication', () => {
    expect(content).toContain("import { requireSuperUser }");
    expect(content).toContain('await requireSuperUser()');
  });

  it('should NOT expose partial API keys', () => {
    expect(content).not.toContain('FIRST_CHARS');
    expect(content).not.toContain('substring(0,');
    expect(content).not.toContain('.length');
  });

  it('should NOT expose all environment variable names', () => {
    // Should not return availableKeys in the response (but comment mentioning removal is OK)
    expect(content).not.toContain('availableKeys:');
    expect(content).not.toContain('Object.keys(process.env)');
  });

  it('should use logger instead of console', () => {
    expect(content).toContain("import { logger }");
    expect(content).not.toContain('console.log');
  });
});

// ============================================================================
// CRITICAL: Linus Agent read_file Path Validation
// ============================================================================

describe('Linus Agent read_file Security', () => {
  let content: string;

  beforeAll(async () => {
    content = await readRouteFile('src/server/agents/linus.ts');
  });

  it('should have path validation for read_file', () => {
    // Find the read_file case and verify it has validation
    const readFileMatch = content.match(/case 'read_file':\s*\{[\s\S]*?\}/);
    expect(readFileMatch).not.toBeNull();

    const readFileBlock = readFileMatch![0];
    expect(readFileBlock).toContain('validateFilePathSafety');
    expect(readFileBlock).toContain('pathCheck');
    expect(readFileBlock).toContain('blocked');
  });

  it('should have validateFilePathSafety function', () => {
    expect(content).toContain('function validateFilePathSafety');
    expect(content).toContain('blockedPaths');
  });
});

// ============================================================================
// CRITICAL: Linus Shell Injection Protection
// ============================================================================

describe('Linus Shell Injection Protection', () => {
  let content: string;

  beforeAll(async () => {
    content = await readRouteFile('src/server/agents/linus.ts');
  });

  it('should block command substitution with $(...)', () => {
    expect(content).toMatch(/\$\\\(.*\\\)/);
  });

  it('should block backtick command substitution', () => {
    expect(content).toContain('`[^`]+`');
  });

  it('should block ANSI-C quoting bypass', () => {
    expect(content).toContain("$'\\\\x");
  });

  it('should block base64 decode to shell', () => {
    expect(content).toContain('base64');
    expect(content).toContain('bash|sh');
  });

  it('should block rm flag reordering bypass', () => {
    expect(content).toContain('rm\\s+-r\\s+-f');
    expect(content).toContain('rm\\s+-fr');
  });

  it('should block python/perl/ruby/node one-liners', () => {
    expect(content).toContain('python');
    expect(content).toContain('-c');
    expect(content).toContain('perl');
    expect(content).toContain('ruby');
    expect(content).toContain('node');
    expect(content).toContain('-e');
  });
});

// ============================================================================
// CRITICAL: Prompt Injection Protection
// ============================================================================

describe('Error Report Route Prompt Injection Protection', () => {
  let content: string;

  beforeAll(async () => {
    content = await readRouteFile('src/app/api/webhooks/error-report/route.ts');
  });

  it('should import sanitizeForPrompt from centralized security module', () => {
    expect(content).toContain("import { sanitizeForPrompt, wrapUserData, buildSystemDirectives } from '@/server/security'");
  });

  it('should use wrapUserData for secure data wrapping', () => {
    expect(content).toContain('wrapUserData(');
  });

  it('should use buildSystemDirectives for system instructions', () => {
    expect(content).toContain('buildSystemDirectives(');
    expect(content).toContain('directives');
  });

  it('should use logger instead of console', () => {
    expect(content).toContain("import { logger }");
    expect(content).not.toContain('console.log');
    expect(content).not.toContain('console.error');
  });

  it('should use safe error extraction', () => {
    expect(content).toMatch(/\w+\s+instanceof\s+Error/);
  });
});

describe('Tickets Route Prompt Injection Protection', () => {
  let content: string;

  beforeAll(async () => {
    content = await readRouteFile('src/app/api/tickets/route.ts');
  });

  it('should import sanitizeForPrompt from centralized security module', () => {
    expect(content).toContain("import { sanitizeForPrompt, wrapUserData, buildSystemDirectives } from '@/server/security'");
  });

  it('should use wrapUserData for secure data wrapping', () => {
    expect(content).toContain('wrapUserData(');
    // Should wrap all user-provided fields
    expect(content).toContain("wrapUserData(String(data.title");
    expect(content).toContain("wrapUserData(String(data.description");
    expect(content).toContain("wrapUserData(String(data.errorStack");
  });

  it('should use buildSystemDirectives for system instructions', () => {
    expect(content).toContain('buildSystemDirectives(');
  });

  it('should have security comment for prompt construction', () => {
    expect(content).toContain('SECURITY');
    expect(content).toContain('Build structured prompt with sanitized user data');
  });
});

// ============================================================================
// HIGH: Demo Import Menu Authentication
// ============================================================================

describe('Demo Import Menu Authentication', () => {
  let content: string;

  beforeAll(async () => {
    content = await readRouteFile('src/app/api/demo/import-menu/route.ts');
  });

  it('should import requireUser', () => {
    expect(content).toContain("import { requireUser }");
    expect(content).toMatch(/from\s+['"]@\/server\/auth\/auth['"]/);
  });

  it('should call requireUser() before processing', () => {
    expect(content).toContain('await requireUser()');
  });

  it('should return 401 for unauthenticated requests', () => {
    expect(content).toContain('status: 401');
    expect(content).toContain('Unauthorized');
  });

  it('should have security comment about billing', () => {
    expect(content).toContain('SECURITY');
    expect(content).toContain('per-page billed');
  });
});

// ============================================================================
// HIGH: Firestore Rules - Organization Access
// ============================================================================

describe('Firestore Rules Organization Security', () => {
  let content: string;

  beforeAll(async () => {
    content = await readRouteFile('firestore.rules');
  });

  it('should NOT allow any authenticated user to read organizations', () => {
    // The old insecure pattern was:
    // allow read: if request.auth != null;
    // This should be replaced with member/owner checks
    const orgSection = content.match(/match \/organizations\/\{orgId\}[\s\S]*?(?=match \/|$)/);
    expect(orgSection).not.toBeNull();

    const orgRules = orgSection![0];

    // Should have member check
    expect(orgRules).toContain('members');
    expect(orgRules).toContain('exists');

    // Should check ownerId/ownerUid
    expect(orgRules).toContain('ownerId');
    expect(orgRules).toContain('ownerUid');

    // Should have security comment
    expect(orgRules).toContain('SECURITY');
  });

  it('should have members subcollection rules', () => {
    expect(content).toContain('match /members/{memberId}');
  });
});

// ============================================================================
// HIGH: Firestore Rules - Tenant Events Authentication
// ============================================================================

describe('Firestore Rules Tenant Events Security', () => {
  let content: string;

  beforeAll(async () => {
    content = await readRouteFile('firestore.rules');
  });

  it('should require authentication for tenant event writes', () => {
    const eventsSection = content.match(/match \/tenants\/\{tenantId\}\/events\/[\s\S]*?allow create:[\s\S]*?;/);
    expect(eventsSection).not.toBeNull();

    const eventsRules = eventsSection![0];

    // Should require authentication
    expect(eventsRules).toContain('request.auth != null');

    // Should have security comment
    expect(content).toContain('SECURITY');
    expect(content).toContain('spam');
  });
});
