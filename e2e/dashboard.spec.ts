
import { test, expect } from '@playwright/test';

test.describe('Dashboard Functionality', () => {
  
  test.beforeEach(async ({ page }) => {
    // Log in as the brand manager persona before each test
    await page.goto('/brand-login');
    await page.getByTestId('dev-login-button').click();
    await page.getByTestId('dev-login-item-brand@bakedbot.ai').click();
    // Ensure we are on the dashboard before each test runs
    await expect(page).toHaveURL('/dashboard');
  });

  test('should display the main dashboard welcome screen and navigation', async ({ page }) => {
    // Verify the main welcome heading is visible
    await expect(page.getByRole('heading', { name: 'Welcome to your Dashboard' })).toBeVisible();

    // Verify the quick link cards are present
    await expect(page.getByRole('heading', { name: 'Manage Products' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'AI Content Suite' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Brand Settings' })).toBeVisible();
  });

  test('should navigate to different dashboard sections', async ({ page }) => {
    // Navigate to Analytics
    await page.getByRole('link', { name: 'Analytics' }).click();
    await expect(page).toHaveURL('/dashboard/analytics');
    await expect(page.getByRole('heading', { name: 'Analytics' })).toBeVisible();

    // Navigate to Products
    await page.getByRole('link', { name: 'Products' }).click();
    await expect(page).toHaveURL('/dashboard/products');
    await expect(page.getByRole('heading', { name: 'Products' })).toBeVisible();

    // Navigate to Content AI
    await page.getByRole('link', { name: 'Content AI' }).click();
    await expect(page).toHaveURL('/dashboard/content');
    await expect(page.getByRole('heading', { name: 'Content AI' })).toBeVisible();
  });

});
