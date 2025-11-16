
import { test, expect } from '@playwright/test';

test.describe('Onboarding Flow', () => {

  test('new user successfully completes onboarding and is redirected', async ({ page }) => {
    // 1. Start at the login page for a new customer
    await page.goto('/customer-login');
    
    // 2. Use the dev login to simulate a new user
    await page.getByTestId('dev-login-button').click();
    // Use a unique email to ensure it's a new user
    const userEmail = `onboarding-test-${Date.now()}@bakedbot.ai`;
    await page.getByTestId('dev-login-item-customer@bakedbot.ai').click({ force: true });
    
    // Playwright's `page.goto` will wait for the page to load, so we should be on the onboarding page
    await expect(page).toHaveURL('/onboarding');
    await expect(page.getByText("Welcome to BakedBot!")).toBeVisible();

    // 3. Step 1: Select a role (Brand Owner)
    await expect(page.getByTestId('onboarding-step-role')).toBeVisible();
    await page.getByLabel('Brand Owner / Manager').click();
    await page.getByRole('button', { name: 'Continue' }).click();

    // 4. Step 2: Link a location
    await expect(page.getByTestId('onboarding-step-location')).toBeVisible();
    await page.getByRole('button', { name: 'Choose your location...' }).click();
    await page.getByLabel('The Green Spot', { exact: true }).click();
    await page.getByRole('button', { name: 'Continue' }).click();

    // 5. Step 3: Final confirmation
    await expect(page.getByTestId('onboarding-step-products')).toBeVisible();
    await page.getByRole('button', { name: 'Finish & Go to Dashboard' }).click();
    
    // 6. Final Assertion: Verify redirection to the dashboard
    // The user should now be at the main dashboard and NOT the onboarding page.
    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByText("Welcome to BakedBot!")).not.toBeVisible();
  });

});
