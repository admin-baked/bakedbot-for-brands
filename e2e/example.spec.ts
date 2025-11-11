
import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('/');

  // Expect a title to contain a substring.
  await expect(page).toHaveTitle(/BakedBot - Headless Cannabis Commerce AI Agent/);
});

test('get started link', async ({ page }) => {
  await page.goto('/');

  // Find the h1 element with the text "Find Your Bliss"
  const heading = page.locator('h1', { hasText: 'Find Your Bliss' });

  // Expect the h1 element to be visible.
  await expect(heading).toBeVisible();
});

test('martez login flow', async ({ page }) => {
  await page.goto('/brand-login');

  // Click the "Dev Magic Login" dropdown trigger
  await page.locator('button', { hasText: 'Dev Magic Login' }).click();

  // Click the menu item for martez@bakedbot.ai
  await page.locator('div[role="menuitem"]', { hasText: 'Login as martez@bakedbot.ai' }).click();

  // Expect the "Check Your Inbox!" card to be visible
  await expect(page.locator('h2', { hasText: 'Check Your Inbox!' })).toBeVisible();

  // Expect the email address to be displayed
  await expect(page.locator('strong', { hasText: 'martez@bakedbot.ai' })).toBeVisible();
});

test('rishabh login flow', async ({ page }) => {
  await page.goto('/brand-login');

  // Click the "Dev Magic Login" dropdown trigger
  await page.locator('button', { hasText: 'Dev Magic Login' }).click();

  // Click the menu item for rishabh@bakedbot.ai
  await page.locator('div[role="menuitem"]', { hasText: 'Login as rishabh@bakedbot.ai' }).click();

  // Expect the "Check Your Inbox!" card to be visible
  await expect(page.locator('h2', { hasText: 'Check Your Inbox!' })).toBeVisible();

  // Expect the email address to be displayed
  await expect(page.locator('strong', { hasText: 'rishabh@bakedbot.ai' })).toBeVisible();
});
