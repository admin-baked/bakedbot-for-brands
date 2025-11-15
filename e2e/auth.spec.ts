import { test, expect } from '@playwright/test';

test.describe('Authentication Flows', () => {
  test('dispensary login flow', async ({ page }) => {
    await page.goto('/dispensary-login');

    // Fill in the email and click the magic link button
    await page.fill('input[name="email"]', 'dispensary@bakedbot.ai');
    await page.getByRole('button', { name: 'Send Magic Link' }).click();

    // Expect the "Check Your Inbox!" card to be visible
    const magicLinkCard = page.getByTestId('magic-link-sent-card');
    await expect(magicLinkCard).toBeVisible();
    await expect(magicLinkCard.locator('h2')).toHaveText('Check Your Inbox!');
    await expect(magicLinkCard.locator('strong')).toHaveText('dispensary@bakedbot.ai');
    
    // Now, verify we can get to the dispensary order dashboard (simulating successful login)
    await page.goto('/dashboard/orders');
    
    // Verify dashboard loads
    await expect(page.getByRole('heading', { name: 'Customer Orders' })).toBeVisible();
  });

  test('brand login flow', async ({ page }) => {
    await page.goto('/brand-login');
    await page.getByTestId('dev-login-button').click();
    await page.getByTestId('dev-login-item-brand@bakedbot.ai').click();

    // Navigate to the account page to verify login
    await page.goto('/account');
    await expect(page.getByRole('heading', { name: 'My Account' })).toBeVisible();
  });
});
