
import { test, expect } from '@playwright/test';

test('full checkout flow', async ({ page }) => {
    // 1. Go to homepage
    await page.goto('/');

    // 2. Select a location
    await page.getByText('The Green Spot').click();
    await expect(page.locator('.ring-primary')).toContainText('The Green Spot');

    // 3. Find the "Cosmic Caramels" product card and add it to cart
    const productCard = page.locator('.flex.flex-col.group.border', { has: page.locator('h3:has-text("Cosmic Caramels")') });
    await productCard.locator('button:has-text("Add")').click();

    // 4. Verify item is in cart by checking the pill
    await expect(page.locator('.fixed.bottom-6')).toContainText('View Cart');
    await expect(page.locator('.fixed.bottom-6 .inline-flex.items-center')).toContainText('1');

    // 5. Go to checkout
    await page.goto('/checkout');
    
    // 6. Fill out the form
    await page.fill('input[name="customerName"]', 'Test Customer');
    await page.fill('input[name="customerEmail"]', 'test@example.com');
    await page.fill('input[name="customerPhone"]', '555-555-5555');
    await page.fill('input[name="customerBirthDate"]', '1990-01-01');

    // 7. Submit the order
    await page.getByRole('button', { name: 'Place Order' }).click();

    // 8. Verify confirmation page
    await expect(page).toHaveURL(/\/order-confirmation\/.+/);
    await expect(page.locator('h1', { hasText: 'Order Confirmed' })).toBeVisible();
    await expect(page.getByText('Thank you, Test Customer!')).toBeVisible();
});
