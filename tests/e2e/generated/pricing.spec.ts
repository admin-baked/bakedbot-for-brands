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

test.describe('Pricing Page E2E Tests', () => {
    test('page loads successfully', async ({ page }) => {
        await openRoute(page, '/pricing');
        await expect(page).toHaveURL(/\/pricing$/);
        await expect(page.locator('body')).not.toContainText('Error');
    });

    test('key elements are visible', async ({ page }) => {
        await openRoute(page, '/pricing');
        await expect(page.getByRole('heading', { name: 'Pricing built around proof and repeat revenue' })).toBeVisible({ timeout: 10_000 });
        await expect(page.getByRole('heading', { name: /Access|Operator/i })).toBeVisible();
        await expect(page.getByText('Access gives operators a low-friction entry point')).toBeVisible();
    });

    test('interactive elements work as expected', async ({ page }) => {
        await openRoute(page, '/pricing');
        await expect(page.getByRole('link', { name: 'Learn More' })).toBeVisible();
        await page.getByRole('link', { name: 'Learn More' }).click();
        await expect(page).toHaveURL(/\/pricing\/#[a-zA-Z0-9_-]+$/);
    });

    test('promo code banner is displayed when valid promo code is provided', async ({ page }) => {
        await openRoute(page, '/pricing?promo=VALID_PROMO_CODE');
        await expect(page.getByText('bannerText' in PROMO_CODES['VALID_PROMO_CODE'] ? PROMO_CODES['VALID_PROMO_CODE'].bannerText : PROMO_CODES['VALID_PROMO_CODE'].description)).toBeVisible();
    });

    test('age gate is bypassed when age verification cookie is set', async ({ page }) => {
        await grantAgeAccess(page);
        await openRoute(page, '/pricing');
        await expect(page.locator('body')).not.toContainText('Age Verification Required');
    });
});