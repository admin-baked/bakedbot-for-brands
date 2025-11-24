import { test, expect } from '@playwright/test';

test('dashboard stub loads after onboarding', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(
    page.getByText(/BakedBot Operator Console/i),
  ).toBeVisible();
});
