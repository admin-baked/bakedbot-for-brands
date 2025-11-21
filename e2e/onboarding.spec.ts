
import { test, expect } from '@playwright/test';

test.describe('Onboarding Flow', () => {

  test('new user successfully completes onboarding and is redirected', async ({ page }) => {
    // 1. Start at the homepage
    await page.goto('/');
    
    // 2. Click the 'Get Started' button to navigate to onboarding
    await page.getByRole('link', { name: 'Get started free' }).click();
    await expect(page).toHaveURL('/onboarding');
    
    // 3. Use the dev login to simulate a new user which is required for the onboarding flow
    await page.getByTestId('dev-login-button').click();
    await page.getByTestId('dev-login-item-onboarding@bakedbot.ai').click({ force: true });
    
    // The page should now be ready for interaction
    await expect(page.getByText("Welcome to BakedBot!")).toBeVisible();

    // 4. Step 1: Select a role (Brand Owner)
    await expect(page.getByTestId('onboarding-step-role')).toBeVisible();
    await page.getByRole('button', { name: 'Brand Owner / Manager' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();

    // 5. Step 2: The next step is now the "products" / finish step for brand owners
    await expect(page.getByTestId('onboarding-step-products')).toBeVisible();
    // This is the final submission step
    await page.getByRole('button', { name: 'Finish & Go to Dashboard' }).click();
    
    // 6. Assert that the "Done" step is shown with a clear CTA
    await expect(page.getByText('Setup Complete!')).toBeVisible();
    await page.getByRole('button', { name: 'Go to Dashboard' }).click();

    // 7. Final Assertion: Verify redirection to the dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByText("Welcome to BakedBot!")).not.toBeVisible();
  });

});
