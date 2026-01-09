# Testing Reference

## Overview
BakedBot uses Jest for unit tests and Playwright for E2E tests.

---

## Test Structure

```
tests/
├── ai/                   # AI service tests
│   └── claude.test.ts
├── components/           # Component tests
│   ├── chat/
│   │   ├── thinking-window.test.tsx
│   │   └── viewport-aware-rendering.test.ts
│   └── typewriter-text.test.ts
├── server/
│   ├── actions/          # Server action tests
│   ├── agents/           # Agent tests
│   ├── services/         # Service tests
│   └── ezal/             # Competitive intel tests
├── firestore-rules/      # Security rules tests
└── lib/                  # Utility tests
```

---

## Running Tests

### All Tests
```bash
npm test
```

### Specific File
```bash
npm test -- tests/server/actions/claim-flow.test.ts
```

### Pattern Match
```bash
npm test -- --testPathPattern="dispensary|orders|customers"
```

### Watch Mode
```bash
npm run test:watch
```

### Coverage
```bash
npm run test:coverage
```

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
  it('should do the thing', async () => {
    const result = await myAction({ input: 'value' });
    expect(result.success).toBe(true);
  });
});
```

### Component Test
```typescript
import { render, screen } from '@testing-library/react';
import { MyComponent } from '@/components/my-component';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
});
```

---

## Test Matrix

See `dev/test_matrix.json` for categorized test commands:

| Area | Command |
|------|---------|
| Dispensary | `npm test -- --testPathPattern="dispensary"` |
| Orders | `npm test -- --testPathPattern="orders"` |
| Agents | `npm test -- --testPathPattern="agents"` |
| Actions | `npm test -- --testPathPattern="actions"` |

---

## E2E Tests (Playwright)

```bash
npm run test:e2e
```

### Writing E2E Tests
```typescript
import { test, expect } from '@playwright/test';

test('user can login', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[name="email"]', 'test@example.com');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/dashboard');
});
```

---

## Type Checking

```bash
npm run check:types
```

This runs `tsc --noEmit` and is safe to run in production.

---

## Related Files
- `jest.config.js` — Jest configuration
- `playwright.config.ts` — Playwright configuration
- `dev/test_matrix.json` — Test categories
