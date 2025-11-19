
import { test, expect } from '@playwright/test';

test('full checkout flow', async ({ page }) => {
    // 1. Go to the menu page for the default brand
    await page.goto('/menu/default');

    // 2. Select a location
    await page.getByTestId('location-card-1').click();
    await expect(page.getByTestId('location-card-1')).toHaveClass(/ring-primary/);

    // 3. Find the "Cosmic Caramels" product card and add it to cart
    const productCard = page.getByTestId('product-card-1');
    await productCard.getByRole('button', { name: 'Add' }).click();

    // 4. Verify item is in cart by checking the pill
    const cartPill = page.getByTestId('cart-pill');
    await expect(cartPill).toContainText('View Cart');
    await expect(cartPill.locator('span').last()).toContainText('1');

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
    await expect(page.getByRole('heading', { name: 'Order Status' })).toBeVisible();
    await expect(page.getByText(/We've received your order/)).toBeVisible();
});
