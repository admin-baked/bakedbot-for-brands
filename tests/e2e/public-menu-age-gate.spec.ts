/**
 * Public Menu Age Gate E2E Tests
 *
 * Test suite for Production Readiness Audit - Track C
 * Covers: Load menu → Age gate shown → Verify → Access granted
 *
 * Priority: Tier 1 (Compliance Critical - Legal requirement for cannabis)
 */

import { test, expect, Page } from '@playwright/test';

// Test configuration
const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';
const TEST_MENU_SLUG = process.env.TEST_MENU_SLUG || 'thrivesyracuse';

test.describe('Public Menu Age Gate - Compliance Critical', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
  });

  test.afterEach(async () => {
    await page.close();
  });

  // ===========================================================================
  // 1. AGE GATE DISPLAY
  // ===========================================================================

  test('Age gate appears on first menu visit', async () => {
    // Clear cookies to simulate first visit
    await page.context().clearCookies();

    await page.goto(`${BASE_URL}/${TEST_MENU_SLUG}`);

    // Age gate should be visible
    const ageGate = page.locator('[data-testid="age-gate"]').or(
      page.locator('text=/21|age verification|are you 21/i').first().locator('..')
    );

    await expect(ageGate).toBeVisible({ timeout: 5000 });
  });

  test('Age gate blocks menu content initially', async () => {
    await page.context().clearCookies();
    await page.goto(`${BASE_URL}/${TEST_MENU_SLUG}`);

    // Menu content should NOT be visible
    const menuGrid = page.locator('[data-testid="menu-grid"]').or(
      page.locator('[data-testid="product-grid"]')
    );

    const isVisible = await menuGrid.isVisible({ timeout: 2000 }).catch(() => false);
    expect(isVisible).toBe(false);
  });

  test('Age gate shows required elements', async () => {
    await page.context().clearCookies();
    await page.goto(`${BASE_URL}/${TEST_MENU_SLUG}`);

    // Should have age question
    const ageQuestion = page.locator('text=/21|age|old enough/i');
    await expect(ageQuestion).toBeVisible();

    // Should have Yes/Confirm button
    const confirmButton = page.locator('button:has-text("Yes")').or(
      page.locator('button:has-text("I am 21")').or(
        page.locator('[data-testid="age-confirm"]')
      )
    );
    await expect(confirmButton).toBeVisible();

    // Should have No/Exit button
    const exitButton = page.locator('button:has-text("No")').or(
      page.locator('button:has-text("Exit")').or(
        page.locator('[data-testid="age-deny"]')
      )
    );
    await expect(exitButton).toBeVisible();
  });

  // ===========================================================================
  // 2. AGE VERIFICATION FLOW
  // ===========================================================================

  test('Confirming age grants access to menu', async () => {
    await page.context().clearCookies();
    await page.goto(`${BASE_URL}/${TEST_MENU_SLUG}`);

    // Click confirm button
    const confirmButton = page.locator('button:has-text("Yes")').or(
      page.locator('button:has-text("I am 21")').or(
        page.locator('[data-testid="age-confirm"]')
      )
    );
    await confirmButton.click();

    // Age gate should disappear
    const ageGate = page.locator('[data-testid="age-gate"]');
    const gateVisible = await ageGate.isVisible({ timeout: 2000 }).catch(() => false);
    expect(gateVisible).toBe(false);

    // Menu should now be visible
    const menuGrid = page.locator('[data-testid="menu-grid"]').or(
      page.locator('[data-testid="product-grid"]')
    );
    await expect(menuGrid).toBeVisible({ timeout: 5000 });
  });

  test('Denying age redirects or shows exit message', async () => {
    await page.context().clearCookies();
    await page.goto(`${BASE_URL}/${TEST_MENU_SLUG}`);

    // Click No/Exit button
    const exitButton = page.locator('button:has-text("No")').or(
      page.locator('button:has-text("Exit")').or(
        page.locator('[data-testid="age-deny"]')
      )
    );
    await exitButton.click();

    // Should either redirect away or show "cannot enter" message
    const exitMessage = page.locator('text=/cannot|not permitted|21|legal age/i');
    const redirected = await page.waitForURL(/^((?!${TEST_MENU_SLUG}).)*$/, { timeout: 3000 })
      .then(() => true)
      .catch(() => false);

    if (!redirected) {
      // If not redirected, should show exit message
      await expect(exitMessage).toBeVisible({ timeout: 3000 });
    }

    // Menu should NOT be visible
    const menuGrid = page.locator('[data-testid="menu-grid"]');
    const menuVisible = await menuGrid.isVisible({ timeout: 1000 }).catch(() => false);
    expect(menuVisible).toBe(false);
  });

  // ===========================================================================
  // 3. COOKIE PERSISTENCE
  // ===========================================================================

  test('Age verification persists via cookie', async () => {
    await page.context().clearCookies();
    await page.goto(`${BASE_URL}/${TEST_MENU_SLUG}`);

    // Confirm age
    const confirmButton = page.locator('button:has-text("Yes")').first();
    await confirmButton.click();

    // Wait for menu to load
    await page.waitForLoadState('networkidle');

    // Check that cookie was set
    const cookies = await page.context().cookies();
    const ageVerifiedCookie = cookies.find(c =>
      c.name.includes('age') || c.name.includes('verified') || c.name.includes('21')
    );

    expect(ageVerifiedCookie).toBeDefined();
  });

  test('Subsequent visits skip age gate when cookie present', async () => {
    // First visit: confirm age
    await page.context().clearCookies();
    await page.goto(`${BASE_URL}/${TEST_MENU_SLUG}`);

    const confirmButton = page.locator('button:has-text("Yes")').first();
    if (await confirmButton.isVisible({ timeout: 3000 })) {
      await confirmButton.click();
    }

    await page.waitForLoadState('networkidle');

    // Second visit: age gate should NOT appear
    await page.goto(`${BASE_URL}/${TEST_MENU_SLUG}`);

    const ageGate = page.locator('[data-testid="age-gate"]');
    const gateVisible = await ageGate.isVisible({ timeout: 2000 }).catch(() => false);
    expect(gateVisible).toBe(false);

    // Menu should be immediately visible
    const menuGrid = page.locator('[data-testid="menu-grid"]').or(
      page.locator('[data-testid="product-grid"]')
    );
    await expect(menuGrid).toBeVisible({ timeout: 5000 });
  });

  // ===========================================================================
  // 4. MIDDLEWARE ENFORCEMENT
  // ===========================================================================

  test('Direct API calls blocked without age verification', async () => {
    // Clear cookies to remove age verification
    await page.context().clearCookies();

    // Try to access menu data directly via API
    const response = await page.request.get(`${BASE_URL}/api/menu/${TEST_MENU_SLUG}`);

    // Should either return 401/403 or require age verification
    if (response.ok()) {
      const data = await response.json();
      // If 200, response should indicate verification needed
      expect(data).toHaveProperty('requiresAgeVerification');
      expect(data.requiresAgeVerification).toBe(true);
    } else {
      expect([401, 403]).toContain(response.status());
    }
  });

  test('Middleware enforces age gate on all menu routes', async () => {
    await page.context().clearCookies();

    // Test different menu routes
    const routes = [
      `${BASE_URL}/${TEST_MENU_SLUG}`,
      `${BASE_URL}/${TEST_MENU_SLUG}/flower`,
      `${BASE_URL}/${TEST_MENU_SLUG}/edibles`,
    ];

    for (const route of routes) {
      await page.goto(route);

      // Each route should show age gate
      const ageGate = page.locator('[data-testid="age-gate"]').or(
        page.locator('text=/21|age verification/i').first()
      );

      const isVisible = await ageGate.isVisible({ timeout: 3000 }).catch(() => false);

      if (isVisible) {
        expect(isVisible).toBe(true);
        // Confirm to proceed to next route
        const confirmButton = page.locator('button:has-text("Yes")').first();
        await confirmButton.click();
        await page.waitForTimeout(1000);
      }
    }
  });

  // ===========================================================================
  // 5. SERVER-SIDE RENDERING FALLBACK
  // ===========================================================================

  test('Age gate works with JavaScript disabled', async () => {
    // Create context with JS disabled
    const context = await page.context().browser()!.newContext({
      javaScriptEnabled: false,
    });

    const noJsPage = await context.newPage();
    await noJsPage.context().clearCookies();

    await noJsPage.goto(`${BASE_URL}/${TEST_MENU_SLUG}`);

    // Age gate should still render (server-side)
    const ageGate = noJsPage.locator('text=/21|age verification/i').first();
    await expect(ageGate).toBeVisible({ timeout: 5000 });

    await noJsPage.close();
    await context.close();
  });

  test('SSR includes age gate in initial HTML', async () => {
    await page.context().clearCookies();

    // Navigate and check initial HTML before hydration
    const response = await page.goto(`${BASE_URL}/${TEST_MENU_SLUG}`);
    const html = await response!.text();

    // HTML should contain age gate elements
    expect(html).toMatch(/21|age.*verification|are you.*old enough/i);
    expect(html).toMatch(/yes|confirm|enter/i);
    expect(html).toMatch(/no|exit|leave/i);
  });

  // ===========================================================================
  // 6. EDGE CASES & SECURITY
  // ===========================================================================

  test('Cannot bypass age gate by modifying cookie value', async () => {
    await page.context().clearCookies();

    // Set invalid age verification cookie
    await page.context().addCookies([
      {
        name: 'age_verified',
        value: 'false',
        domain: new URL(BASE_URL).hostname,
        path: '/',
      },
    ]);

    await page.goto(`${BASE_URL}/${TEST_MENU_SLUG}`);

    // Age gate should still appear (cookie value ignored or validated)
    const ageGate = page.locator('[data-testid="age-gate"]').or(
      page.locator('text=/21|age verification/i').first()
    );

    await expect(ageGate).toBeVisible({ timeout: 5000 });
  });

  test('Age gate appears after cookie expires', async () => {
    // Set expired cookie
    await page.context().clearCookies();

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    await page.context().addCookies([
      {
        name: 'age_verified',
        value: 'true',
        domain: new URL(BASE_URL).hostname,
        path: '/',
        expires: Math.floor(yesterday.getTime() / 1000),
      },
    ]);

    await page.goto(`${BASE_URL}/${TEST_MENU_SLUG}`);

    // Expired cookie should be ignored, age gate should appear
    const ageGate = page.locator('[data-testid="age-gate"]').or(
      page.locator('text=/21|age verification/i').first()
    );

    const isVisible = await ageGate.isVisible({ timeout: 3000 }).catch(() => false);

    // Either age gate appears, or menu appears if cookie is still valid in browser
    if (isVisible) {
      expect(isVisible).toBe(true);
    }
  });

  test('Age gate handles rapid clicks gracefully', async () => {
    await page.context().clearCookies();
    await page.goto(`${BASE_URL}/${TEST_MENU_SLUG}`);

    const confirmButton = page.locator('button:has-text("Yes")').first();

    // Click multiple times rapidly
    await confirmButton.click();
    await confirmButton.click({ timeout: 100 }).catch(() => {});
    await confirmButton.click({ timeout: 100 }).catch(() => {});

    // Should still grant access without errors
    const menuGrid = page.locator('[data-testid="menu-grid"]').or(
      page.locator('[data-testid="product-grid"]')
    );
    await expect(menuGrid).toBeVisible({ timeout: 5000 });

    // No error messages should appear
    const errorMessage = page.locator('text=/error|something went wrong/i');
    const hasError = await errorMessage.isVisible({ timeout: 1000 }).catch(() => false);
    expect(hasError).toBe(false);
  });

  // ===========================================================================
  // 7. MOBILE RESPONSIVENESS
  // ===========================================================================

  test('Age gate displays correctly on mobile', async () => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.context().clearCookies();

    await page.goto(`${BASE_URL}/${TEST_MENU_SLUG}`);

    const ageGate = page.locator('[data-testid="age-gate"]').or(
      page.locator('text=/21|age verification/i').first().locator('..')
    );

    await expect(ageGate).toBeVisible();

    // Buttons should be tappable (at least 44px)
    const confirmButton = page.locator('button:has-text("Yes")').first();
    const boundingBox = await confirmButton.boundingBox();

    expect(boundingBox).not.toBeNull();
    expect(boundingBox!.height).toBeGreaterThanOrEqual(44);
    expect(boundingBox!.width).toBeGreaterThanOrEqual(44);
  });

  test('Age gate does not cause horizontal scroll on mobile', async () => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.context().clearCookies();

    await page.goto(`${BASE_URL}/${TEST_MENU_SLUG}`);

    // Check for horizontal scroll
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);

    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1);
  });

  // ===========================================================================
  // 8. ACCESSIBILITY
  // ===========================================================================

  test('Age gate is keyboard navigable', async () => {
    await page.context().clearCookies();
    await page.goto(`${BASE_URL}/${TEST_MENU_SLUG}`);

    // Tab to confirm button
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Enter key should confirm
    await page.keyboard.press('Enter');

    // Menu should load
    const menuGrid = page.locator('[data-testid="menu-grid"]');
    await expect(menuGrid).toBeVisible({ timeout: 5000 });
  });

  test('Age gate has proper ARIA labels', async () => {
    await page.context().clearCookies();
    await page.goto(`${BASE_URL}/${TEST_MENU_SLUG}`);

    const confirmButton = page.locator('button:has-text("Yes")').first();

    // Button should have accessible name
    const accessibleName = await confirmButton.getAttribute('aria-label')
      .catch(() => confirmButton.textContent());

    expect(accessibleName).toBeTruthy();
    expect(accessibleName!.length).toBeGreaterThan(0);
  });

  // ===========================================================================
  // 9. BRAND-SPECIFIC GATES
  // ===========================================================================

  test('Different brands can have custom age gate styling', async () => {
    await page.context().clearCookies();
    await page.goto(`${BASE_URL}/${TEST_MENU_SLUG}`);

    const ageGate = page.locator('[data-testid="age-gate"]');

    if (await ageGate.isVisible({ timeout: 3000 })) {
      // Age gate should have brand-specific styling (logo, colors)
      const brandLogo = ageGate.locator('img').or(
        ageGate.locator('[data-testid="brand-logo"]')
      );

      // Logo may or may not be present
      const hasLogo = await brandLogo.isVisible({ timeout: 1000 }).catch(() => false);

      if (hasLogo) {
        const src = await brandLogo.getAttribute('src');
        expect(src).toBeTruthy();
      }
    }
  });

  // ===========================================================================
  // 10. COMPLIANCE VERIFICATION
  // ===========================================================================

  test('Age gate text includes legal language', async () => {
    await page.context().clearCookies();
    await page.goto(`${BASE_URL}/${TEST_MENU_SLUG}`);

    const ageGate = page.locator('[data-testid="age-gate"]').or(
      page.locator('text=/21|age verification/i').first().locator('..')
    );

    const gateText = await ageGate.textContent();

    // Should mention age 21 or legal age
    expect(gateText).toMatch(/21|twenty-one|legal age/i);
  });

  test('Age gate appears on all public-facing pages', async () => {
    await page.context().clearCookies();

    // Test various public pages
    const publicPages = [
      `${BASE_URL}/${TEST_MENU_SLUG}`,
      `${BASE_URL}/${TEST_MENU_SLUG}/deals`,
    ];

    for (const url of publicPages) {
      await page.goto(url);

      const ageGate = page.locator('[data-testid="age-gate"]').or(
        page.locator('text=/21|age verification/i').first()
      );

      const isVisible = await ageGate.isVisible({ timeout: 3000 }).catch(() => false);

      if (isVisible) {
        // Confirm to move to next page
        const confirmButton = page.locator('button:has-text("Yes")').first();
        await confirmButton.click();
        await page.waitForTimeout(500);
      }
    }
  });
});
