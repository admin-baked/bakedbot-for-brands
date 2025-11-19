
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
  });

  test('brand login flow via dev login', async ({ page }) => {
    await page.goto('/brand-login');
    
    // The DevLoginButton is now the primary mechanism on this page
    await expect(page.getByText('Dev Login (local only)')).toBeVisible();
    await page.getByTestId('dev-login-button').click();
    await page.getByTestId('dev-login-item-brand@bakedbot.ai').click();

    // Navigate to the dashboard page to verify login
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('user can log out successfully', async ({ page }) => {
    // 1. Log in first using the dev login
    await page.goto('/brand-login');
    await page.getByTestId('dev-login-button').click();
    await page.getByTestId('dev-login-item-brand@bakedbot.ai').click();

    // 2. Go to the account page to ensure login state is active
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    // 3. Click the logout button from the user dropdown in the main header
    await page.getByRole('button', { name: /My Account/ }).click();
    await page.getByRole('menuitem', { name: 'Sign Out' }).click();

    // 4. Assert that the "Signed Out" toast appears
    await expect(page.getByText('Signed Out')).toBeVisible();

    // 5. Assert that the user is redirected to the homepage
    await page.waitForURL('**/');
    await expect(page.getByRole('heading', { name: /Keep the customer/ })).toBeVisible();
    
    // 6. Assert that trying to access a protected route redirects to login
    await page.goto('/dashboard');
    await expect(page).not.toHaveURL('/dashboard');
    // After logout, it should redirect to the brand login page.
    await expect(page.getByRole('heading', { name: 'Brand Login' })).toBeVisible();
  });
});
