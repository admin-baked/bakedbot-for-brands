
import { test, expect } from '@playwright/test';

test('full checkout flow', async ({ page }) => {
    // 1. Go to the menu page for the default brand
    await page.goto('/menu/default');

    // 2. Select a location
    await page.getByTestId('location-card-bayside-cannabis').click();
    await expect(page.getByTestId('location-card-bayside-cannabis')).toHaveClass(/ring-primary/);

    // 3. Find the product card and add it to cart
    const productCard = page.getByTestId('product-card-demo-40t-gg4');
    await productCard.locator('button', { hasText: 'Add' }).click();

    // 4. Verify item is in cart by checking the pill
    const cartPill = page.getByTestId('cart-pill');
    await expect(cartPill).toContainText('View Cart');
    await expect(cartPill.locator('span').first()).toContainText('1');

    // 5. Go to checkout by clicking the cart pill
    await cartPill.click();
    await page.getByRole('button', { name: 'Proceed to Checkout' }).click();
    await expect(page).toHaveURL('/checkout');
    
    // 6. Fill out the form
    await page.fill('input[name="customerName"]', 'Test Customer');
    await page.fill('input[name="customerEmail"]', 'test@example.com');
    await page.fill('input[name="customerPhone"]', '555-123-4567');
    await page.fill('input[name="customerBirthDate"]', '1990-01-01');

    // 7. Submit the order. The action now redirects to a payment provider.
    // Instead of waiting for a navigation on the same page, we listen for the new page event.
    const pagePromise = page.context().waitForEvent('page');
    await page.getByRole('button', { name: 'Place Order' }).click();
    
    // 8. Verify a new tab was opened for the payment flow.
    const newPage = await pagePromise;
    // Allow for both sandbox and production URLs. The current mock redirects to example.com.
    // In a real test against a sandbox, this would be a specific payment provider URL.
    await expect(newPage).toHaveURL(/https:\/\/example\.com\/.*/);

    // Close the new page to clean up
    await newPage.close();
});
