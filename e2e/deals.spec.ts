import { test, expect } from '@playwright/test';

/**
 * Deals Page Tests
 * Tests the customer-facing deals browsing and bundle building experience
 */

test.describe('Deals Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to a dispensary's deals page
    await page.goto('/shop/dispensary-1/deals');
  });

  test('should display deals page with deals list', async ({ page }) => {
    // Check that page loads and displays deals
    await expect(page).toHaveTitle(/deals|bundles/i);
    
    // Should see dispensary header
    const header = page.locator('[data-testid="dispensary-header"]');
    await expect(header).toBeVisible();
    
    // Should see category navigation
    const categoryNav = page.locator('[data-testid="category-nav"]');
    await expect(categoryNav).toBeVisible();
  });

  test('should display featured deals prominently', async ({ page }) => {
    // Look for featured deal cards
    const featuredDeals = page.locator('[data-testid="deal-card"][data-featured="true"]');
    const count = await featuredDeals.count();
    
    if (count > 0) {
      // Featured deals should have badge
      const firstFeatured = featuredDeals.first();
      const badge = firstFeatured.locator('[data-testid="deal-badge"]');
      await expect(badge).toBeVisible();
    }
  });

  test('should display deal cards with price and savings info', async ({ page }) => {
    // Get the first deal card
    const dealCard = page.locator('[data-testid="deal-card"]').first();
    await expect(dealCard).toBeVisible();
    
    // Check for required deal info
    const dealName = dealCard.locator('[data-testid="deal-name"]');
    const dealPrice = dealCard.locator('[data-testid="deal-price"]');
    const dealSavings = dealCard.locator('[data-testid="deal-savings"]');
    
    await expect(dealName).toBeVisible();
    await expect(dealPrice).toBeVisible();
    await expect(dealSavings).toBeVisible();
  });

  test('should open bundle builder when clicking on a deal', async ({ page }) => {
    // Click on the first deal card
    const dealCard = page.locator('[data-testid="deal-card"]').first();
    const builderButton = dealCard.locator('[data-testid="build-bundle-button"]');
    
    await builderButton.click();
    
    // Should show bundle builder dialog
    const builderDialog = page.locator('[data-testid="bundle-builder-dialog"]');
    await expect(builderDialog).toBeVisible();
  });

  test('should display floating cart button', async ({ page }) => {
    const cartButton = page.locator('[data-testid="floating-cart-button"]');
    await expect(cartButton).toBeVisible();
  });

  test('should filter deals by category', async ({ page }) => {
    const categoryNav = page.locator('[data-testid="category-nav"]');
    const categoryButtons = categoryNav.locator('[data-testid^="category-button-"]');
    
    const count = await categoryButtons.count();
    if (count > 1) {
      // Click on second category
      const secondCategory = categoryButtons.nth(1);
      await secondCategory.click();
      
      // Deals should update based on category
      const deals = page.locator('[data-testid="deal-card"]');
      await expect(deals.first()).toBeVisible();
    }
  });

  test('should handle empty deals state gracefully', async ({ page }) => {
    // If no deals, should show empty state
    const deals = page.locator('[data-testid="deal-card"]');
    const dealCount = await deals.count();
    
    if (dealCount === 0) {
      const emptyState = page.locator('[data-testid="empty-deals-state"]');
      await expect(emptyState).toBeVisible();
    }
  });
});
