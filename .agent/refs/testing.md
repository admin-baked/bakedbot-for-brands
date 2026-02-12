# Testing Reference

## Quick Commands

```powershell
# Type check (always run first)
npm run check:types

# All tests
npm test

# Specific file
npm test -- tests/path/to/file.test.ts

# Pattern match (multiple areas)
npm test -- --testPathPattern="agents|actions"

# Watch mode (during development)
npm run test:watch
```

---

## Test Structure

```
tests/
├── ai/                   # AI service tests (claude.test.ts)
├── components/           # React component tests
├── server/
│   ├── actions/          # Server action tests
│   ├── agents/           # Agent tests
│   └── services/         # Service tests
├── firestore-rules/      # Security rules tests
└── lib/                  # Utility tests
```

---

## When to Test

| Situation | Action |
|-----------|--------|
| After any code change | `npm run check:types` |
| After logic changes | Run relevant unit tests |
| Before committing | Full test suite: `npm test` |
| New feature | Write tests first |
| Bug fix | Add regression test |

---

## Common Test Commands

| Area | Command |
|------|---------|
| All tests | `npm test` |
| Type check only | `npm run check:types` |
| Agents | `npm test -- --testPathPattern="agents"` |
| Server actions | `npm test -- --testPathPattern="actions"` |
| Services | `npm test -- --testPathPattern="services"` |
| Components | `npm test -- --testPathPattern="components"` |

---

## Test Patterns

### Server Action Test
```typescript
import { myAction } from '@/server/actions/my-action';

// Mock Firebase
jest.mock('@/lib/firebase/server-client', () => ({
  getFirestore: jest.fn(() => mockDb)
}));

describe('myAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns success for valid input', async () => {
    const result = await myAction({ input: 'value' });
    expect(result.success).toBe(true);
  });

  it('throws for unauthorized user', async () => {
    // Mock session as null
    await expect(myAction({ input: 'value' }))
      .rejects.toThrow('Unauthorized');
  });
});
```

### Component Test
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { MyComponent } from '@/components/my-component';

