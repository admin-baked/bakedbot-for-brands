import { test, expect } from '@playwright/test';

test('demo menu route works', async ({ page }) => {
  await page.goto('/menu/default');
  await expect(
    page.getByRole('heading', { name: /demo menu/i }),
  ).toBeVisible();
});
