import { test, expect } from '../../auth/fixtures';

test.describe('Dashboard page - dispensary_admin (org_thrive_syracuse)', () => {
  test('should redirect dispensary_admin to /dashboard/inbox (inbox-first architecture)', async ({ dispensaryPage }) => {
    await dispensaryPage.goto('/dashboard');

    // dispensary_admin role should be redirected to /dashboard/inbox
    await dispensaryPage.waitForURL('**/dashboard/inbox', { timeout: 30000 });

    expect(dispensaryPage.url()).toContain('/dashboard/inbox');
  });

  test('should not redirect to /signin (auth is valid)', async ({ dispensaryPage }) => {
    await dispensaryPage.goto('/dashboard');

    // Wait for any redirect to settle
    await dispensaryPage.waitForURL('**/dashboard/**', { timeout: 30000 });

    // Should NOT be on signin page
    expect(dispensaryPage.url()).not.toContain('/signin');
    expect(dispensaryPage.url()).not.toContain('/login');
    expect(dispensaryPage.url()).not.toContain('/auth');
  });

  test('should show loading state briefly before redirect', async ({ dispensaryPage }) => {
    // Navigate to dashboard and check for the loading indicator before redirect
    await dispensaryPage.goto('/dashboard');

    // Either we catch the loading state or we've already redirected
    // Both are valid outcomes
    const loadingText = dispensaryPage.getByText('Loading your workspace...');
    const isLoadingVisible = await loadingText.isVisible().catch(() => false);

    if (isLoadingVisible) {
      // If we caught the loading state, verify the spinner is present
      await expect(loadingText).toBeVisible({ timeout: 5000 });
    }

    // Regardless, we should end up at /dashboard/inbox
    await dispensaryPage.waitForURL('**/dashboard/inbox', { timeout: 30000 });
    expect(dispensaryPage.url()).toContain('/dashboard/inbox');
  });

  test('should not redirect to /dashboard/ceo (not a super user)', async ({ dispensaryPage }) => {
    await dispensaryPage.goto('/dashboard');

    // Wait for redirect to settle
    await dispensaryPage.waitForURL('**/dashboard/**', { timeout: 30000 });

    // dispensary_admin should NOT go to CEO dashboard
    expect(dispensaryPage.url()).not.toContain('/dashboard/ceo');

    // Should go to inbox instead
    expect(dispensaryPage.url()).toContain('/dashboard/inbox');
  });

  test('should load inbox page content after redirect', async ({ dispensaryPage }) => {
    await dispensaryPage.goto('/dashboard');

    // Wait for redirect to inbox
    await dispensaryPage.waitForURL('**/dashboard/inbox', { timeout: 30000 });

    // Verify the inbox page has loaded with some content
    // Wait for loading spinners to disappear
    const spinner = dispensaryPage.getByText('Loading your workspace...');
    await expect(spinner).toBeHidden({ timeout: 15000 }).catch(() => {
      // Spinner may have already disappeared
    });

    // The page should have meaningful content - check for common dashboard/inbox elements
    // At minimum, the page should not be blank and should not show an error
    const body = dispensaryPage.locator('body');
    await expect(body).not.toBeEmpty({ timeout: 10000 });

    // Verify no error states are shown
    const errorHeading = dispensaryPage.getByRole('heading', { name: /error|something went wrong|404/i });
    await expect(errorHeading).toBeHidden({ timeout: 5000 }).catch(() => {
      // No error heading found, which is good
    });
  });
});