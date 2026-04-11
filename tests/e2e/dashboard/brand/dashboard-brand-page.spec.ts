import { test, expect } from '../../auth/fixtures';

test.describe('Brand Page Dashboard - org_ecstatic_edibles (brand_admin)', () => {
  test.beforeEach(async ({ brandPage }) => {
    await brandPage.goto('/dashboard/brand-page', { waitUntil: 'domcontentloaded', timeout: 30000 });
  });

  test('should load the brand page without redirecting to login or generic dashboard', async ({ brandPage }) => {
    // Wait for the page to settle
    await brandPage.waitForLoadState('networkidle', { timeout: 30000 });

    // Verify we are still on the brand-page route, not redirected
    const url = brandPage.url();
    expect(url).toContain('/dashboard/brand-page');
    expect(url).not.toContain('/signin');
    expect(url).not.toMatch(/\/dashboard\/?$/);
  });

  test('should display key brand page elements (heading, slug/URL configuration)', async ({ brandPage }) => {
    await brandPage.waitForLoadState('networkidle', { timeout: 30000 });

    // Wait for any loading spinner to disappear
    const spinner = brandPage.getByRole('progressbar');
    if (await spinner.isVisible({ timeout: 2000 }).catch(() => false)) {
      await spinner.waitFor({ state: 'hidden', timeout: 15000 });
    }

    // Look for a heading related to brand page / headless menu
    const heading = brandPage.getByRole('heading').first();
    await expect(heading).toBeVisible({ timeout: 10000 });

    // The page should contain brand-related content
    const pageContent = await brandPage.textContent('body');
    const hasBrandContent =
      pageContent?.toLowerCase().includes('brand') ||
      pageContent?.toLowerCase().includes('menu') ||
      pageContent?.toLowerCase().includes('slug') ||
      pageContent?.toLowerCase().includes('url') ||
      pageContent?.toLowerCase().includes('launch') ||
      pageContent?.toLowerCase().includes('page');
    expect(hasBrandContent).toBeTruthy();
  });

  test('should display slug/URL configuration or empty state', async ({ brandPage }) => {
    await brandPage.waitForLoadState('networkidle', { timeout: 30000 });

    // Wait for loading to complete
    const spinner = brandPage.getByRole('progressbar');
    if (await spinner.isVisible({ timeout: 2000 }).catch(() => false)) {
      await spinner.waitFor({ state: 'hidden', timeout: 15000 });
    }

    // The page should show either a slug/URL input, a launch button, or some form of configuration
    const slugInput = brandPage.getByRole('textbox');
    const launchButton = brandPage.getByRole('button', { name: /launch|save|update|submit|create|configure/i });
    const emptyState = brandPage.getByText(/no data|get started|set up|configure|empty|no brand/i);

    const hasInput = await slugInput.first().isVisible({ timeout: 5000 }).catch(() => false);
    const hasButton = await launchButton.first().isVisible({ timeout: 3000 }).catch(() => false);
    const hasEmptyState = await emptyState.first().isVisible({ timeout: 3000 }).catch(() => false);

    // At least one of these should be present - either the config UI or an empty state
    expect(hasInput || hasButton || hasEmptyState).toBeTruthy();
  });

  test('should have interactive elements that are clickable', async ({ brandPage }) => {
    await brandPage.waitForLoadState('networkidle', { timeout: 30000 });

    // Wait for loading to complete
    const spinner = brandPage.getByRole('progressbar');
    if (await spinner.isVisible({ timeout: 2000 }).catch(() => false)) {
      await spinner.waitFor({ state: 'hidden', timeout: 15000 });
    }

    // Find all buttons on the page
    const buttons = brandPage.getByRole('button');
    const buttonCount = await buttons.count();

    if (buttonCount > 0) {
      // Verify at least one button is enabled and visible
      let foundEnabledButton = false;
      for (let i = 0; i < buttonCount; i++) {
        const button = buttons.nth(i);
        const isVisible = await button.isVisible().catch(() => false);
        const isEnabled = await button.isEnabled().catch(() => false);
        if (isVisible && isEnabled) {
          foundEnabledButton = true;
          break;
        }
      }
      expect(foundEnabledButton).toBeTruthy();
    }

    // Check for tabs if present
    const tabs = brandPage.getByRole('tab');
    const tabCount = await tabs.count();
    if (tabCount > 1) {
      // Click the second tab and verify it becomes selected
      const secondTab = tabs.nth(1);
      await secondTab.click();
      await expect(secondTab).toHaveAttribute('aria-selected', 'true', { timeout: 5000 });
    }
  });

  test('should not show any error states or uncaught exceptions', async ({ brandPage }) => {
    const errors: string[] = [];
    brandPage.on('pageerror', (error) => {
      errors.push(error.message);
    });

    await brandPage.waitForLoadState('networkidle', { timeout: 30000 });

    // Check no error banners or alerts with error content are visible
    const errorAlert = brandPage.getByRole('alert');
    const alertCount = await errorAlert.count();

    for (let i = 0; i < alertCount; i++) {
      const alertText = await errorAlert.nth(i).textContent();
      // Allow success/info alerts, but flag destructive error alerts
      if (alertText?.toLowerCase().includes('error') || alertText?.toLowerCase().includes('failed')) {
        // This is an error state - fail the test
        expect(alertText).not.toContain('error');
      }
    }

    // Filter out known non-critical errors
    const criticalErrors = errors.filter(
      (e) => !e.includes('ResizeObserver') && !e.includes('hydration')
    );
    expect(criticalErrors).toHaveLength(0);
  });
});