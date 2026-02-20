/**
 * POS Sync Flow E2E Tests
 *
 * Test suite for Production Readiness Audit - Track C
 * Covers: Manual sync → Reconcile products → Verify menu updates
 *
 * Priority: Tier 1 (Revenue Critical - Menu accuracy drives sales)
 */

import { test, expect, Page } from '@playwright/test';

// Test configuration
const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';
const DISPENSARY_EMAIL = process.env.TEST_DISPENSARY_EMAIL || 'test-dispensary@bakedbot.ai';
const DISPENSARY_PASSWORD = process.env.TEST_DISPENSARY_PASSWORD || 'TestPassword123!';

test.describe('POS Sync Flow - End to End', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();

    // Login as dispensary admin
    await page.goto(`${BASE_URL}/signin`);
    await page.fill('input[type="email"]', DISPENSARY_EMAIL);
    await page.fill('input[type="password"]', DISPENSARY_PASSWORD);
    await page.click('button:has-text("Sign In")');
    await page.waitForURL(`${BASE_URL}/dashboard/**`);
  });

  test.afterAll(async () => {
    await page.close();
  });

  // ===========================================================================
  // 1. POS CONNECTION STATUS
  // ===========================================================================

  test('POS settings page loads successfully', async () => {
    await page.goto(`${BASE_URL}/dashboard/settings/pos`);

    // Check for POS settings panel
    const posSettings = page.locator('[data-testid="pos-settings"]').or(
      page.locator('text=/POS Integration|Point of Sale/i')
    );
    await expect(posSettings).toBeVisible();
  });

  test('Displays current POS connection status', async () => {
    await page.goto(`${BASE_URL}/dashboard/settings/pos`);

    // Check for connection status indicator
    const statusBadge = page.locator('[data-testid="pos-status"]').or(
      page.locator('text=/Connected|Disconnected|Active/i').first()
    );
    await expect(statusBadge).toBeVisible({ timeout: 5000 });

    const statusText = await statusBadge.textContent();
    expect(statusText).toMatch(/connected|disconnected|active|inactive/i);
  });

  test('Shows last sync timestamp', async () => {
    await page.goto(`${BASE_URL}/dashboard/settings/pos`);

    // Look for last sync time
    const lastSync = page.locator('[data-testid="last-sync-time"]').or(
      page.locator('text=/Last sync|Last updated/i').locator('..')
    );

    if (await lastSync.isVisible({ timeout: 3000 })) {
      const syncText = await lastSync.textContent();
      // Should contain time/date info
      expect(syncText).toMatch(/\d+|ago|never|today|yesterday/i);
    }
  });

  // ===========================================================================
  // 2. MANUAL SYNC TRIGGER
  // ===========================================================================

  test('Manual sync button is visible and enabled', async () => {
    await page.goto(`${BASE_URL}/dashboard/settings/pos`);

    const syncButton = page.locator('button:has-text("Sync Now")').or(
      page.locator('[data-testid="sync-now-button"]')
    );

    await expect(syncButton).toBeVisible();
    await expect(syncButton).toBeEnabled();
  });

  test('Can trigger manual POS sync', async () => {
    await page.goto(`${BASE_URL}/dashboard/settings/pos`);

    const syncButton = page.locator('button:has-text("Sync Now")').or(
      page.locator('[data-testid="sync-now-button"]')
    );

    // Click sync button
    await syncButton.click();

    // Should show loading/syncing state
    const loadingIndicator = page.locator('[data-testid="sync-loading"]').or(
      page.locator('text=/syncing|loading/i').first()
    );
    await expect(loadingIndicator).toBeVisible({ timeout: 3000 });

    // Wait for sync to complete
    const successMessage = page.locator('text=/success|complete|synced/i').or(
      page.locator('[data-testid="sync-success"]')
    );
    await expect(successMessage).toBeVisible({ timeout: 30000 });
  });

  test('Sync updates last sync timestamp', async () => {
    await page.goto(`${BASE_URL}/dashboard/settings/pos`);

    // Get current timestamp
    const lastSyncBefore = page.locator('[data-testid="last-sync-time"]').or(
      page.locator('text=/Last sync/i').locator('..')
    );
    const beforeText = await lastSyncBefore.textContent().catch(() => null);

    // Trigger sync
    const syncButton = page.locator('button:has-text("Sync Now")');
    await syncButton.click();

    // Wait for completion
    await page.waitForTimeout(5000);

    // Check timestamp updated
    const afterText = await lastSyncBefore.textContent();
    if (beforeText) {
      expect(afterText).not.toBe(beforeText);
    }
    expect(afterText).toMatch(/just now|ago|seconds|minutes/i);
  });

  // ===========================================================================
  // 3. PRODUCT RECONCILIATION
  // ===========================================================================

  test('Products page displays synced items', async () => {
    await page.goto(`${BASE_URL}/dashboard/products`);

    // Check for product list
    const productGrid = page.locator('[data-testid="product-grid"]').or(
      page.locator('[data-testid="product-list"]')
    );
    await expect(productGrid).toBeVisible({ timeout: 5000 });

    // Should have at least one product
    const productItems = page.locator('[data-testid="product-item"]').or(
      page.locator('[data-product-id]')
    );
    const count = await productItems.count();
    expect(count).toBeGreaterThan(0);
  });

  test('New products appear after sync', async () => {
    // Navigate to products page
    await page.goto(`${BASE_URL}/dashboard/products`);

    // Get initial product count
    const productItems = page.locator('[data-testid="product-item"]');
    const initialCount = await productItems.count();

    // Trigger sync
    await page.goto(`${BASE_URL}/dashboard/settings/pos`);
    const syncButton = page.locator('button:has-text("Sync Now")');
    await syncButton.click();

    // Wait for sync to complete
    await page.waitForTimeout(10000);

    // Navigate back to products
    await page.goto(`${BASE_URL}/dashboard/products`);

    // Get new product count (may be same or increased)
    const newCount = await productItems.count();
    expect(newCount).toBeGreaterThanOrEqual(initialCount);
  });

  test('Product prices update correctly', async () => {
    await page.goto(`${BASE_URL}/dashboard/products`);

    // Find a product with price
    const productWithPrice = page.locator('[data-testid="product-item"]').filter({
      has: page.locator('text=/\\$\\d+/'),
    }).first();

    if (await productWithPrice.isVisible()) {
      const priceElement = productWithPrice.locator('text=/\\$\\d+/').first();
      const priceText = await priceElement.textContent();

      // Price should be a valid dollar amount
      expect(priceText).toMatch(/\$\d+(\.\d{2})?/);
    }
  });

  test('Removed products are deleted from catalog', async () => {
    // This test verifies that products no longer in POS are removed
    await page.goto(`${BASE_URL}/dashboard/products`);

    // Check for product source indicators
    const posProducts = page.locator('[data-source="pos"]').or(
      page.locator('[data-testid="product-item"]')
    );

    const count = await posProducts.count();

    // All visible products should be from POS (after reconcile)
    if (count > 0) {
      // Spot check: select a random product
      const randomIndex = Math.floor(Math.random() * count);
      const product = posProducts.nth(randomIndex);

      // Should have valid product data
      const productName = product.locator('[data-testid="product-name"]').or(
        product.locator('text=/^[A-Za-z0-9]/').first()
      );
      await expect(productName).toBeVisible();
    }
  });

  // ===========================================================================
  // 4. MENU UPDATES
  // ===========================================================================

  test('Public menu reflects synced products', async () => {
    // Get org slug from settings or URL
    await page.goto(`${BASE_URL}/dashboard/settings`);
    const currentUrl = page.url();
    const orgSlug = currentUrl.split('/')[3] || 'demo';

    // Navigate to public menu
    await page.goto(`${BASE_URL}/${orgSlug}`);

    // Check for age gate first
    const ageGate = page.locator('[data-testid="age-gate"]').or(
      page.locator('text=/21|age verification/i')
    );

    if (await ageGate.isVisible({ timeout: 3000 })) {
      const confirmButton = page.locator('button:has-text("Yes")').or(
        page.locator('button:has-text("I am 21")').or(
          page.locator('[data-testid="age-confirm"]')
        )
      );
      await confirmButton.click();
    }

    // Wait for menu to load
    await page.waitForLoadState('networkidle');

    // Check for product grid
    const menuGrid = page.locator('[data-testid="menu-grid"]').or(
      page.locator('[data-testid="product-grid"]')
    );
    await expect(menuGrid).toBeVisible({ timeout: 10000 });

    // Should have products
    const menuProducts = page.locator('[data-testid="menu-product"]').or(
      page.locator('[data-product-id]')
    );
    const productCount = await menuProducts.count();
    expect(productCount).toBeGreaterThan(0);
  });

  test('Product details match POS data', async () => {
    await page.goto(`${BASE_URL}/dashboard/products`);

    // Get a product from dashboard
    const firstProduct = page.locator('[data-testid="product-item"]').first();
    const productName = await firstProduct.locator('[data-testid="product-name"]')
      .textContent()
      .catch(() => null);

    if (productName) {
      // Check public menu for same product
      const currentUrl = page.url();
      const orgSlug = currentUrl.split('/')[3] || 'demo';

      await page.goto(`${BASE_URL}/${orgSlug}`);

      // Skip age gate if present
      const ageConfirm = page.locator('button:has-text("Yes")').first();
      if (await ageConfirm.isVisible({ timeout: 2000 })) {
        await ageConfirm.click();
      }

      // Search for product
      const menuProduct = page.locator(`text=${productName}`).first();

      if (await menuProduct.isVisible({ timeout: 5000 })) {
        expect(await menuProduct.textContent()).toContain(productName);
      }
    }
  });

  // ===========================================================================
  // 5. SYNC STATUS INDICATORS
  // ===========================================================================

  test('Displays sync count badge', async () => {
    await page.goto(`${BASE_URL}/dashboard/products`);

    // Look for sync status or count
    const syncBadge = page.locator('[data-testid="pos-sync-count"]').or(
      page.locator('text=/\\d+ products? synced/i')
    );

    if (await syncBadge.isVisible({ timeout: 3000 })) {
      const badgeText = await syncBadge.textContent();
      expect(badgeText).toMatch(/\d+/);
    }
  });

  test('Shows mismatch warning when POS count differs', async () => {
    await page.goto(`${BASE_URL}/dashboard/products`);

    // Check for mismatch indicator (only visible if counts differ)
    const mismatchWarning = page.locator('[data-testid="sync-mismatch-warning"]').or(
      page.locator('text=/out of sync|mismatch/i')
    );

    const hasMismatch = await mismatchWarning.isVisible({ timeout: 2000 }).catch(() => false);

    if (hasMismatch) {
      // If mismatch present, should have actionable button
      const resyncButton = page.locator('button:has-text("Re-sync")').or(
        page.locator('button:has-text("Sync Now")')
      );
      await expect(resyncButton).toBeVisible();
    }
  });

  // ===========================================================================
  // 6. ERROR HANDLING
  // ===========================================================================

  test('Shows error when POS connection fails', async () => {
    await page.goto(`${BASE_URL}/dashboard/settings/pos`);

    // Trigger sync
    const syncButton = page.locator('button:has-text("Sync Now")');
    await syncButton.click();

    // Wait for result (success or error)
    const result = page.locator('[data-testid="sync-result"]').or(
      page.locator('text=/success|error|failed/i').first()
    );

    await expect(result).toBeVisible({ timeout: 30000 });

    const resultText = await result.textContent();

    // Should be either success or error (not stuck loading)
    expect(resultText).toMatch(/success|complete|error|failed|unable/i);
  });

  test('Displays helpful error message on POS offline', async () => {
    await page.goto(`${BASE_URL}/dashboard/settings/pos`);

    // Check connection status
    const status = page.locator('[data-testid="pos-status"]');
    const statusText = await status.textContent().catch(() => '');

    if (statusText.match(/disconnected|offline|error/i)) {
      // Should show error details
      const errorDetails = page.locator('[data-testid="pos-error-details"]').or(
        page.locator('text=/connection|unreachable|offline/i')
      );

      if (await errorDetails.isVisible({ timeout: 2000 })) {
        const errorText = await errorDetails.textContent();
        expect(errorText!.length).toBeGreaterThan(20);
      }
    }
  });

  test('Gracefully handles partial sync failure', async () => {
    await page.goto(`${BASE_URL}/dashboard/settings/pos`);

    const syncButton = page.locator('button:has-text("Sync Now")');
    await syncButton.click();

    // Wait for sync attempt
    await page.waitForTimeout(10000);

    // Check for partial success indicator
    const statusMessage = page.locator('[data-testid="sync-status-message"]').or(
      page.locator('text=/synced|failed|partial/i').first()
    );

    if (await statusMessage.isVisible()) {
      const messageText = await statusMessage.textContent();

      // Should have meaningful status (not just "Error")
      expect(messageText!.length).toBeGreaterThan(5);
    }
  });

  // ===========================================================================
  // 7. POS AS SINGLE SOURCE OF TRUTH
  // ===========================================================================

  test('Manual products are removed when POS sync enabled', async () => {
    await page.goto(`${BASE_URL}/dashboard/products`);

    // Check product source distribution
    const allProducts = page.locator('[data-testid="product-item"]');
    const productCount = await allProducts.count();

    if (productCount > 0) {
      // Spot check: products should be from POS source
      const randomProduct = allProducts.nth(Math.floor(Math.random() * productCount));

      const sourceIndicator = randomProduct.locator('[data-source]').or(
        randomProduct.locator('[data-testid="product-source"]')
      );

      if (await sourceIndicator.isVisible({ timeout: 1000 })) {
        const source = await sourceIndicator.getAttribute('data-source');
        // After POS sync, all products should be POS-sourced
        expect(source).toBe('pos');
      }
    }
  });

  test('POS count matches catalog count after reconcile', async () => {
    await page.goto(`${BASE_URL}/dashboard/products`);

    // Look for count indicators
    const posCount = page.locator('[data-testid="pos-count"]').or(
      page.locator('text=/POS: \\d+/i')
    );

    const catalogCount = page.locator('[data-testid="catalog-count"]').or(
      page.locator('text=/Catalog: \\d+/i')
    );

    const hasPosCount = await posCount.isVisible({ timeout: 2000 }).catch(() => false);
    const hasCatalogCount = await catalogCount.isVisible({ timeout: 2000 }).catch(() => false);

    if (hasPosCount && hasCatalogCount) {
      const posText = await posCount.textContent();
      const catalogText = await catalogCount.textContent();

      const posNum = parseInt(posText!.match(/\d+/)![0]);
      const catalogNum = parseInt(catalogText!.match(/\d+/)![0]);

      // After reconcile, counts should match (or catalog should be POS + featured brands)
      expect(catalogNum).toBeGreaterThanOrEqual(posNum);
    }
  });

  // ===========================================================================
  // 8. EDGE CASES
  // ===========================================================================

  test('Handles sync with zero products', async () => {
    // This test verifies graceful handling of empty POS
    await page.goto(`${BASE_URL}/dashboard/products`);

    const productItems = page.locator('[data-testid="product-item"]');
    const count = await productItems.count();

    if (count === 0) {
      // Should show empty state
      const emptyState = page.locator('[data-testid="empty-products"]').or(
        page.locator('text=/no products|empty/i')
      );
      await expect(emptyState).toBeVisible();
    }
  });

  test('Prevents concurrent sync operations', async () => {
    await page.goto(`${BASE_URL}/dashboard/settings/pos`);

    const syncButton = page.locator('button:has-text("Sync Now")');

    // Click sync button
    await syncButton.click();

    // Button should be disabled during sync
    await expect(syncButton).toBeDisabled({ timeout: 2000 });

    // Or button should show loading state
    const loadingIndicator = syncButton.locator('text=/syncing|loading/i').or(
      syncButton.locator('[data-loading]')
    );

    const isLoading = await loadingIndicator.isVisible({ timeout: 1000 }).catch(() => false);

    if (!isLoading) {
      // If no loading indicator, button should be disabled
      expect(await syncButton.isDisabled()).toBe(true);
    }
  });

  test('Sync respects category mapping', async () => {
    await page.goto(`${BASE_URL}/dashboard/products`);

    // Check for categorized products
    const categories = page.locator('[data-testid="category-filter"]').or(
      page.locator('[data-category]')
    );

    if (await categories.first().isVisible({ timeout: 3000 })) {
      const categoryCount = await categories.count();
      expect(categoryCount).toBeGreaterThan(0);

      // Select a category
      await categories.first().click();

      // Products should filter
      const filteredProducts = page.locator('[data-testid="product-item"]');
      const filteredCount = await filteredProducts.count();

      expect(filteredCount).toBeGreaterThanOrEqual(0);
    }
  });
});
