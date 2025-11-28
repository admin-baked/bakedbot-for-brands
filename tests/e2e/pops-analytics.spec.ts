/**
 * E2E Tests for Pops Analytics Dashboard
 * Tests analytics charts and data visualization
 */

import { test, expect } from '@playwright/test';

test.describe('Pops Analytics Dashboard', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/dashboard/analytics');
    });

    test('should display summary cards', async ({ page }) => {
        // Verify summary cards are visible
        await expect(page.locator('text=Total Revenue')).toBeVisible();
        await expect(page.locator('text=Total Orders')).toBeVisible();
        await expect(page.locator('text=Average Order Value')).toBeVisible();

        // Verify cards have values (even if 0)
        const revenueCard = page.locator('text=Total Revenue').locator('..');
        await expect(revenueCard.locator('text=/\\$[0-9]/')).toBeVisible();
    });

    test('should display revenue chart', async ({ page }) => {
        // Verify Revenue Over Time chart
        await expect(page.locator('text=Revenue Over Time')).toBeVisible();
        await expect(page.locator('text=Daily GMV')).toBeVisible();

        // Verify chart container exists
        const chartContainer = page.locator('[class*="recharts"]').first();
        await expect(chartContainer).toBeVisible();
    });

    test('should display conversion funnel', async ({ page }) => {
        // Verify funnel chart
        await expect(page.locator('text=Conversion Funnel')).toBeVisible();
        await expect(page.locator('text=Sessions to Paid Orders')).toBeVisible();

        // Verify funnel stages
        await expect(page.locator('text=Sessions')).toBeVisible();
        await expect(page.locator('text=Checkouts Started')).toBeVisible();
        await expect(page.locator('text=Paid Orders')).toBeVisible();
    });

    test('should display top products chart', async ({ page }) => {
        // Verify top products section
        await expect(page.locator('text=Top Selling Products')).toBeVisible();

        // Chart should be visible (even if empty)
        const productsChart = page.locator('text=Top Selling Products').locator('..');
        await expect(productsChart).toBeVisible();
    });

    test('should display channel performance', async ({ page }) => {
        // Verify channel performance section
        await expect(page.locator('text=Channel Performance')).toBeVisible();
        await expect(page.locator('text=Where your traffic is coming from')).toBeVisible();
    });
});
