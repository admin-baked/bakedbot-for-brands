import { test, expect } from '@playwright/test';

/**
 * Bundle Builder Tests
 * Tests the interactive bundle/deal building experience
 */

test.describe('Bundle Builder', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to a deals page to access bundle builder
    await page.goto('/shop/dispensary-1/deals');
  });

  test('should open bundle builder dialog', async ({ page }) => {
    // Click on first available deal
    const dealCard = page.locator('[data-testid="deal-card"]').first();
    const builderButton = dealCard.locator('[data-testid="build-bundle-button"]');
    
    await builderButton.click();
    
    // Verify dialog opens
    const dialog = page.locator('[data-testid="bundle-builder-dialog"]');
    await expect(dialog).toBeVisible();
    
    // Should show dialog title
    const title = dialog.locator('[data-testid="bundle-builder-title"]');
    await expect(title).toBeVisible();
  });

  test('should display product slots to fill', async ({ page }) => {
    const dealCard = page.locator('[data-testid="deal-card"]').first();
    const builderButton = dealCard.locator('[data-testid="build-bundle-button"]');
    await builderButton.click();
    
    // Should show product selection slots
    const slots = page.locator('[data-testid="bundle-slot"]');
    await expect(slots.first()).toBeVisible();
    
    const slotCount = await slots.count();
    expect(slotCount).toBeGreaterThan(0);
  });

  test('should display eligible products for selection', async ({ page }) => {
    const dealCard = page.locator('[data-testid="deal-card"]').first();
    const builderButton = dealCard.locator('[data-testid="build-bundle-button"]');
    await builderButton.click();
    
    // Should show list of eligible products
    const productList = page.locator('[data-testid="eligible-products-list"]');
    await expect(productList).toBeVisible();
    
    const products = productList.locator('[data-testid="eligible-product-item"]');
    const count = await products.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should select product and populate slot', async ({ page }) => {
    const dealCard = page.locator('[data-testid="deal-card"]').first();
    const builderButton = dealCard.locator('[data-testid="build-bundle-button"]');
    await builderButton.click();
    
    // Click on first eligible product
    const firstProduct = page.locator('[data-testid="eligible-product-item"]').first();
    await firstProduct.click();
    
    // Verify slot is populated
    const filledSlot = page.locator('[data-testid="bundle-slot"][data-filled="true"]');
    await expect(filledSlot).toBeVisible();
  });

  test('should display product info when selected', async ({ page }) => {
    const dealCard = page.locator('[data-testid="deal-card"]').first();
    const builderButton = dealCard.locator('[data-testid="build-bundle-button"]');
    await builderButton.click();
    
    // Select first product
    const firstProduct = page.locator('[data-testid="eligible-product-item"]').first();
    const productName = firstProduct.locator('[data-testid="product-name"]');
    const originalProductName = await productName.textContent();
    
    await firstProduct.click();
    
    // Verify product appears in selected area
    const selectedProduct = page.locator('[data-testid="selected-product"]').first();
    await expect(selectedProduct).toContainText(originalProductName || '');
  });

  test('should allow removing selected products', async ({ page }) => {
    const dealCard = page.locator('[data-testid="deal-card"]').first();
    const builderButton = dealCard.locator('[data-testid="build-bundle-button"]');
    await builderButton.click();
    
    // Select a product
    const firstProduct = page.locator('[data-testid="eligible-product-item"]').first();
    await firstProduct.click();
    
    // Remove the product
    const removeButton = page.locator('[data-testid="remove-selected-product"]').first();
    await removeButton.click();
    
    // Slot should be empty again
    const emptySlot = page.locator('[data-testid="bundle-slot"][data-filled="false"]');
    await expect(emptySlot).toBeVisible();
  });

  test('should show completion status and total price', async ({ page }) => {
    const dealCard = page.locator('[data-testid="deal-card"]').first();
    const builderButton = dealCard.locator('[data-testid="build-bundle-button"]');
    await builderButton.click();
    
    // Should display bundle details
    const bundleTotal = page.locator('[data-testid="bundle-total-price"]');
    await expect(bundleTotal).toBeVisible();
    
    const completionStatus = page.locator('[data-testid="bundle-completion-status"]');
    await expect(completionStatus).toBeVisible();
  });

  test('should disable add to cart until bundle is complete', async ({ page }) => {
    const dealCard = page.locator('[data-testid="deal-card"]').first();
    const builderButton = dealCard.locator('[data-testid="build-bundle-button"]');
    await builderButton.click();
    
    // Add to cart button should be disabled initially
    const addToCartButton = page.locator('[data-testid="add-bundle-to-cart"]');
    await expect(addToCartButton).toBeDisabled();
  });

  test('should enable add to cart when bundle is complete', async ({ page }) => {
    const dealCard = page.locator('[data-testid="deal-card"]').first();
    const builderButton = dealCard.locator('[data-testid="build-bundle-button"]');
    await builderButton.click();
    
    // Get number of slots to fill
    const slots = page.locator('[data-testid="bundle-slot"]');
    const slotCount = await slots.count();
    
    // Fill all slots
    for (let i = 0; i < slotCount; i++) {
      const product = page.locator('[data-testid="eligible-product-item"]').nth(i);
      await product.click();
    }
    
    // Add to cart button should now be enabled
    const addToCartButton = page.locator('[data-testid="add-bundle-to-cart"]');
    await expect(addToCartButton).toBeEnabled();
  });

  test('should add complete bundle to cart', async ({ page }) => {
    const dealCard = page.locator('[data-testid="deal-card"]').first();
    const builderButton = dealCard.locator('[data-testid="build-bundle-button"]');
    await builderButton.click();
    
    // Get number of slots and fill them all
    const slots = page.locator('[data-testid="bundle-slot"]');
    const slotCount = await slots.count();
    
    for (let i = 0; i < slotCount; i++) {
      const product = page.locator('[data-testid="eligible-product-item"]').nth(i);
      await product.click();
    }
    
    // Click add to cart
    const addToCartButton = page.locator('[data-testid="add-bundle-to-cart"]');
    await addToCartButton.click();
    
    // Dialog should close
    const dialog = page.locator('[data-testid="bundle-builder-dialog"]');
    await expect(dialog).not.toBeVisible();
  });

  test('should close bundle builder on cancel', async ({ page }) => {
    const dealCard = page.locator('[data-testid="deal-card"]').first();
    const builderButton = dealCard.locator('[data-testid="build-bundle-button"]');
    await builderButton.click();
    
    // Click cancel button
    const cancelButton = page.locator('[data-testid="cancel-bundle-builder"]');
    await cancelButton.click();
    
    // Dialog should close
    const dialog = page.locator('[data-testid="bundle-builder-dialog"]');
    await expect(dialog).not.toBeVisible();
  });
});
