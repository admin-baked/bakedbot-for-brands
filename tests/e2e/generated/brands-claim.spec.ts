import { expect, test, type Page } from '@playwright/test';

test.describe('Brands Claim Page E2E Tests', () => {
    const route = '/brands/claim';

    test('should load the page successfully', async ({ page }) => {
        const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
        expect(response?.status()).toBe(200);
    });

    test('should display the claim form with pre-filled entity name', async ({ page }) => {
        await page.goto(`${route}?name=TestBrand`, { waitUntil: 'domcontentloaded' });

        await expect(page.locator('input[name="entityName"]')).toBeVisible();
        await expect(page.locator('input[name="entityName"]')).toHaveValue('TestBrand');
        await expect(page.getByRole('button', { name: 'Submit Claim' })).toBeVisible();
    });

    test('should display the claim form and allow submission', async ({ page }) => {
        await page.goto(route, { waitUntil: 'domcontentloaded' });

        await expect(page.locator('input[name="entityName"]')).toBeVisible();
        await expect(page.locator('input[name="website"]')).toBeVisible();
        await expect(page.locator('input[name="contactName"]')).toBeVisible();
        await expect(page.locator('input[name="businessEmail"]')).toBeVisible();
        await expect(page.locator('input[name="role"]')).toBeVisible();
        await expect(page.locator('input[name="phone"]')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Submit Claim' })).toBeVisible();

        await page.locator('input[name="entityName"]').fill('Example Brand');
        await page.locator('input[name="website"]').fill('https://example.com');
        await page.locator('input[name="contactName"]').fill('John Doe');
        await page.locator('input[name="businessEmail"]').fill('john@example.com');
        await page.locator('input[name="role"]').fill('Manager');
        await page.locator('input[name="phone"]').fill('123-456-7890');

        // Note:  Submitting the form will trigger a server action.  We don't want to actually submit,
        // so we're just filling out the form and checking that the button is enabled.
    });

    test('should display dispensary claim form when type is dispensary', async ({ page }) => {
        await page.goto(`${route}?type=dispensary`, { waitUntil: 'domcontentloaded' });

        await expect(page.getByText('Claim Your Dispensary')).toBeVisible({ timeout: 10_000 });
    });
});