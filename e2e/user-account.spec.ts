
import { test, expect } from '@playwright/test';

test.describe('User Account & Dashboard', () => {

  test('account page renders after login', async ({ page }) => {
    // Login first
    await page.goto('/brand-login');
    await page.getByTestId('dev-login-button').click();
    await page.getByTestId('dev-login-item-brand@bakedbot.ai').click();
  
    // Navigate to the account page
    await page.goto('/account');
  
    // Verify the main account card is visible
    await expect(page.getByRole('heading', { name: 'My Account' })).toBeVisible();
    
    // Verify the dashboard button is present
    await expect(page.getByRole('link', { name: 'Go to My Dashboard' })).toBeVisible();
  });

  test('favorite location flow', async ({ page }) => {
    // 1. Log in as a user that can have favorites
    await page.goto('/customer-login');
    await page.getByTestId('dev-login-button').click();
    await page.getByTestId('dev-login-item-customer@bakedbot.ai').click();
    
    // 2. Navigate to the user account dashboard
    await page.goto('/account/dashboard');
  
    // 3. Ensure we start in the "Set Favorite" state
    await expect(page.getByText('Set Your Favorite Location')).toBeVisible();
  
    // 4. Select a location from the dropdown
    await page.getByRole('button', { name: 'Choose a location...' }).click();
    await page.getByLabel('The Green Spot').click(); // Using getByLabel to select the specific option
  
    // 5. Verify the new favorite is displayed
    await expect(page.getByText('Your Favorite')).toBeVisible();
    await expect(page.getByText('The Green Spot')).toBeVisible();
  
    // 6. Click the 'Change' button
    await page.getByRole('button', { name: 'Change' }).click();
  
    // 7. Verify it goes back to the initial selection state
    await expect(page.getByText('Set Your Favorite Location')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Choose a location...' })).toBeVisible();
  });

  test('review submission flow', async ({ page }) => {
    // 1. Log in as a user
    await page.goto('/customer-login');
    await page.getByTestId('dev-login-button').click();
    await page.getByTestId('dev-login-item-customer@bakedbot.ai').click();
  
    // 2. Go to the review page
    await page.goto('/leave-a-review');
    await expect(page.getByRole('heading', { name: 'Leave a Review' })).toBeVisible();
  
    // 3. Select a product
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: 'Cosmic Caramels' }).click();
  
    // 4. Set a rating (click the 4th star)
    await page.locator('[data-testid="star-rating"] > svg').nth(3).click();
  
    // 5. Fill in the review text
    await page.locator('textarea[name="text"]').fill('This is a test review from an automated test. It was great!');
  
    // 6. Submit the form
    await page.getByRole('button', { name: 'Submit Review' }).click();
  
    // 7. Verify the success message
    await expect(page.getByRole('heading', { name: 'Thank You!' })).toBeVisible();
  });

});