describe('MyComponent', () => {
  it('renders initial state', () => {
    render(<MyComponent />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  it('handles click event', () => {
    const onClick = jest.fn();
    render(<MyComponent onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalled();
  });
});
```

### Agent Test
```typescript
import { LinusAgent } from '@/server/agents/linus';

describe('LinusAgent', () => {
  it('initializes with correct tools', () => {
    const agent = new LinusAgent();
    expect(agent.tools).toContain('search_codebase');
    expect(agent.tools).toContain('run_tests');
  });
});
```

---

## Coverage

```powershell
npm run test:coverage
```

### Targets
| Type | Target |
|------|--------|
| Unit tests | 80%+ for business logic |
| Integration | Critical paths covered |
| E2E | Happy paths |

---

## E2E Tests (Playwright)

```powershell
npm run test:e2e
```

### Example
```typescript
import { test, expect } from '@playwright/test';

test('user can navigate to dashboard', async ({ page }) => {
  await page.goto('/');
  await page.click('text=Login');
  await page.fill('[name="email"]', 'test@example.com');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/dashboard');
});
```

---

## Debugging Failed Tests

1. **Read the error message** — Usually tells you exactly what's wrong
2. **Run in isolation** — `npm test -- path/to/file.test.ts`
3. **Check mocks** — Are Firebase/external services mocked correctly?
4. **Check async** — Missing `await`? Race condition?
5. **Add `console.log`** — Then remove before committing

---

## Test-Driven Workflow

For new features:
1. Write failing test that describes expected behavior
2. Implement code to pass the test
3. Refactor while keeping tests green
4. Add edge case tests

For bug fixes:
1. Write failing test that reproduces the bug
2. Fix the bug
3. Verify test passes
4. Test stays in suite as regression prevention

---

---

## Hybrid Testing (KushoAI + Playwright + Extension)

BakedBot uses a multi-layer testing approach:

### 1. Unit Tests (Jest)
Standard unit and integration tests.
```powershell
npm test -- path/to/file.test.ts
```

### 2. API Tests (KushoAI)
Auto-generated API tests from OpenAPI specs.
```powershell
# Generate tests
kusho generate --spec openapi.json

# Run test suite
kusho run --suite <suite-id>

# Record UI interactions
kusho record --url http://localhost:3000
```

**Linus Tools:**
- `kusho_generate_tests` — Auto-generate from spec
- `kusho_run_suite` — Run suites by ID or tag
- `kusho_analyze_coverage` — Check test gaps

### 3. E2E Tests (Playwright)
Headless browser testing for user flows.
```powershell
# Run all E2E tests
npm run test:e2e

# Specific test
npx playwright test tests/e2e/login.spec.ts

# With visible browser
npx playwright test --headed
```

**Linus Tools:**
- `run_e2e_test` — Run Playwright tests
- `generate_playwright_test` — Generate test from scenario

### 4. Live Site Testing (Chrome Extension)
Test production via BakedBot Chrome Extension.

**Linus Tools:**
- `extension_create_session` — Start browser session
- `extension_navigate` — Navigate to URL
- `extension_click` / `extension_type` — Interact with page
- `extension_screenshot` — Capture screenshots
- `extension_get_console` — Check for JS errors
- `extension_run_workflow` — Run recorded workflows

**Example Flow (Linus):**
```
1. extension_create_session({ startUrl: 'https://bakedbot.ai' })
2. extension_navigate({ sessionId, url: '/login' })
3. extension_type({ sessionId, selector: '#email', value: 'test@example.com' })
4. extension_click({ sessionId, selector: 'button[type="submit"]' })
5. extension_screenshot({ sessionId, name: 'after-login' })
6. extension_get_console({ sessionId, level: 'error' })
7. extension_end_session({ sessionId })
```

---

## Triggering Linus for Test Fixes

When tests fail, dispatch to Linus via API:
```typescript
POST /api/linus/fix
{
  type: 'test_failure',
  testFile: 'tests/e2e/login.spec.ts',
  testOutput: '<test output here>',
  autoFix: true
}
```

For browser testing:
```typescript
POST /api/linus/fix
{
  type: 'browser_test',
  testUrl: 'https://bakedbot.ai',
  testScenario: 'User can log in and see dashboard',
  useExtension: true
}
```

---

## Security Tests

Security tests from Q1 2026 audit remediations. Run these before any security-related changes.

```powershell
# All security tests (293+ tests)
npm test -- tests/server/security --silent

# Individual test files
npm test -- tests/server/security/security-audit-fixes.test.ts     # Core audit fixes
npm test -- tests/server/security/q1-2026-audit-part2.test.ts      # Part 2 fixes
npm test -- tests/server/security/q1-2026-followup.test.ts         # Followup fixes
npm test -- tests/server/security/prompt-guard.test.ts             # Prompt injection (141 tests)
```

### Security Test Coverage

| Area | File | Tests |
|------|------|-------|
| Super Admin Whitelist | `security-audit-fixes.test.ts` | Email validation, case sensitivity |
| Linus Command Safety | `security-audit-fixes.test.ts` | Blocked commands, high-risk commands, blocked paths |
| TTS API Protection | `security-audit-fixes.test.ts` | withAuth middleware, request validation |
| withProtection Middleware | `security-audit-fixes.test.ts` | CSRF, AppCheck, requireAuth, requireSuperUser |
| Debug/Env Route | `q1-2026-audit-part2.test.ts` | Production gate, auth, no key exposure |
| Linus read_file | `q1-2026-audit-part2.test.ts` | Path validation, blocked paths |
| Shell Injection | `q1-2026-audit-part2.test.ts` | Command substitution, base64 bypass |
| Prompt Injection | `q1-2026-audit-part2.test.ts` | sanitizeForPrompt, user data wrapping |
| Firestore Rules | `q1-2026-audit-part2.test.ts` | Organization access, tenant events |
| **PromptGuard Module** | `prompt-guard.test.ts` | 141 tests for defense-in-depth |

### Prompt Injection Protection Tests

The `prompt-guard.test.ts` file covers:

| Category | What's Tested |
|----------|---------------|
| Critical Patterns | Direct override, role hijacking, system prompt extraction, jailbreak modes |
| High-Risk Patterns | Instruction markers, code blocks, template injection, prompt manipulation |
| Medium-Risk Patterns | Indirect manipulation, boundary testing, context manipulation |
| Sensitive Keywords | Password/credential mentions, exploit terms |
| Typoglycemia Attacks | Scrambled injection words (fuzzy matching) |
| Encoding Detection | Base64, hex, unicode, HTML entities |
| Output Validation | System prompt leakage, credential exposure, instruction echo |
| Structured Prompts | SYSTEM_INSTRUCTIONS/USER_DATA separation |
| Risk Scoring | Score thresholds, blocking behavior |

```powershell
# Run prompt injection tests
npm test -- tests/server/security/prompt-guard.test.ts --silent
```

---

## Training Enrollment Tests

### Auto-Enrollment System

The training auto-enrollment system has comprehensive unit tests covering enrollment flow, cohort management, and auth error handling.

**Test Files:**
| File | Purpose | Tests |
|------|---------|-------|
| `tests/server/actions/training-enrollment.test.ts` | Enrollment server action tests | 10 |
| `tests/app/dashboard/training-auth.test.tsx` | Auth redirect behavior tests | 7 |

**Training Enrollment Tests:**
```powershell
# Run all training tests
npm test -- --testPathPattern="training"

# Enrollment action tests only
npm test -- tests/server/actions/training-enrollment.test.ts

# Auth redirect tests only
npm test -- tests/app/dashboard/training-auth.test.tsx
```

**Coverage:**

1. **Auto-Enrollment Flow (`training-enrollment.test.ts`):**
   - ✅ Should enroll a new user and set intern role
   - ✅ Should create a new cohort if none exist
   - ✅ Should create a new cohort if all existing cohorts are full
   - ✅ Should handle user not found error
   - ✅ Should handle Firestore errors gracefully
   - ✅ Should log all enrollment steps
   - ✅ Should initialize progress with correct defaults
   - ✅ Should allow super users to enroll others (admin)
   - ✅ Should reject enrollment when cohort is full
   - ✅ Should reject enrollment when cohort not found

2. **Auth Error Handling (`training-auth.test.tsx`):**
   - ✅ Should redirect to /customer-login when user is not authenticated
   - ✅ Should redirect to /customer-login when user lacks required role
   - ✅ Should render normally when user has intern role
   - ✅ Should render normally when user has super_user role
   - ✅ Should show enrollment message when user has no progress
   - ✅ Should redirect to /dashboard when admin user is not super_user
   - ✅ Should handle auth errors without breaking the app

**Key Mocking Patterns:**

```typescript
// Mock Firebase Admin Auth
const mockSetCustomUserClaims = jest.fn().mockResolvedValue(undefined);
const mockGetUser = jest.fn().mockResolvedValue({
    uid: 'test-user-123',
    email: 'student@example.com',
    emailVerified: true,
});

jest.mock('firebase-admin/auth', () => ({
    getAuth: jest.fn(() => ({
        setCustomUserClaims: mockSetCustomUserClaims,
        getUser: mockGetUser,
    })),
}));

// Mock Firestore with per-test overrides
const { getAdminFirestore } = require('@/firebase/admin');
(getAdminFirestore as jest.Mock).mockImplementationOnce(() => ({
    collection: jest.fn(() => ({
        where: jest.fn(() => ({
            orderBy: jest.fn(() => ({
                limit: jest.fn(() => ({
                    get: jest.fn().mockResolvedValue({ docs: [] })
                }))
            }))
        }))
    }))
}));

// Mock Next.js redirect
jest.mock('next/navigation', () => ({
    redirect: jest.fn(),
}));
```

**Related Files:**
- `src/server/actions/training.ts` — `selfEnrollInTraining()` server action
- `src/app/training/page.tsx` — Auto-enrollment integration in signup flow
- `src/app/dashboard/training/page.tsx` — Training dashboard with auth error handling
- `src/app/dashboard/training/admin/page.tsx` — Training admin with super_user check

---

## Related Files
- `jest.config.js` — Jest configuration
- `playwright.config.ts` — Playwright configuration
- `dev/test_matrix.json` — Test categories by area
- `src/server/agents/linus.ts` — Linus test tools
- `chrome-extension/` — BakedBot Chrome Extension
- `tests/server/security/` — Security audit tests
- `src/server/actions/__tests__/admin-claims.test.ts` — Admin claims auth tests
- `src/lib/__tests__/super-admin-config.test.ts` — Super admin config tests
