import { expect, test, type Page } from '@playwright/test';

test.describe.configure({
    mode: 'serial',
    timeout: 240_000,
});

async function openRoute(page: Page, route: string): Promise<void> {
    await page.goto(route, { waitUntil: 'domcontentloaded' });
}

async function grantAgeAccess(page: Page): Promise<void> {
    await page.context().addCookies([
        {
            name: 'age_verified',
            value: 'true',
            url: 'http://localhost:3000',
        },
    ]);
}

async function dismissDemoWelcome(page: Page): Promise<void> {
    await expect(page.getByRole('button', { name: 'Browse Demo Menu' })).toBeVisible({ timeout: 120_000 });
    await page.getByRole('button', { name: 'Browse Demo Menu' }).click();
    await expect(page.getByRole('button', { name: 'Browse Demo Menu' })).toBeHidden();
}

test.describe('Maintained public E2E smoke', () => {
    test('brand and dispensary login wrappers redirect to unified signin', async ({ page }) => {
        for (const route of ['/brand-login', '/dispensary-login']) {
            await openRoute(page, route);
            await page.waitForURL('**/signin');

            await expect(page).toHaveURL(/\/signin$/);
            await expect(page.getByRole('link', { name: 'Need Help?' })).toBeVisible();
            await expect(page.locator('body')).toContainText(/Human Access|Authentication unavailable/i);
        }
    });

    test('customer login exposes the current customer auth surface', async ({ page }) => {
        await openRoute(page, '/customer-login');

        await expect(page.getByRole('heading', { name: 'Customer Login' })).toBeVisible();
        await expect(page.locator('input[type="email"]')).toBeVisible();
        await expect(page.locator('input[type="password"]')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Sign in with Google' })).toBeVisible();
        await expect(page.getByRole('button', { name: /^Login$/ })).toBeVisible();
        await expect(page.getByTestId('dev-login-button')).toBeVisible();
    });

    test('demo shop bundle flow opens the maintained bundle dialog', async ({ page }) => {
        await grantAgeAccess(page);
        await openRoute(page, '/demo-shop');
        await dismissDemoWelcome(page);

        await expect(page.getByRole('tab', { name: 'Dispensary Menu' })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Bundle & Save' })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Daily Deals' })).toBeVisible();

        await page.getByRole('button', { name: 'View Bundle' }).first().click();

        await expect(page.getByText("What's Included")).toBeVisible();
        await expect(page.getByText('Bundle Price')).toBeVisible();
        await expect(page.getByRole('button', { name: /Add Bundle to Cart/i })).toBeVisible();
    });

    test('brand demo mode supports pickup-location selection', async ({ page }) => {
        await grantAgeAccess(page);
        await openRoute(page, '/demo-shop');
        await dismissDemoWelcome(page);

        await page.getByRole('tab', { name: 'Brand Menu' }).click();
        await page.getByRole('button', { name: 'Find Pickup Location' }).click();

        await expect(page.getByRole('heading', { name: 'Where would you like to pick up?' })).toBeVisible();

        await page.getByRole('button', { name: 'Use My Current Location' }).click();
        await expect(page.getByText('Green Valley Dispensary')).toBeVisible({ timeout: 10_000 });

        await page.getByRole('button', { name: 'Select' }).first().click();
        await expect(page.getByText('Pickup Location Selected')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Green Valley Dispensary' })).toBeVisible();
    });
});
