
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


test('favorite location flow', async ({ page }) => {
  // Use demo mode for predictable data
  await page.goto('/?demo=true');
  
  // Login first
  await page.goto('/brand-login');
  await page.locator('button', { hasText: 'Dev Magic Login' }).click();
  await page.locator('div[role="menuitem"]', { hasText: 'Login as martez@bakedbot.ai' }).click();

  // Navigate to the dashboard
  await page.goto('/account/dashboard');

  // Ensure we start in the "Set Favorite" state
  await expect(page.getByText('Set Your Favorite Location')).toBeVisible();

  // Select a location from the dropdown
  await page.getByRole('button', { name: 'Choose a location...' }).click();
  await page.getByLabel('The Green Spot').click();

  // Verify the new favorite is displayed
  await expect(page.getByText('Your Favorite')).toBeVisible();
  await expect(page.getByText('The Green Spot')).toBeVisible();

  // Click the 'Change' button
  await page.getByRole('button', { name: 'Change' }).click();

  // Verify it goes back to the initial selection state
  await expect(page.getByText('Set Your Favorite Location')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Choose a location...' })).toBeVisible();
});
