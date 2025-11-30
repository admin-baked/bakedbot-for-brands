# Firestore Security Rules Tests

Comprehensive test suite for Firestore security rules using Firebase Local Emulator Suite.

## Overview

This test suite validates that Firestore security rules correctly enforce role-based access control (RBAC) across all collections. Tests cover:

- ✅ **4 User Roles:** Owner, Brand Manager, Dispensary Manager, Customer
- ✅ **9 Collections:** brands, customers, orders, products, dispensaries, categories, coupons, retailers, analytics_events
- ✅ **4 Access Types:** Create, Read, Update, Delete
- ✅ **90%+ Rule Coverage Target**

## Test Files

| File | Description | Test Count |
|------|-------------|-----------|
| `setup.ts` | Test environment configuration | N/A |
| `brands.spec.ts` | Brands collection RBAC tests | 16 tests |
| `customers.spec.ts` | Customers collection privacy tests | 12 tests |
| `orders.spec.ts` | Orders multi-role access tests | 15 tests |
| `products.spec.ts` | Products + public collections tests | 18 tests |

**Total: 61 tests**

## Prerequisites

### 1. Install Firebase Tools (if not already installed)

```bash
npm install -g firebase-tools
```

### 2. Install Dependencies

```bash
npm install --save-dev @firebase/rules-unit-testing
```

Dependencies already installed:
- `@jest/globals` - Test framework
- `firebase` - Firebase SDK
- `firebase-admin` - Admin SDK

## Running Tests

### Start Firebase Emulator

**Terminal 1:**
```bash
firebase emulators:start --only firestore
```

This starts the Firestore emulator on `localhost:8080`.

### Run Tests

**Terminal 2:**
```bash
# Run all Firestore rules tests
npm run test:firestore

# Or use Jest directly
jest tests/firestore-rules

# Run specific test file
jest tests/firestore-rules/brands.spec.ts

# Run with coverage
jest tests/firestore-rules --coverage

# Watch mode
jest tests/firestore-rules --watch
```

## Test Structure

### Role-Based Test Contexts

Each test uses one of these authentication contexts:

```typescript
// Unauthenticated user (guest)
getUnauthenticatedFirestore()

// Customer (role: 'customer')
getCustomerFirestore(uid)

// Brand Manager (role: 'brand', brandId: '...')
getBrandFirestore(uid, brandId)

// Dispensary Manager (role: 'dispensary', locationId: '...')
getDispensaryFirestore(uid, locationId)

// Owner/Admin (role: 'owner')
getOwnerFirestore(uid)
```

### Test Pattern

```typescript
it('should allow/deny [role] from [action] [resource]', async () => {
  const db = get[Role]Firestore(...);
  const ref = doc(db, 'collection', 'doc-id');

  await assertSucceeds(getDoc(ref)); // or assertFails
});
```

## Test Coverage

### Brands Collection

- ✅ Public read access (anyone can view brand profiles)
- ✅ Brand managers can update their own brand
- ✅ Brand managers cannot update other brands
- ✅ Only owner can create/delete brands
- ✅ Customers cannot modify brands

### Customers Collection

- ✅ Customers can only read their own profile
- ✅ Customers can create their own profile
- ✅ Customers cannot access other customer profiles
- ✅ Owner can access all customer profiles
- ✅ Brand/dispensary managers cannot access customer data

### Orders Collection

- ✅ Customers can read/update their own orders
- ✅ Dispensary managers can access orders for their location
- ✅ Brand managers can access orders containing their products
- ✅ Owner can access all orders
- ✅ Users cannot access orders they're not associated with

### Products Collection

- ✅ Public read access (anyone can browse products)
- ✅ Brand managers can create/update/delete their own products
- ✅ Brand managers cannot modify other brands' products
- ✅ Customers cannot modify products

### Public Collections (dispensaries, categories, coupons, retailers)

- ✅ Public read access
- ✅ All writes denied (server-side only)

## Coverage Report

Run tests with coverage to see detailed rule coverage:

```bash
jest tests/firestore-rules --coverage
```

**Target Coverage:** 90%+

## Troubleshooting

### Emulator Not Running

**Error:** `Error: connect ECONNREFUSED 127.0.0.1:8080`

**Solution:** Start Firebase emulator first:
```bash
firebase emulators:start --only firestore
```

### Port Already in Use

**Error:** `Port 8080 is not available`

**Solution 1:** Kill process using port 8080:
```bash
# Windows
netstat -ano | findstr :8080
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:8080 | xargs kill
```

**Solution 2:** Use different port in `setup.ts`:
```typescript
firestore: {
  host: 'localhost',
  port: 9090, // Changed from 8080
}
```

### Tests Failing Unexpectedly

**Possible Causes:**
1. Firestore rules file not in sync with tests
2. Custom claims structure changed
3. Collection schema changed

**Solution:** Review `firestore.rules` and ensure it matches test expectations.

### Clear Emulator Data Between Test Runs

The test suite automatically calls `clearFirestore()` between tests. If you need to manually clear:

```bash
# Stop emulator and restart (clears all data)
# Ctrl+C in emulator terminal
firebase emulators:start --only firestore
```

## Writing New Tests

### Add New Collection Tests

1. Create new file: `tests/firestore-rules/[collection-name].spec.ts`
2. Import setup utilities
3. Follow existing test pattern
4. Test all CRUD operations for all roles
5. Update this README with test count

### Example New Test

```typescript
import { describe, it, beforeAll, afterAll, beforeEach } from '@jest/globals';
import {
  setupTestEnv,
  teardownTestEnv,
  clearFirestore,
  getCustomerFirestore,
  assertSucceeds,
  assertFails,
} from './setup';
import { doc, getDoc } from 'firebase/firestore';

describe('Firestore Rules: new_collection', () => {
  beforeAll(async () => await setupTestEnv());
  afterAll(async () => await teardownTestEnv());
  beforeEach(async () => await clearFirestore());

  it('should test something', async () => {
    const db = getCustomerFirestore('customer-001');
    const ref = doc(db, 'new_collection', 'doc-001');
    await assertSucceeds(getDoc(ref));
  });
});
```

## CI/CD Integration

### GitHub Actions

Add to `.github/workflows/test.yml`:

```yaml
- name: Install Firebase Tools
  run: npm install -g firebase-tools

- name: Start Firebase Emulators
  run: firebase emulators:start --only firestore &

- name: Wait for Emulators
  run: sleep 10

- name: Run Firestore Rules Tests
  run: npm run test:firestore
```

## Security Rules Reference

**Rules File:** `firestore.rules`

**Custom Claims Used:**
- `request.auth.token.role` - User role (owner/brand/dispensary/customer)
- `request.auth.token.brandId` - Brand ID for brand managers
- `request.auth.token.locationId` - Location ID for dispensary managers

**Helper Functions:**
- `isOwner(userId)` - Check if user owns resource
- `isRole(role)` - Check if user has specific role
- `isBrandManager(brandId)` - Check if user manages brand
- `isDispensaryManager(locationId)` - Check if user manages location

## Next Steps

1. **Run tests locally** and ensure 100% pass rate
2. **Review coverage report** and add tests for uncovered rules
3. **Add to CI/CD pipeline** for automated testing
4. **Update rules** if tests reveal security gaps
5. **Deploy rules** to production after all tests pass

---

**Generated:** November 30, 2025
**Sprint:** Sprint 4 (Testing & Security Validation)
**Ticket:** P0-TEST-FIRESTORE-RULES
**Developer:** Dev 1 (Lead Developer)
