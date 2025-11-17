
import { test, expect } from '@playwright/test';

test.describe('Core Application Functionality', () => {

  test('has title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/BakedBot - Headless Cannabis Commerce AI Agent/);
  });

  test('marketing homepage has correct heading', async ({ page }) => {
    await page.goto('/');
    const heading = page.getByRole('heading', { name: /Keep the customer in your brand funnel/i });
    await expect(heading).toBeVisible();
  });

});
