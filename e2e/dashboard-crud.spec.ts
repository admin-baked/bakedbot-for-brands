import { test, expect } from '@playwright/test';

test.describe('Dashboard Product CRUD (smoke)', () => {
  test('create, edit, and delete a product', async ({ page }) => {
    // Dev login and navigate to products page
    await page.goto('/brand-login');
    await page.getByTestId('dev-login-button').click();
    await page.getByTestId('dev-login-item-brand@bakedbot.ai').click();

    await page.goto('/dashboard/products');
    await expect(page.getByRole('heading', { name: /Products/i })).toBeVisible();

    // Click new product
    await page.getByRole('button', { name: /New Product|Add Product/i }).click();

    // Fill basic fields
    const title = `E2E Test Product ${Date.now()}`;
    await page.fill('input[name="title"]', title);
    await page.fill('textarea[name="description"]', 'Created by Playwright e2e test');
    await page.fill('input[name="price"]', '4.99');

    // Save
    await page.getByRole('button', { name: /Save|Create/i }).click();
    await expect(page.getByText(title)).toBeVisible({ timeout: 10000 });

    // Edit: open product and change price
    await page.getByText(title).click();
    await page.fill('input[name="price"]', '5.99');
    await page.getByRole('button', { name: /Save|Update/i }).click();
    await expect(page.getByText('$5.99')).toBeVisible({ timeout: 5000 });

    // Delete
    await page.getByRole('button', { name: /Delete/i }).click();
    // Confirm deletion if modal
    if (await page.getByRole('button', { name: /Confirm|Yes, Delete/i }).count() > 0) {
      await page.getByRole('button', { name: /Confirm|Yes, Delete/i }).click();
    }
    await expect(page.getByText(title)).toHaveCount(0);
  });
});
