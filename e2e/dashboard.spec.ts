import { test, expect } from '@playwright/test';

test('dashboard stub loads after onboarding', async ({ page }) => {
  // Login first
  await page.goto('/brand-login');
  await page.getByTestId('dev-login-button').click();
  await page.getByTestId('dev-login-item-brand@bakedbot.ai').click();
  await page.waitForURL('/dashboard');

  await page.goto('/dashboard');
  await expect(
    page.getByText(/BakedBot Operator Console/i),
  ).toBeVisible();
});

test('CEO dashboard loads without crashing (regression test)', async ({ page }) => {
  // 1. Simulate Super Admin Login
  await page.addInitScript(() => {
    window.localStorage.setItem('bakedbot_superadmin_session', JSON.stringify({
      email: 'martez@bakedbot.ai',
      timestamp: Date.now(),
    }));
  });

  // 2. We need to be authenticated as a user to pass withAuth, even if we have super admin session.
  // The super admin check in withAuth happens BEFORE standard role checks, but we still need a session cookie.
  await page.goto('/brand-login');
  await page.getByTestId('dev-login-button').click();
  await page.getByTestId('dev-login-item-brand@bakedbot.ai').click();
  await page.waitForURL('/dashboard');

  // 3. Navigate to CEO Dashboard
  await page.goto('/dashboard/ceo');

  // 4. Verify content loads (ClientOnly wrapper working)
  // Check for the "AI Agent Embed Code Generator" text which is inside the tabs
  await expect(page.getByText('AI Agent Embed Code Generator')).toBeVisible();

  // Also check for the specific tab trigger to ensure tabs rendered
  await expect(page.locator('button[value="ai-agent-embed"]')).toBeVisible();
});
