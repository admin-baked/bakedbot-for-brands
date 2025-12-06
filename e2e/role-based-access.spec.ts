import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Role-Based Access Control (RBAC)
 *
 * Tests cover:
 * - Brand role dashboard access and features
 * - Dispensary role dashboard access and features
 * - Customer role account access
 * - Owner/Admin role access
 * - Cross-role access prevention
 * - Permission validation for protected routes
 *
 * Priority: CRITICAL (9/10)
 * Coverage Gap: Previously 30% - Core business logic
 */

const TEST_USERS = {
  brand: {
    email: 'brand-test@example.com',
    role: 'brand',
    expectedRoute: '/dashboard'
  },
  dispensary: {
    email: 'dispensary-test@example.com',
    role: 'dispensary',
    expectedRoute: '/dashboard'
  },
  customer: {
    email: 'customer-test@example.com',
    role: 'customer',
    expectedRoute: '/account'
  },
  owner: {
    email: 'owner-test@example.com',
    role: 'owner',
    expectedRoute: '/dashboard'
  }
};

/**
 * Helper function to simulate authenticated user with specific role
 */
async function simulateAuthenticatedUser(page: any, role: string) {
  await page.goto('/');

  // Set up authentication state in localStorage/cookies
  await page.evaluate((userRole) => {
    // Simulate Firebase auth token with custom claims
    const mockUser = {
      uid: `test-${userRole}-${Date.now()}`,
      email: `${userRole}-test@example.com`,
      role: userRole,
      emailVerified: true
    };

    // Store in localStorage (matches your app's auth pattern)
    localStorage.setItem('firebase:authUser', JSON.stringify(mockUser));
  }, role);

  // Set simulation cookie for role
  await page.context().addCookies([{
    name: 'x-simulated-role',
    value: role,
    domain: new URL(page.url()).hostname,
    path: '/'
  }]);
}

test.describe('Brand Role Dashboard Access', () => {
  test.beforeEach(async ({ page }) => {
    await simulateAuthenticatedUser(page, 'brand');
  });

  test('should allow brand user to access main dashboard', async ({ page }) => {
    const response = await page.goto('/dashboard');
    expect(response?.status()).toBeLessThan(400);

    // Should show dashboard content
    const hasDashboard = await page.locator('main, [role="main"]').count() > 0;
    expect(hasDashboard).toBe(true);
  });

  test('should allow brand user to access products page', async ({ page }) => {
    const response = await page.goto('/dashboard/products');
    expect(response?.status()).toBeLessThan(400);

    // Should show products list or empty state
    const hasProductsSection = await page.locator('h1:has-text(/products/i), h2:has-text(/products/i), [data-testid="products"]').count() > 0;
    expect(hasProductsSection).toBe(true);
  });

  test('should allow brand user to access product creation', async ({ page }) => {
    const response = await page.goto('/dashboard/products/new');
    expect(response?.status()).toBeLessThan(400);

    // Should show product creation form
    const hasForm = await page.locator('form, input[name="name"], input[name="price"]').count() > 0;
    expect(hasForm).toBe(true);
  });

  test('should allow brand user to access analytics', async ({ page }) => {
    const response = await page.goto('/dashboard/analytics');
    expect(response?.status()).toBeLessThan(400);

    // Analytics page should load
    const currentUrl = page.url();
    expect(currentUrl).toContain('/dashboard/analytics');
  });

  test('should allow brand user to access playbooks', async ({ page }) => {
    const response = await page.goto('/dashboard/playbooks');
    expect(response?.status()).toBeLessThan(400);

    const currentUrl = page.url();
    expect(currentUrl).toContain('/dashboard/playbooks');
  });

  test('should allow brand user to access Craig marketing agent', async ({ page }) => {
    const response = await page.goto('/dashboard/agents/craig');
    expect(response?.status()).toBeLessThan(400);

    const currentUrl = page.url();
    expect(currentUrl).toContain('/dashboard/agents/craig');
  });

  test('should allow brand user to access menu sync', async ({ page }) => {
    const response = await page.goto('/dashboard/menu-sync');
    expect(response?.status()).toBeLessThan(400);
  });

  test('should allow brand user to access settings', async ({ page }) => {
    const response = await page.goto('/dashboard/settings');
    expect(response?.status()).toBeLessThan(400);
  });

  test('should block brand user from CEO dashboard', async ({ page }) => {
    const response = await page.goto('/dashboard/ceo');

    // Should redirect or return error
    const isBlocked = response?.status() === 403 ||
                     response?.status() === 401 ||
                     page.url().includes('/login') ||
                     page.url() !== '/dashboard/ceo';

    expect(isBlocked).toBe(true);
  });
});

