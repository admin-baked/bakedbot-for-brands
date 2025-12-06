import { test, expect } from '@playwright/test';

test('Checkout sandbox flow (place order opens provider)', async ({ page }) => {
  // Navigate to demo menu and add product to cart
  await page.goto('/menu/default');

  // pick first visible product card
  const card = page.locator('[data-testid^="product-card"]').first();
  await expect(card).toBeVisible({ timeout: 10000 });
  await card.getByRole('button', { name: /Add/i }).click();

  // Open cart and proceed to checkout
  await page.getByTestId('cart-pill').click();
  await page.getByRole('button', { name: /Proceed to Checkout/i }).click();
  await expect(page).toHaveURL(/\/checkout/);

  // Fill out form and place order
  await page.fill('input[name="customerName"]', 'Checkout Tester');
  await page.fill('input[name="customerEmail"]', 'checkout@example.com');
  await page.fill('input[name="customerPhone"]', '555-777-8888');
  await page.fill('input[name="customerBirthDate"]', '1990-01-01');

  const [newPage] = await Promise.all([
    page.context().waitForEvent('page'),
    page.getByRole('button', { name: /Place Order/i }).click(),
  ]);

  await expect(newPage).toHaveURL(/https?:\/\/example\.com\/|https?:\/\/sandbox\./, { timeout: 15000 });
  await newPage.close();
});
