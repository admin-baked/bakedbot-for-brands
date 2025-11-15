
import { test, expect } from '@playwright/test';

test.describe('Core Application Functionality', () => {

  test('has title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/BakedBot - Headless Cannabis Commerce AI Agent/);
  });

  test('get started link', async ({ page }) => {
    await page.goto('/');
    const heading = page.locator('h1', { hasText: 'Find Your Bliss' });
    await expect(heading).toBeVisible();
  });

  test('demo mode toggle', async ({ page }) => {
    await page.goto('/');

    // 1. Initial state check (Live data: Cosmic Caramels)
    await expect(page.locator('h3', { hasText: 'Cosmic Caramels' })).toBeVisible();
    await expect(page.locator('h3', { hasText: 'OG Galaxy' })).not.toBeVisible();

    // 2. Find and click the demo mode switch
    const demoModeSwitch = page.locator('#demo-mode-switch');
    await demoModeSwitch.click();

    // 3. Verify demo product is now visible
    await expect(page.locator('h3', { hasText: 'OG Galaxy' })).toBeVisible();

    // 4. Verify live product is now hidden
    await expect(page.locator('h3', { hasText: 'Cosmic Caramels' })).not.toBeVisible();

    // 5. Toggle back to live mode
    await demoModeSwitch.click();

    // 6. Verify live data is back
    await expect(page.locator('h3', { hasText: 'Cosmic Caramels' })).toBeVisible();
    await expect(page.locator('h3', { hasText: 'OG Galaxy' })).not.toBeVisible();
  });

});
