import { test, expect } from '../../auth/fixtures';

test.describe('Dashboard Products Page - dispensary_admin (org_thrive_syracuse)', () => {
  test('should load the products page without redirecting to login', async ({ dispensaryPage }) => {
    await dispensaryPage.goto('/dashboard/products', { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Verify we are still on the products page and not redirected to signin or generic dashboard
    await expect(dispensaryPage).not.toHaveURL(/\/signin/, { timeout: 10000 });
    await expect(dispensaryPage).not.toHaveURL(/\/dashboard$/);

    // The URL should contain /dashboard/products
    await expect(dispensaryPage).toHaveURL(/\/dashboard\/products/);
  });

  test('should display key page elements including heading and action buttons', async ({ dispensaryPage }) => {
    await dispensaryPage.goto('/dashboard/products', { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Wait for the page to finish loading - look for either products content or empty state
    await dispensaryPage.waitForLoadState('networkidle', { timeout: 30000 });

    // Check for a heading or text related to products
    const productsHeading = dispensaryPage.getByRole('heading', { name: /products/i });
    const productsText = dispensaryPage.getByText(/products/i).first();
    const hasHeading = await productsHeading.isVisible({ timeout: 10000 }).catch(() => false);
    const hasText = await productsText.isVisible({ timeout: 5000 }).catch(() => false);

    expect(hasHeading || hasText).toBeTruthy();

    // Check for action buttons (Add Product / Import) based on the source code
    const addButton = dispensaryPage.getByRole('link', { name: /add|new|create|plus/i }).or(
      dispensaryPage.getByRole('button', { name: /add|new|create|plus/i })
    );
    const importButton = dispensaryPage.getByRole('button', { name: /import/i }).or(
      dispensaryPage.getByRole('link', { name: /import/i })
    );

    // At least one action element should be visible, or the page may show an alert
    const hasAddButton = await addButton.first().isVisible({ timeout: 5000 }).catch(() => false);
    const hasImportButton = await importButton.first().isVisible({ timeout: 5000 }).catch(() => false);
    const hasAlert = await dispensaryPage.getByRole('alert').first().isVisible({ timeout: 5000 }).catch(() => false);

    // The page should show either action buttons or an informational alert
    expect(hasAddButton || hasImportButton || hasAlert).toBeTruthy();
  });

  test('should display product tabs or product listing area', async ({ dispensaryPage }) => {
    await dispensaryPage.goto('/dashboard/products', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await dispensaryPage.waitForLoadState('networkidle', { timeout: 30000 });

    // The page uses ProductsTabsWrapper, so look for tab elements
    const tabList = dispensaryPage.getByRole('tablist');
    const hasTabList = await tabList.first().isVisible({ timeout: 10000 }).catch(() => false);

    if (hasTabList) {
      // Get all tab elements
      const tabs = dispensaryPage.getByRole('tab');
      const tabCount = await tabs.count();
      expect(tabCount).toBeGreaterThanOrEqual(1);

      // Click on the first tab to ensure it's interactive
      const firstTab = tabs.first();
      await firstTab.click();
      await expect(firstTab).toBeVisible({ timeout: 5000 });
    } else {
      // If no tabs, check for either a table, product list, empty state, or alert
      const table = dispensaryPage.getByRole('table');
      const emptyState = dispensaryPage.getByText(/no products|no items|empty|get started|no data/i);
      const alert = dispensaryPage.getByRole('alert');

      const hasTable = await table.first().isVisible({ timeout: 5000 }).catch(() => false);
      const hasEmptyState = await emptyState.first().isVisible({ timeout: 5000 }).catch(() => false);
      const hasAlertMsg = await alert.first().isVisible({ timeout: 5000 }).catch(() => false);

      expect(hasTable || hasEmptyState || hasAlertMsg).toBeTruthy();
    }
  });

  test('should handle tab switching if tabs are present', async ({ dispensaryPage }) => {
    await dispensaryPage.goto('/dashboard/products', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await dispensaryPage.waitForLoadState('networkidle', { timeout: 30000 });

    const tabs = dispensaryPage.getByRole('tab');
    const tabCount = await tabs.count();

    if (tabCount >= 2) {
      // Click the second tab
      const secondTab = tabs.nth(1);
      const secondTabName = await secondTab.textContent();
      await secondTab.click();

      // Verify the second tab is now selected
      await expect(secondTab).toHaveAttribute('aria-selected', 'true', { timeout: 5000 });

      // Click back to first tab
      const firstTab = tabs.first();
      await firstTab.click();
      await expect(firstTab).toHaveAttribute('aria-selected', 'true', { timeout: 5000 });
    } else {
      // If fewer than 2 tabs, just verify the page is still functional
      await expect(dispensaryPage).toHaveURL(/\/dashboard\/products/);
    }
  });

  test('should not show error states or crash', async ({ dispensaryPage }) => {
    await dispensaryPage.goto('/dashboard/products', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await dispensaryPage.waitForLoadState('networkidle', { timeout: 30000 });

    // Check there's no unhandled error page
    const errorHeading = dispensaryPage.getByRole('heading', { name: /error|500|something went wrong/i });
    const hasError = await errorHeading.first().isVisible({ timeout: 3000 }).catch(() => false);
    expect(hasError).toBeFalsy();

    // Check there's no "Application error" text (Next.js error boundary)
    const appError = dispensaryPage.getByText(/application error/i);
    const hasAppError = await appError.first().isVisible({ timeout: 3000 }).catch(() => false);
    expect(hasAppError).toBeFalsy();

    // The page should have meaningful content (not blank)
    const bodyText = await dispensaryPage.locator('body').textContent();
    expect(bodyText?.trim().length).toBeGreaterThan(0);
  });
});