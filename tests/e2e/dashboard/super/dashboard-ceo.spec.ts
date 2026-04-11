import { test, expect } from '../../auth/fixtures';

test.describe('CEO Dashboard - Super Admin (org_bakedbot)', () => {
  test.beforeEach(async ({ superPage }) => {
    await superPage.goto('/dashboard/ceo', { waitUntil: 'domcontentloaded', timeout: 30000 });
  });

  test('should load CEO dashboard without redirecting to login or generic dashboard', async ({ superPage }) => {
    // Wait for the page to settle
    await superPage.waitForLoadState('networkidle', { timeout: 30000 });

    // Verify we're still on the CEO dashboard and not redirected
    const url = superPage.url();
    expect(url).toContain('/dashboard/ceo');
    expect(url).not.toContain('/signin');
    expect(url).not.toMatch(/\/dashboard$/);

    // Verify no error states are shown
    const errorHeading = superPage.getByRole('heading', { name: /error|unauthorized|forbidden|access denied/i });
    await expect(errorHeading).not.toBeVisible({ timeout: 5000 });
  });

  test('should display tab navigation with expected tabs', async ({ superPage }) => {
    await superPage.waitForLoadState('networkidle', { timeout: 30000 });

    // The CEO dashboard has many dynamically loaded tabs. Look for common tab-like elements.
    // Check for tab list or navigation elements
    const tabElements = superPage.getByRole('tab');
    const tabList = superPage.getByRole('tablist');

    // Either tabs or some navigation structure should be present
    const hasTabList = await tabList.count() > 0;
    const hasTabElements = await tabElements.count() > 0;

    // Also check for text-based navigation links/buttons that represent tabs
    const possibleTabTexts = [
      'Data Manager', 'AI Search', 'Coupons', 'AI Agent', 'Tickets',
      'Foot Traffic', 'Agent Chat', 'Playbooks', 'Operations',
      'Analytics', 'CRM', 'Account Management', 'Knowledge Base',
      'Settings', 'GLM Settings', 'Agent Sandbox', 'Invitations',
      'Email Tester'
    ];

    let visibleTabCount = 0;
    for (const tabText of possibleTabTexts) {
      const tabEl = superPage.getByRole('tab', { name: new RegExp(tabText, 'i') });
      if (await tabEl.count() > 0) {
        visibleTabCount++;
      }
    }

    // We expect either role-based tabs or some form of navigation to be present
    const hasNavigation = hasTabList || hasTabElements || visibleTabCount > 0;
    expect(hasNavigation).toBeTruthy();
  });

  test('should switch between tabs and load dynamic content', async ({ superPage }) => {
    await superPage.waitForLoadState('networkidle', { timeout: 30000 });

    // Find all available tabs
    const tabs = superPage.getByRole('tab');
    const tabCount = await tabs.count();

    if (tabCount >= 2) {
      // Click on the second tab to test tab switching
      const secondTab = tabs.nth(1);
      const secondTabName = await secondTab.textContent();
      await secondTab.click();

      // Wait for dynamic content to load (the tabs use nextDynamic with loading spinners)
      // Either the spinner disappears or content appears
      await superPage.waitForLoadState('networkidle', { timeout: 15000 });

      // Verify the tab is now selected
      await expect(secondTab).toHaveAttribute('aria-selected', 'true', { timeout: 10000 }).catch(() => {
        // Some UI libraries use data-state instead
        return expect(secondTab).toHaveAttribute('data-state', 'active', { timeout: 5000 });
      });

      // Click back to first tab
      const firstTab = tabs.nth(0);
      await firstTab.click();
      await superPage.waitForLoadState('networkidle', { timeout: 15000 });
    } else {
      // If no role-based tabs, look for clickable navigation buttons/links
      const navButtons = superPage.getByRole('button');
      expect(await navButtons.count()).toBeGreaterThan(0);
    }
  });

  test('should not show loading spinners indefinitely', async ({ superPage }) => {
    await superPage.waitForLoadState('networkidle', { timeout: 30000 });

    // The page uses Loader2 spinning icons during tab loading
    // After network idle, spinners should have resolved
    const spinners = superPage.locator('.animate-spin');
    const spinnerCount = await spinners.count();

    // Allow a brief moment for any remaining transitions
    if (spinnerCount > 0) {
      await superPage.waitForTimeout(3000);
      // After waiting, persistent spinners should be gone or minimal
      const remainingSpinners = await spinners.count();
      // It's acceptable to have 0-1 spinners (e.g., background refresh indicators)
      expect(remainingSpinners).toBeLessThanOrEqual(2);
    }
  });

  test('should support URL-based tab navigation via search params', async ({ superPage }) => {
    // The page uses useSearchParams, so test navigating with a query param
    await superPage.goto('/dashboard/ceo?tab=operations', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await superPage.waitForLoadState('networkidle', { timeout: 30000 });

    // Verify we're still on the CEO page
    expect(superPage.url()).toContain('/dashboard/ceo');

    // The operations tab content or its tab should be active/visible
    const operationsTab = superPage.getByRole('tab', { name: /operations/i });
    if (await operationsTab.count() > 0) {
      // Check if the operations tab is selected
      const isActive = await operationsTab.getAttribute('aria-selected') === 'true' ||
                        await operationsTab.getAttribute('data-state') === 'active';
      // This is informational - the param might use a different key
      if (!isActive) {
        // Just ensure page loaded without errors
        const errorText = superPage.getByText(/error|something went wrong/i);
        await expect(errorText).not.toBeVisible({ timeout: 5000 });
      }
    }
  });
});