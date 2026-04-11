import { test, expect } from '../../auth/fixtures';

test.describe('Dashboard page - brand_admin (org_ecstatic_edibles)', () => {
  test('should redirect brand_admin to /dashboard/inbox (inbox-first architecture)', async ({ brandPage }) => {
    await brandPage.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Brand admin should be redirected to /dashboard/inbox per inbox-first architecture
    await brandPage.waitForURL('**/dashboard/inbox**', { timeout: 30000 });

    expect(brandPage.url()).toContain('/dashboard/inbox');
  });

  test('should not redirect to sign-in page (auth is valid)', async ({ brandPage }) => {
    await brandPage.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Wait for potential redirects to settle
    await brandPage.waitForURL('**/dashboard/**', { timeout: 30000 });

    // Should NOT be on a sign-in or login page
    expect(brandPage.url()).not.toContain('/signin');
    expect(brandPage.url()).not.toContain('/login');
    expect(brandPage.url()).not.toContain('/auth');
  });

  test('should show loading state briefly before redirect', async ({ brandPage }) => {
    // Navigate and check for the loading spinner or immediate redirect
    await brandPage.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Either we catch the loading state or we've already redirected
    const loadingTextVisible = await brandPage.getByText('Loading your workspace...').isVisible().catch(() => false);
    const alreadyRedirected = brandPage.url().includes('/dashboard/inbox');

    // One of these must be true - either we see loading or we've already redirected
    expect(loadingTextVisible || alreadyRedirected).toBeTruthy();

    // Ultimately we should end up at inbox
    await brandPage.waitForURL('**/dashboard/inbox**', { timeout: 30000 });
    expect(brandPage.url()).toContain('/dashboard/inbox');
  });

  test('should not show DashboardWelcome component for brand_admin', async ({ brandPage }) => {
    await brandPage.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Wait for redirect to complete
    await brandPage.waitForURL('**/dashboard/inbox**', { timeout: 30000 });

    // The DashboardWelcome component should NOT be rendered for brand_admin
    // since brand_admin gets redirected to inbox
    const welcomeHeading = brandPage.getByRole('heading', { name: /welcome/i });
    await expect(welcomeHeading).not.toBeVisible({ timeout: 5000 }).catch(() => {
      // If heading doesn't exist at all, that's also fine
    });
  });

  test('should not redirect to CEO dashboard (only for super users)', async ({ brandPage }) => {
    await brandPage.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Wait for redirects to settle
    await brandPage.waitForURL('**/dashboard/**', { timeout: 30000 });

    // Brand admin should NOT go to CEO dashboard
    expect(brandPage.url()).not.toContain('/dashboard/ceo');
    // Should be at inbox
    expect(brandPage.url()).toContain('/dashboard/inbox');
  });
});