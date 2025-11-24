import { test, expect } from '@playwright/test';

test('brand onboarding basic flow', async ({ page }) => {
  await page.goto('/onboarding');

  // Step 1: choose Brand
  await page.getByRole('button', { name: /brand/i }).click();

  // Step 2: we should see brand search or review
  await expect(
    page.getByText(/find your brand/i).or(page.getByText(/review & finish/i)),
  ).toBeVisible();
});
