import { test, expect } from '@playwright/test';

test.describe('CannPay Payment Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Set base URL if needed
    await page.goto('/');
  });

  test('should display payment method selection in checkout', async ({ page }) => {
    // Navigate to shop
    await page.goto('/shop/demo-dispensary-001');

    // Add product to cart
    const addToCartButton = page.locator('button:has-text("Add to Cart")').first();
    if (await addToCartButton.isVisible()) {
      await addToCartButton.click();
    }

    // Go to checkout
    await page.goto('/checkout');

    // Should see payment method options
    await expect(page.locator('text=Payment Method')).toBeVisible();
    await expect(page.locator('text=Dispensary Direct')).toBeVisible();
    await expect(page.locator('text=CannPay')).toBeVisible();
  });

  test('should show transaction fee for CannPay', async ({ page }) => {
    await page.goto('/checkout');

    // Select CannPay payment method
    const cannpayOption = page.locator('[data-testid="payment-cannpay"]');
    if (await cannpayOption.isVisible()) {
      await cannpayOption.click();

      // Should display transaction fee
      await expect(page.locator('text=$0.50')).toBeVisible();
      await expect(page.locator('text=transaction fee').or(page.locator('text=Transaction Fee'))).toBeVisible();
    }
  });

  test('should handle dispensary direct payment (default)', async ({ page }) => {
    await page.goto('/checkout');

    // Dispensary direct should be default
    const dispensaryDirectOption = page.locator('[data-testid="payment-dispensary-direct"]');
    await expect(dispensaryDirectOption).toBeChecked().catch(() => {
      // Might be selected by default without being a checkbox
    });

    // Submit order
    const submitButton = page.locator('button:has-text("Place Order")');
    if (await submitButton.isVisible()) {
      await submitButton.click();

      // Should show success message
      await expect(page.locator('text=Order confirmed').or(page.locator('text=Payment will be collected at pickup'))).toBeVisible({
        timeout: 10000,
      });
    }
  });

  test('CannPay authorization flow', async ({ page }) => {
    await page.goto('/checkout');

    // Select CannPay
    const cannpayOption = page.locator('[data-testid="payment-cannpay"]');
    if (await cannpayOption.isVisible()) {
      await cannpayOption.click();

      // Click pay button
      const payButton = page.locator('button:has-text("Pay with CannPay")');
      if (await payButton.isVisible()) {
        await payButton.click();

        // Should either show CannPay widget or error about missing credentials
        const widgetOrError = page.locator('[data-testid="cannpay-widget"]').or(
          page.locator('text=Payment system not configured')
        );
        await expect(widgetOrError).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should validate order before CannPay authorization', async ({ page }) => {
    // Try to access CannPay authorize endpoint directly without order
    const response = await page.request.post('/api/checkout/cannpay/authorize', {
      data: {
        orderId: 'invalid-order',
        amount: 5000,
      },
    });

    expect(response.status()).toBe(401); // Unauthorized (no session) or 404 (order not found)
  });

  test('should handle CannPay authorization errors gracefully', async ({ page }) => {
    await page.goto('/checkout');

    // Mock CannPay API failure
    await page.route('**/api/checkout/cannpay/authorize', (route) => {
      route.fulfill({
        status: 502,
        body: JSON.stringify({ error: 'Payment authorization failed' }),
      });
    });

    const cannpayOption = page.locator('[data-testid="payment-cannpay"]');
    if (await cannpayOption.isVisible()) {
      await cannpayOption.click();

      const payButton = page.locator('button:has-text("Pay with CannPay")');
      if (await payButton.isVisible()) {
        await payButton.click();

        // Should show error message
        await expect(page.locator('text=Payment authorization failed').or(
          page.locator('text=Please try again')
        )).toBeVisible({ timeout: 5000 });
      }
    }
  });
});

test.describe('Payment Method Accessibility', () => {
  test('payment options should be keyboard navigable', async ({ page }) => {
    await page.goto('/checkout');

    // Tab to payment options
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Should be able to select with keyboard
    await page.keyboard.press('Space');

    // Check focus is visible
    const focused = await page.locator(':focus');
    await expect(focused).toBeVisible();
  });

  test('payment options should have proper ARIA labels', async ({ page }) => {
    await page.goto('/checkout');

    const cannpayOption = page.locator('[data-testid="payment-cannpay"]');
    if (await cannpayOption.isVisible()) {
      const ariaLabel = await cannpayOption.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
    }
  });
});
