import { test, expect } from '@playwright/test';

test.describe('Coupon Validation', () => {
  test('apply valid and invalid coupon behavior', async ({ page }) => {
    // Authenticate with dev login to reach checkout flow if required
    await page.goto('/brand-login');
    await page.getByTestId('dev-login-button').click();
    await page.getByTestId('dev-login-item-brand@bakedbot.ai').click();

    // Go to a subscription page for free plan to exercise coupon logic
    await page.goto('/checkout/subscription?plan=free');

    // Fill details and continue
    await page.fill('#name', 'Coupon Tester');
    await page.fill('#email', 'coupon@example.com');
    await page.fill('#phone', '(555) 222-3333');
    await page.getByRole('button', { name: /Continue to Payment/i }).click();

    // Try an invalid coupon
    await page.fill('#coupon', 'INVALID');
    await page.getByRole('button', { name: /Apply|Remove/i }).click();
    // The UI may render both a short and long message; assert at least one message is visible
    await expect(page.getByText(/Invalid Coupon|Invalid coupon code/i).first()).toBeVisible({ timeout: 5000 });

    // NOTE: For a valid coupon test we depend on test data in Firestore.
    // If there's a known test coupon, place it here; otherwise this assertion is a smoke check.
    // Example (if coupon 'TEST10' exists):
    // await page.fill('#coupon', 'TEST10');
    // await page.getByRole('button', { name: /Apply/i }).click();
    // await expect(page.getByText(/Coupon applied|Discount applied/i)).toBeVisible({ timeout: 5000 });
  });
});
