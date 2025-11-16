
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
    // The DashboardLayout will handle the redirection based on the user's role.
    await page.goto('/dashboard');
    
    // Verify dashboard loads to the correct page for a dispensary user
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

  test('user can log out successfully', async ({ page }) => {
    // 1. Log in first
    await page.goto('/brand-login');
    await page.getByTestId('dev-login-button').click();
    await page.getByTestId('dev-login-item-brand@bakedbot.ai').click();

    // 2. Go to the account page
    await page.goto('/account');
    await expect(page.getByRole('heading', { name: 'My Account' })).toBeVisible();

    // 3. Click the logout button
    await page.getByRole('button', { name: 'Sign Out' }).click();

    // 4. Assert that the "Signed Out" toast appears
    await expect(page.getByText('Signed Out')).toBeVisible();

    // 5. Assert that the user is redirected to the homepage
    // The logout logic now does a full page reload to '/' which is the brand homepage.
    await page.waitForURL('**/');
    await expect(page.getByRole('heading', { name: /Keep the customer/ })).toBeVisible();
    
    // 6. Assert that trying to access a protected route redirects to login
    await page.goto('/account');
    await expect(page).not.toHaveURL('/account');
    await expect(page.getByRole('heading', { name: 'Brand Portal' })).toBeVisible();
  });
});
