
import { test, expect } from '@playwright/test';

test.describe('Authentication Flows', () => {
  test('dispensary login flow', async ({ page }) => {
    await page.goto('/dispensary-login');

    // Fill in the email and click the magic link button
    await page.fill('input[name="email"]', 'dispensary@bakedbot.ai');
    await page.locator('button', { hasText: 'Send Magic Link' }).click();

    // Expect the "Check Your Inbox!" card to be visible
    await expect(page.locator('h2', { hasText: 'Check Your Inbox!' })).toBeVisible();

    // Expect the email address to be displayed
    await expect(page.locator('strong', { hasText: 'dispensary@bakedbot.ai' })).toBeVisible();
    
    // Now, verify we can get to the dispensary order dashboard (simulating successful login)
    await page.goto('/dashboard/orders');
    
    // Verify dashboard loads
    await expect(page.locator('h1', { hasText: 'Customer Orders' })).toBeVisible();
  });

  test('brand login flow', async ({ page }) => {
    await page.goto('/brand-login');
    await page.locator('button', { hasText: 'Dev Magic Login' }).click();
    await page.locator('div[role="menuitem"]', { hasText: 'Login as brand@bakedbot.ai' }).click();

    // Navigate to the account page to verify login
    await page.goto('/account');
    await expect(page.locator('h2', { hasText: 'My Account' })).toBeVisible();
  });
});
