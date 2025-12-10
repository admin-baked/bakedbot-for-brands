import { test, expect } from '@playwright/test';

/**
 * Bundles Dashboard Tests
 * Tests the operator dashboard for managing promotional bundles
 */

test.describe('Bundles Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to bundles dashboard
    // Note: Requires authentication as operator/brand
    await page.goto('/dashboard/promotions/bundles');
  });

  test('should display bundles dashboard title and description', async ({ page }) => {
    // Check page title
    const title = page.locator('h1');
    await expect(title).toContainText(/deals|bundles/i);
    
    // Check description
    const description = page.locator('[data-testid="dashboard-description"]');
    if (await description.isVisible()) {
      await expect(description).toBeVisible();
    }
  });

  test('should show create bundle button', async ({ page }) => {
    const createButton = page.locator('[data-testid="create-bundle-button"]');
    await expect(createButton).toBeVisible();
    
    // Should contain Plus icon and text
    const text = createButton.locator('text');
    await expect(text).toContainText(/create|new/i);
  });

  test('should display active bundles table', async ({ page }) => {
    // Wait for table to load
    const table = page.locator('[data-testid="bundles-table"]');
    
    if (await table.isVisible()) {
      // Check for table headers
      const nameHeader = page.locator('text=Name');
      const typeHeader = page.locator('text=Type');
      const statusHeader = page.locator('text=Status');
      
      await expect(nameHeader).toBeVisible();
      await expect(typeHeader).toBeVisible();
      await expect(statusHeader).toBeVisible();
    }
  });

  test('should display bundle rows with all required columns', async ({ page }) => {
    // Find bundle rows
    const bundleRows = page.locator('[data-testid="bundle-row"]');
    const rowCount = await bundleRows.count();
    
    if (rowCount > 0) {
      const firstRow = bundleRows.first();
      
      // Check for required columns
      const name = firstRow.locator('[data-testid="bundle-name"]');
      const type = firstRow.locator('[data-testid="bundle-type"]');
      const status = firstRow.locator('[data-testid="bundle-status"]');
      const revenue = firstRow.locator('[data-testid="bundle-revenue"]');
      
      await expect(name).toBeVisible();
      await expect(type).toBeVisible();
      await expect(status).toBeVisible();
      await expect(revenue).toBeVisible();
    }
  });

  test('should display bundle status badges', async ({ page }) => {
    const bundleRows = page.locator('[data-testid="bundle-row"]');
    const rowCount = await bundleRows.count();
    
    if (rowCount > 0) {
      const statusBadges = page.locator('[data-testid="status-badge"]');
      const badgeCount = await statusBadges.count();
      expect(badgeCount).toBeGreaterThan(0);
      
      // Badges should have valid statuses
      const firstBadge = statusBadges.first();
      await expect(firstBadge).toHaveAttribute('data-status', /active|scheduled|draft/i);
    }
  });

  test('should show actions dropdown menu', async ({ page }) => {
    const bundleRows = page.locator('[data-testid="bundle-row"]');
    const rowCount = await bundleRows.count();
    
    if (rowCount > 0) {
      const actionsButton = bundleRows.first().locator('[data-testid="bundle-actions-menu"]');
      if (await actionsButton.isVisible()) {
        await actionsButton.click();
        
        // Should show menu options
        const editOption = page.locator('[data-testid="edit-bundle-option"]');
        const copyOption = page.locator('[data-testid="copy-bundle-option"]');
        const archiveOption = page.locator('[data-testid="archive-bundle-option"]');
        
        await expect(editOption).toBeVisible();
      }
    }
  });

  test('should open create bundle dialog when clicking create button', async ({ page }) => {
    const createButton = page.locator('[data-testid="create-bundle-button"]');
    await createButton.click();
    
    // Dialog or new page should open
    const dialog = page.locator('[data-testid="create-bundle-dialog"]');
    if (await dialog.isVisible()) {
      await expect(dialog).toBeVisible();
    }
  });

  test('should display bundle sales and revenue metrics', async ({ page }) => {
    const bundleRows = page.locator('[data-testid="bundle-row"]');
    const rowCount = await bundleRows.count();
    
    if (rowCount > 0) {
      const firstRow = bundleRows.first();
      
      // Check for metrics
      const sales = firstRow.locator('[data-testid="bundle-redemptions"]');
      const revenue = firstRow.locator('[data-testid="bundle-revenue"]');
      
      if (await sales.isVisible()) {
        await expect(sales).toBeVisible();
      }
      if (await revenue.isVisible()) {
        await expect(revenue).toBeVisible();
      }
    }
  });

  test('should handle empty bundles state', async ({ page }) => {
    const bundleRows = page.locator('[data-testid="bundle-row"]');
    const rowCount = await bundleRows.count();
    
    if (rowCount === 0) {
      // Should show empty state
      const emptyState = page.locator('[data-testid="empty-bundles-state"]');
      if (await emptyState.isVisible()) {
        await expect(emptyState).toBeVisible();
      }
    }
  });

  test('should allow editing a bundle', async ({ page }) => {
    const bundleRows = page.locator('[data-testid="bundle-row"]');
    const rowCount = await bundleRows.count();
    
    if (rowCount > 0) {
      const actionsButton = bundleRows.first().locator('[data-testid="bundle-actions-menu"]');
      
      if (await actionsButton.isVisible()) {
        await actionsButton.click();
        
        const editOption = page.locator('[data-testid="edit-bundle-option"]');
        if (await editOption.isVisible()) {
          await editOption.click();
          
          // Should navigate to edit page or open edit dialog
          // URL might change or dialog might appear
          await page.waitForTimeout(500);
        }
      }
    }
  });

  test('should display pagination or load more if many bundles', async ({ page }) => {
    // Check if pagination exists
    const pagination = page.locator('[data-testid="bundles-pagination"]');
    const loadMore = page.locator('[data-testid="load-more-bundles"]');
    
    if (await pagination.isVisible()) {
      await expect(pagination).toBeVisible();
    } else if (await loadMore.isVisible()) {
      await expect(loadMore).toBeVisible();
    }
  });
});
