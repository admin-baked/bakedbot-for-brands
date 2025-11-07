import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('/');

  // Expect a title to contain a substring.
  await expect(page).toHaveTitle(/BakedBot AI Assistant/);
});

test('get started link', async ({ page }) => {
  await page.goto('/');

  // Find the h1 element with the text "Find Your Bliss"
  const heading = page.locator('h1', { hasText: 'Find Your Bliss' });

  // Expect the h1 element to be visible.
  await expect(heading).toBeVisible();
});

test('brand login flow', async ({ page }) => {
  await page.goto('/brand-login');

  // Click the "Dev Magic Button" for martez@bakedbot.ai
  await page.locator('button', { hasText: 'Dev Magic Button (martez@bakedbot.ai)' }).click();

  // Expect the "Check Your Inbox!" card to be visible
  await expect(page.locator('h2', { hasText: 'Check Your Inbox!' })).toBeVisible();

  // Expect the email address to be displayed
  await expect(page.locator('strong', { hasText: 'martez@bakedbot.ai' })).toBeVisible();
});
