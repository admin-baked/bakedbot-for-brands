const { test, expect } = require('@playwright/test');

/**
 * Example test suite for BakedBot
 * This demonstrates basic Playwright usage
 */

test.describe('BakedBot Homepage', () => {
  test('should load the homepage', async ({ page }) => {
    // Navigate to the homepage
    await page.goto('/');

    // Wait for the page to be loaded
    await page.waitForLoadState('networkidle');

    // Take a screenshot for documentation
    await page.screenshot({ path: 'tests/e2e/screenshots/homepage.png', fullPage: true });

    // Check if the page loaded successfully
    expect(page.url()).toBe('http://localhost:3000/');
  });

  test('should have a title', async ({ page }) => {
    await page.goto('/');

    // Check if the page has a title
    await expect(page).toHaveTitle(/BakedBot/i);
  });
});

test.describe('Navigation', () => {
  test('should navigate between pages', async ({ page }) => {
    await page.goto('/');

    // Example: Click on a navigation link (adjust selector based on actual UI)
    // await page.click('nav a:has-text("Dashboard")');
    // await expect(page).toHaveURL(/dashboard/);
  });
});

// Add more test suites for:
// - User authentication
// - Onboarding flow
// - Dashboard features
// - Agent interactions
// - Form submissions
