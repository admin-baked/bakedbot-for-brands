# Unit Test Cookbook

Common patterns for fixing unit tests in BakedBot AI.

---

## Pattern 1: Mock Not Found

**Error**: `Cannot find module '@/server/services/some-service'`

**Fix**: Add mock at top of test file:
```typescript
jest.mock('@/server/services/some-service', () => ({
    someService: {
        someMethod: jest.fn()
    }
}));
```

---

## Pattern 2: Firebase Admin Not Initialized

**Error**: `The default Firebase app does not exist`

**Fix**: Mock Firebase at test file top:
```typescript
jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn(() => ({
        db: { collection: jest.fn() },
        auth: { verifySessionCookie: jest.fn() }
    }))
}));
```

---

## Pattern 3: Async Test Timeout

**Error**: `Timeout - Async callback was not invoked`

**Fix**: Increase timeout or await properly:
```typescript
it('should complete async work', async () => {
    await expect(asyncFunction()).resolves.toBe(expected);
}, 10000); // 10 second timeout
```

---

## Pattern 4: Type Mismatch in Mock

**Error**: `Type 'X' is not assignable to type 'Y'`

**Fix**: Use proper type assertion:
```typescript
const mockData = {
    id: 'test-id',
    status: 'completed' as const  // Use 'as const' for literals
};
```

---

## Pattern 5: Component Render Error

**Error**: `Unable to find element with testId`

**Fix**: Ensure component renders and await:
```typescript
import { render, screen, waitFor } from '@testing-library/react';

await waitFor(() => {
    expect(screen.getByTestId('my-element')).toBeInTheDocument();
});
```

---

## Pattern 6: Server Action Mock

**Error**: Server actions failing in test

**Fix**: Mock the server action module:
```typescript
jest.mock('@/app/dashboard/some/actions', () => ({
    someAction: jest.fn().mockResolvedValue({ success: true, data: [] })
}));
```

---

## BakedBot-Specific Patterns

### Agent Service Mocks
```typescript
jest.mock('@/server/services/research-service', () => ({
    researchService: {
        createTask: jest.fn().mockResolvedValue('task-123'),
        getTask: jest.fn().mockResolvedValue(null),
        getTasksByBrand: jest.fn().mockResolvedValue([])
    }
}));
```

### User Auth Mock
```typescript
jest.mock('@/server/auth/auth', () => ({
    requireUser: jest.fn().mockResolvedValue({
        uid: 'test-user',
        email: 'test@example.com',
        role: 'brand',
        brandId: 'test-brand-123'
    })
}));
```
