
import { test, expect } from '@playwright/test';

test.describe('User Account & Dashboard', () => {

  test('account page renders after login', async ({ page }) => {
    // Login first
    await page.goto('/brand-login');
    await page.locator('button', { hasText: 'Dev Magic Login' }).click();
    await page.locator('div[role="menuitem"]', { hasText: 'Login as brand@bakedbot.ai' }).click();
  
    // Navigate to the account page
    await page.goto('/account');
  
    // Verify the main account card is visible
    await expect(page.locator('h2', { hasText: 'My Account' })).toBeVisible();
    
    // Verify the dashboard button is present
    await expect(page.getByRole('link', { name: 'Go to My Dashboard' })).toBeVisible();
  });

  test('favorite location flow', async ({ page }) => {
    // Use demo mode for predictable data
    await page.goto('/?demo=true');
    
    // Login first
    await page.goto('/brand-login');
    await page.locator('button', { hasText: 'Dev Magic Login' }).click();
    await page.locator('div[role="menuitem"]', { hasText: 'Login as brand@bakedbot.ai' }).click();
  
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

  test('review submission flow', async ({ page }) => {
    // 1. Log in as a user
    await page.goto('/customer-login');
    await page.locator('button:has-text("Dev Magic Login")').click();
    await page.locator('div[role="menuitem"]:has-text("Login as customer@bakedbot.ai")').click();
  
    // 2. Go to the review page
    await page.goto('/leave-a-review');
    await expect(page.locator('h1:has-text("Leave a Review")')).toBeVisible();
  
    // 3. Select a product
    await page.locator('button[role="combobox"]').click();
    await page.locator('div[role="option"]:has-text("Cosmic Caramels")').click();
  
    // 4. Set a rating (click the 4th star)
    await page.locator('.flex.items-center.gap-1 > svg').nth(3).click();
  
    // 5. Fill in the review text
    await page.locator('textarea[name="text"]').fill('This is a test review from an automated test. It was great!');
  
    // 6. Submit the form
    await page.locator('button:has-text("Submit Review")').click();
  
    // 7. Verify the success message
    await expect(page.locator('h1:has-text("Thank You!")')).toBeVisible();
  });

});
