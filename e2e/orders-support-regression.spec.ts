import { test, expect } from '@playwright/test';

async function devLoginAsBrand(page: any) {
  await page.goto('/brand-login');
  await page.getByTestId('dev-login-button').click();
  await page.getByTestId('dev-login-item-brand@bakedbot.ai').click();
  await page.waitForURL(/\/dashboard/);
}

test.describe('Orders + Support regression coverage', () => {
  test('help prompt visible on analytics but hidden on menu', async ({ page }) => {
    await devLoginAsBrand(page);

    await page.goto('/dashboard/analytics');
    await expect(page.getByText('Need help? Click the button →')).toBeVisible();

    await page.goto('/dashboard/menu');
    await expect(page.getByText('Need help? Click the button →')).toHaveCount(0);
  });

  test('orders and analytics tabs render without fatal fetch state', async ({ page }) => {
    await devLoginAsBrand(page);

    await page.goto('/dashboard/orders');
    await expect(page.getByRole('heading', { name: /Orders/i }).first()).toBeVisible();

    await page.getByRole('tab', { name: 'Analytics' }).click();
    await expect(page.getByText(/Avg Basket Size|Discount Rate Trend|Peak Hours Heatmap/i)).toBeVisible();

    await expect(page.getByText('Failed to fetch orders from server.')).toHaveCount(0);
  });
});