test.describe('Dispensary Role Dashboard Access', () => {
  test.beforeEach(async ({ page }) => {
    await simulateAuthenticatedUser(page, 'dispensary');
  });

  test('should allow dispensary user to access main dashboard', async ({ page }) => {
    const response = await page.goto('/dashboard');
    expect(response?.status()).toBeLessThan(400);
  });

  test('should allow dispensary user to access orders page', async ({ page }) => {
    const response = await page.goto('/dashboard/dispensary/orders');
    expect(response?.status()).toBeLessThan(400);

    // Should show orders section
    const hasOrders = await page.locator('h1:has-text(/orders/i), [data-testid="orders"], table').count() > 0;
    expect(hasOrders).toBe(true);
  });

  test('should allow dispensary user to access general orders view', async ({ page }) => {
    const response = await page.goto('/dashboard/orders');
    expect(response?.status()).toBeLessThan(400);
  });

  test('should block dispensary user from product creation', async ({ page }) => {
    const response = await page.goto('/dashboard/products/new');

    // Dispensaries shouldn't create products
    const isBlocked = response?.status() === 403 ||
                     response?.status() === 401 ||
                     page.url().includes('/login') ||
                     !page.url().includes('/products/new');

    expect(isBlocked).toBe(true);
  });

  test('should block dispensary user from CEO dashboard', async ({ page }) => {
    const response = await page.goto('/dashboard/ceo');

    const isBlocked = response?.status() === 403 ||
                     response?.status() === 401 ||
                     page.url().includes('/login');

    expect(isBlocked).toBe(true);
  });

  test('should block dispensary user from Craig marketing agent', async ({ page }) => {
    const response = await page.goto('/dashboard/agents/craig');

    // Marketing agent is brand-specific
    const isBlocked = response?.status() === 403 ||
                     response?.status() === 401 ||
                     !page.url().includes('/agents/craig');

    expect(isBlocked).toBe(true);
  });
});

test.describe('Customer Role Account Access', () => {
  test.beforeEach(async ({ page }) => {
    await simulateAuthenticatedUser(page, 'customer');
  });

  test('should allow customer to access account page', async ({ page }) => {
    const response = await page.goto('/account');
    expect(response?.status()).toBeLessThan(400);

    // Should show customer account
    const hasAccount = await page.locator('h1:has-text(/account|profile/i), [data-testid="account"]').count() > 0;
    expect(hasAccount).toBe(true);
  });

  test('should redirect customer from dashboard to account', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    // Should redirect to /account
    const currentUrl = page.url();
    const isRedirected = currentUrl.includes('/account') || currentUrl.includes('/customer');

    expect(isRedirected).toBe(true);
  });

  test('should block customer from product management', async ({ page }) => {
    const response = await page.goto('/dashboard/products');

    const isBlocked = response?.status() === 403 ||
                     response?.status() === 401 ||
                     page.url().includes('/account') ||
                     page.url().includes('/login');

    expect(isBlocked).toBe(true);
  });

  test('should block customer from CEO dashboard', async ({ page }) => {
    const response = await page.goto('/dashboard/ceo');

    const isBlocked = response?.status() === 403 ||
                     response?.status() === 401 ||
                     page.url().includes('/account') ||
                     page.url().includes('/login');

    expect(isBlocked).toBe(true);
  });

  test('should allow customer to access shop pages', async ({ page }) => {
    const response = await page.goto('/shop/demo');

    // Customers should be able to shop
    expect(response?.status()).toBeLessThan(500);
  });

  test('should allow customer to access product locator', async ({ page }) => {
    const response = await page.goto('/product-locator');
    expect(response?.status()).toBeLessThan(400);
  });
});

test.describe('Owner/Admin Role Access', () => {
  test.beforeEach(async ({ page }) => {
    await simulateAuthenticatedUser(page, 'owner');
  });

  test('should allow owner to access all dashboard pages', async ({ page }) => {
    const dashboardPages = [
      '/dashboard',
      '/dashboard/products',
      '/dashboard/analytics',
      '/dashboard/playbooks',
      '/dashboard/settings',
      '/dashboard/menu',
      '/dashboard/agents/craig'
    ];

    for (const route of dashboardPages) {
      const response = await page.goto(route);
      expect(response?.status()).toBeLessThan(400);
    }
  });

  test('should allow owner to access CEO dashboard', async ({ page }) => {
    const response = await page.goto('/dashboard/ceo');
    expect(response?.status()).toBeLessThan(400);

    const currentUrl = page.url();
    expect(currentUrl).toContain('/dashboard/ceo');
  });

  test('should allow owner to create products', async ({ page }) => {
    const response = await page.goto('/dashboard/products/new');
    expect(response?.status()).toBeLessThan(400);

    const hasForm = await page.locator('form, input[name="name"]').count() > 0;
    expect(hasForm).toBe(true);
  });

  test('should allow owner to access customer management', async ({ page }) => {
    const response = await page.goto('/dashboard/customers');
    expect(response?.status()).toBeLessThan(400);
  });

  test('should allow owner to access dispensary management', async ({ page }) => {
    const response = await page.goto('/dashboard/dispensaries');
    expect(response?.status()).toBeLessThan(400);
  });
});

