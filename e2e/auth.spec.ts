
import { test, expect } from '@playwright/test';

test.describe('Authentication Flows', () => {

  test('brand login with dev login button', async ({ page }) => {
    await page.goto('/brand-login');
    
    // The DevLoginButton is the primary mechanism for dev login now
    await page.getByTestId('dev-login-button').click();
    await page.getByTestId('dev-login-item-brand@bakedbot.ai').click();

    // After login, it should redirect to the dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('user can log out successfully', async ({ page }) => {
    // 1. Log in first using the dev login
    await page.goto('/brand-login');
    await page.getByTestId('dev-login-button').click();
    await page.getByTestId('dev-login-item-brand@bakedbot.ai').click();

    // 2. Go to the dashboard to ensure login state is active
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
