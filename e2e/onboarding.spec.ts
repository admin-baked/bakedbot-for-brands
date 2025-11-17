
import { test, expect } from '@playwright/test';

test.describe('Onboarding Flow', () => {

  test('new user successfully completes onboarding and is redirected', async ({ page }) => {
    // 1. Start at the login page for a new customer
    await page.goto('/customer-login');
    
    // 2. Use the dev login to simulate a new user which triggers onboarding
    await page.getByTestId('dev-login-button').click();
    await page.getByTestId('dev-login-item-onboarding@bakedbot.ai').click({ force: true });
    
    // Playwright's `page.goto` will wait for the page to load, so we should be on the onboarding page
    await expect(page).toHaveURL('/onboarding');
    await expect(page.getByText("Welcome to BakedBot!")).toBeVisible();

    // 3. Step 1: Select a role (Brand Owner)
    await expect(page.getByTestId('onboarding-step-role')).toBeVisible();
    await page.getByRole('button', { name: 'Brand Owner / Manager' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();

    // 4. Step 2: The next step is now the "products" / finish step for brand owners
    await expect(page.getByTestId('onboarding-step-products')).toBeVisible();
    await page.getByRole('button', { name: 'Finish & Go to Dashboard' }).click();
    
    // 5. Final Assertion: Verify redirection to the dashboard
    // The user should now be at the main dashboard and NOT the onboarding page.
    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByText("Welcome to BakedBot!")).not.toBeVisible();
  });

});
