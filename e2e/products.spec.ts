
import { test, expect } from '@playwright/test';

test.describe('Product Management Lifecycle', () => {
  
  test('brand manager can create, edit, and delete a product', async ({ page }) => {
    // Use a unique product name for each test run to avoid collisions
    const productName = `Test Product ${Date.now()}`;
    const updatedProductName = `${productName} (Updated)`;

    // 1. Log in as the brand manager persona
    await page.goto('/brand-login');
    await page.getByTestId('dev-login-button').click();
    await page.getByTestId('dev-login-item-brand@bakedbot.ai').click();

    // 2. Navigate to the products dashboard
    await expect(page).toHaveURL('/dashboard');
    await page.getByRole('link', { name: 'Products' }).click();
    await expect(page).toHaveURL('/dashboard/products');

    // 3. Create a new product
    await page.getByRole('link', { name: 'Add Product' }).click();
    await expect(page).toHaveURL('/dashboard/products/new');
    
    await page.fill('input[name="name"]', productName);
    await page.fill('textarea[name="description"]', 'This is a test product description.');
    await page.fill('input[name="category"]', 'Test Category');
    await page.fill('input[name="price"]', '42.00');
    await page.fill('input[name="imageUrl"]', 'https://picsum.photos/seed/1/400/400');
    
    await page.getByRole('button', { name: 'Create Product' }).click();

    // 4. Verify the product appears in the list
    await expect(page).toHaveURL('/dashboard/products');
    await expect(page.getByText(productName)).toBeVisible();

    // 5. Edit the product
    // Find the row with the new product and click its action menu
    const productRow = page.getByRole('row', { name: productName });
    await productRow.getByRole('button', { name: 'Open menu' }).click();
    await page.getByRole('menuitem', { name: 'Edit product' }).click();

    // Verify we are on the edit page
    await expect(page.locator('input[name="name"]')).toHaveValue(productName);
    
    // Update the name and save
    await page.fill('input[name="name"]', updatedProductName);
    await page.getByRole('button', { name: 'Save Changes' }).click();

    // 6. Verify the updated product name appears in the list
    await expect(page).toHaveURL('/dashboard/products');
    await expect(page.getByText('Product updated successfully!')).toBeVisible();
    await expect(page.getByText(updatedProductName)).toBeVisible();
    await expect(page.getByText(productName)).not.toBeVisible();

    // 7. Delete the product
    const updatedProductRow = page.getByRole('row', { name: updatedProductName });
    await updatedProductRow.getByRole('button', { name: 'Open menu' }).click();
    
    // Use getByText to target the trigger inside the DropdownMenuItem
    await page.getByText('Delete product').click();
    
    // Confirm the deletion in the dialog
    await expect(page.getByRole('heading', { name: 'Are you absolutely sure?' })).toBeVisible();
    await page.getByRole('button', { name: 'Continue' }).click();

    // 8. Verify the product is gone from the list
    await expect(page.getByText('Product deleted successfully.')).toBeVisible();
    await expect(page.getByText(updatedProductName)).not.toBeVisible();
  });

});
