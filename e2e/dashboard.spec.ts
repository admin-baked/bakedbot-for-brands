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
