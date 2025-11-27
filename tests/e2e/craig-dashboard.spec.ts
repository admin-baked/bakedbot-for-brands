/**
 * E2E Tests for Craig's Marketing Dashboard
 * Tests campaign creation wizard flow
 */

import { test, expect } from '@playwright/test';

test.describe('Craig Marketing Dashboard', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to Craig's dashboard
        await page.goto('/dashboard/agents/craig');
    });

    test('should display dashboard with summary cards', async ({ page }) => {
        // Verify dashboard loads
        await expect(page.locator('h1:has-text("Marketing Dashboard")')).toBeVisible();

        // Verify summary cards
        await expect(page.locator('text=Active Campaigns')).toBeVisible();
        await expect(page.locator('text=Emails Sent')).toBeVisible();
        await expect(page.locator('text=Avg. Open Rate')).toBeVisible();
    });

    test('should complete campaign creation wizard', async ({ page }) => {
        // Click Create Campaign button
        await page.click('button:has-text("Create Campaign")');

        // Verify wizard opens
        await expect(page).toHaveURL(/\/campaigns\/new/);
        await expect(page.locator('text=Create New Campaign')).toBeVisible();

        // Step 1: Goal
        await page.fill('input[name="campaignName"]', 'Test Campaign');
        await page.selectOption('select[name="objective"]', 'drive-sales');
        await page.click('button:has-text("Next")');

        // Step 2: Audience
        await page.click('button:has-text("All Customers")');
        await page.click('button:has-text("Email")');
        await page.click('button:has-text("Next")');

        // Step 3: Content
        await page.fill('input[name="subject"]', 'Test Subject Line');
        await page.fill('textarea[name="body"]', 'Test email body content');

        // Optional: Test AI generation
        await page.click('button:has-text("Generate with Craig")');
        await page.waitForTimeout(2000); // Wait for generation

        await page.click('button:has-text("Next")');

        // Step 4: Review
        await expect(page.locator('text=Review Campaign')).toBeVisible();
        await expect(page.locator('text=Test Campaign')).toBeVisible();
        await expect(page.locator('text=Test Subject Line')).toBeVisible();

        // Submit campaign
        await page.click('button:has-text("Schedule Campaign")');

        // Verify success and redirect
        await expect(page.locator('text=/scheduled|success/i')).toBeVisible({ timeout: 5000 });
        await expect(page).toHaveURL(/\/dashboard\/agents\/craig/);
    });

    test('should navigate between wizard steps', async ({ page }) => {
        await page.click('button:has-text("Create Campaign")');

        // Go to step 2
        await page.fill('input[name="campaignName"]', 'Nav Test');
        await page.click('button:has-text("Next")');

        // Go back to step 1
        await page.click('button:has-text("Back")');
        await expect(page.locator('input[name="campaignName"]')).toHaveValue('Nav Test');

        // Progress indicator should update
        await expect(page.locator('[data-step="goal"]')).toHaveClass(/active|current/);
    });
});