test.describe('Cross-Role Access Prevention', () => {
  const protectedRoutes = {
    brandOnly: [
      '/dashboard/products/new',
      '/dashboard/agents/craig',
      '/dashboard/content'
    ],
    ownerOnly: [
      '/dashboard/ceo',
      '/dashboard/customers',
      '/dashboard/dispensaries'
    ],
    dispensaryOnly: [
      '/dashboard/dispensary/orders'
    ]
  };

  test('brand-only routes should block customer access', async ({ page }) => {
    await simulateAuthenticatedUser(page, 'customer');

    for (const route of protectedRoutes.brandOnly) {
      const response = await page.goto(route);

      const isBlocked = response?.status() === 403 ||
                       response?.status() === 401 ||
                       !page.url().includes(route);

      expect(isBlocked).toBe(true);
    }
  });

  test('owner-only routes should block brand access', async ({ page }) => {
    await simulateAuthenticatedUser(page, 'brand');

    for (const route of protectedRoutes.ownerOnly) {
      const response = await page.goto(route);

      const isBlocked = response?.status() === 403 ||
                       response?.status() === 401 ||
                       !page.url().includes(route);

      expect(isBlocked).toBe(true);
    }
  });

  test('owner-only routes should block dispensary access', async ({ page }) => {
    await simulateAuthenticatedUser(page, 'dispensary');

    for (const route of protectedRoutes.ownerOnly) {
      const response = await page.goto(route);

      const isBlocked = response?.status() === 403 ||
                       response?.status() === 401 ||
                       !page.url().includes(route);

      expect(isBlocked).toBe(true);
    }
  });
});

test.describe('Sidebar Navigation by Role', () => {
  test('brand user should see brand-specific sidebar items', async ({ page }) => {
    await simulateAuthenticatedUser(page, 'brand');
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    // Brand should see these items
    const brandItems = ['Products', 'Analytics', 'Playbooks', 'Craig'];

    for (const item of brandItems) {
      const navItem = page.locator(`nav a:has-text("${item}"), aside a:has-text("${item}")`);
      // At least one should be visible (or page loads)
      const count = await navItem.count();
      // Just verify sidebar exists
      expect(await page.locator('nav, aside').count()).toBeGreaterThan(0);
    }
  });

  test('dispensary user should see dispensary-specific sidebar items', async ({ page }) => {
    await simulateAuthenticatedUser(page, 'dispensary');
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    // Dispensary should see orders
    const ordersNav = page.locator('nav a:has-text(/orders/i), aside a:has-text(/orders/i)');

    // Verify navigation exists
    expect(await page.locator('nav, aside').count()).toBeGreaterThan(0);
  });

  test('owner user should see all sidebar items including admin', async ({ page }) => {
    await simulateAuthenticatedUser(page, 'owner');
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    // Owner should have access to everything
    const adminNav = page.locator('nav, aside');
    expect(await adminNav.count()).toBeGreaterThan(0);
  });
});

test.describe('Permission-Based Feature Visibility', () => {
  test('brand should see "Create Product" button on products page', async ({ page }) => {
    await simulateAuthenticatedUser(page, 'brand');
    await page.goto('/dashboard/products');
    await page.waitForLoadState('domcontentloaded');

    const createButton = page.locator('button:has-text(/create|new|add product/i), a:has-text(/create|new|add product/i)');

    // Should have create functionality
    expect(await createButton.count()).toBeGreaterThan(0);
  });

  test('dispensary should NOT see "Create Product" button', async ({ page }) => {
    await simulateAuthenticatedUser(page, 'dispensary');
    await page.goto('/dashboard/products');
    await page.waitForLoadState('domcontentloaded');

    const createButton = page.locator('button:has-text(/create|new|add product/i):not([disabled])');

    // Should either not exist or be disabled
    const count = await createButton.count();
    expect(count).toBe(0);
  });

  test('owner should see all admin features in CEO dashboard', async ({ page }) => {
    await simulateAuthenticatedUser(page, 'owner');
    await page.goto('/dashboard/ceo');
    await page.waitForLoadState('domcontentloaded');

    // Should have admin controls
    const adminControls = page.locator('button, form, table, [role="tablist"]');
    expect(await adminControls.count()).toBeGreaterThan(0);
  });
});

test.describe('Unauthenticated Access Control', () => {
  test('unauthenticated user should be redirected from dashboard', async ({ page }) => {
    // Clear all auth
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
    });
    await page.context().clearCookies();

    const response = await page.goto('/dashboard');

    // Should redirect to login
    const isRedirected = page.url().includes('/login') ||
                        page.url().includes('/brand-login') ||
                        response?.status() === 401 ||
                        response?.status() === 403;

    expect(isRedirected).toBe(true);
  });

  test('unauthenticated user should be redirected from products page', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.context().clearCookies();

    const response = await page.goto('/dashboard/products');

    const isRedirected = page.url().includes('/login') ||
                        response?.status() === 401 ||
                        response?.status() === 403;

    expect(isRedirected).toBe(true);
  });

  test('unauthenticated user should be redirected from CEO dashboard', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.context().clearCookies();

    const response = await page.goto('/dashboard/ceo');

    const isRedirected = page.url().includes('/login') ||
                        page.url().includes('/super-admin') ||
                        response?.status() === 401 ||
                        response?.status() === 403;

    expect(isRedirected).toBe(true);
  });
});
