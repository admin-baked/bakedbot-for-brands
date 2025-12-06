import { test, expect } from '@playwright/test';

test('Product listing shows seeded demo product', async ({ page }) => {
  // Ensure seed data exists (run scripts/seed-test-data.ts prior to running this test in CI or local)
  await page.goto('/menu/default');
  // Expect at least one product card to be visible
  const card = page.getByTestId(/product-card|product-card-demo/i).first();
  await expect(card).toBeVisible({ timeout: 10000 });
});
