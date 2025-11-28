/**
 * E2E Test: Checkout Flow
 * Tests the complete checkout process from cart to order confirmation
 */

import { test, expect } from '@playwright/test';

test.describe('Checkout Flow', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to shop page
        await page.goto('/shop/1'); // Using test dispensary ID
    });

    test('should complete checkout with cash payment', async ({ page }) => {
        // Add item to cart
        await page.locator('[data-testid="add-to-cart"]').first().click();
        await expect(page.locator('[data-testid="cart-count"]')).toContainText('1');

        // Go to checkout
        await page.click('[data-testid="view-cart"]');
        await page.click('[data-testid="checkout-button"]');

        // Verify age gate (if not already verified)
        const ageGate = page.locator('text=Age Verification');
        if (await ageGate.isVisible()) {
            await page.fill('input[placeholder="MM"]', '01');
            await page.fill('input[placeholder="DD"]', '01');
            await page.fill('input[placeholder="YYYY"]', '1990');
            await page.click('button:has-text("Verify Age")');
        }

        // Fill customer details
        await page.fill('input[name="name"]', 'Test Customer');
        await page.fill('input[name="email"]', 'test@example.com');
        await page.fill('input[name="phone"]', '5551234567');
        await page.click('button:has-text("Continue to Payment")');

        // Select cash payment
        await page.click('input[value="cash"]');
        await page.click('button:has-text("Place Order")');

        // Verify order confirmation
        await expect(page).toHaveURL(/\/order-confirmation\/.+/);
        await expect(page.locator('h1')).toContainText('Order Confirmed');
    });

    test('should enforce purchase limits', async ({ page }) => {
        // This test would add items exceeding state limits
        // and verify that checkout is blocked
        // Implementation depends on cart UI structure
    });

    test('should require age verification', async ({ page }) => {
        // Clear age verification
        await page.evaluate(() => localStorage.removeItem('age_verified'));

        // Try to checkout
        await page.locator('[data-testid="add-to-cart"]').first().click();
        await page.click('[data-testid="checkout-button"]');

        // Should see age gate
        await expect(page.locator('text=Age Verification')).toBeVisible();
    });
});
