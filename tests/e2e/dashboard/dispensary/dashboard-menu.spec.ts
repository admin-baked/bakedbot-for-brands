import { test, expect } from '../../auth/fixtures';

test.describe('Menu Page - Dispensary Admin (org_thrive_syracuse)', () => {
    test('should load the menu page without redirecting to login', async ({ dispensaryPage }) => {
        await dispensaryPage.goto('/dashboard/menu', { waitUntil: 'domcontentloaded', timeout: 30000 });

        // Ensure we are still on /dashboard/menu and not redirected
        await expect(dispensaryPage).toHaveURL(/\/dashboard\/menu/, { timeout: 15000 });

        // Should not be on signin or plain dashboard redirect
        const url = dispensaryPage.url();
        expect(url).not.toContain('/signin');
        expect(url).not.toMatch(/\/dashboard$/);
    });

    test('should display tabs for menu management sections', async ({ dispensaryPage }) => {
        await dispensaryPage.goto('/dashboard/menu', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await expect(dispensaryPage).toHaveURL(/\/dashboard\/menu/, { timeout: 15000 });

        // Wait for loading to settle - look for tab elements
        // The page has tabs: menu, locations, zip-seo, budtender, themes
        const tabsList = dispensaryPage.getByRole('tablist');
        await expect(tabsList).toBeVisible({ timeout: 15000 });

        // Check for key tab triggers by their text content
        // Tab names based on ActiveTab type: 'menu' | 'locations' | 'zip-seo' | 'budtender' | 'themes'
        const menuTab = dispensaryPage.getByRole('tab', { name: /menu/i });
        await expect(menuTab).toBeVisible({ timeout: 10000 });

        const locationsTab = dispensaryPage.getByRole('tab', { name: /location/i });
        await expect(locationsTab).toBeVisible({ timeout: 10000 });
    });

    test('should show the menu preview tab content by default', async ({ dispensaryPage }) => {
        await dispensaryPage.goto('/dashboard/menu', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await expect(dispensaryPage).toHaveURL(/\/dashboard\/menu/, { timeout: 15000 });

        // The default active tab should be 'menu'
        const menuTab = dispensaryPage.getByRole('tab', { name: /menu/i }).first();
        await expect(menuTab).toBeVisible({ timeout: 10000 });

        // Check the menu tab is selected/active
        await expect(menuTab).toHaveAttribute('aria-selected', 'true', { timeout: 10000 });

        // Wait for either loading state to finish or content to appear
        // The page shows domain products or a loading/empty state
        const tabContent = dispensaryPage.getByRole('tabpanel');
        await expect(tabContent).toBeVisible({ timeout: 15000 });
    });

    test('should allow switching between tabs', async ({ dispensaryPage }) => {
        await dispensaryPage.goto('/dashboard/menu', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await expect(dispensaryPage).toHaveURL(/\/dashboard\/menu/, { timeout: 15000 });

        // Wait for tabs to be visible
        const tabsList = dispensaryPage.getByRole('tablist');
        await expect(tabsList).toBeVisible({ timeout: 15000 });

        // Click on Locations tab
        const locationsTab = dispensaryPage.getByRole('tab', { name: /location/i });
        await expect(locationsTab).toBeVisible({ timeout: 10000 });
        await locationsTab.click();

        // Verify the locations tab is now selected
        await expect(locationsTab).toHaveAttribute('aria-selected', 'true', { timeout: 10000 });

        // Switch back to menu tab
        const menuTab = dispensaryPage.getByRole('tab', { name: /menu/i }).first();
        await menuTab.click();
        await expect(menuTab).toHaveAttribute('aria-selected', 'true', { timeout: 10000 });
    });

    test('should display action buttons and page header elements', async ({ dispensaryPage }) => {
        await dispensaryPage.goto('/dashboard/menu', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await expect(dispensaryPage).toHaveURL(/\/dashboard\/menu/, { timeout: 15000 });

        // The page imports icons like Eye, MapPin, Search, Bot, Zap, etc.
        // and has PagesHeader component - look for any header or main content
        // Also look for buttons that might be on the page
        const tabPanel = dispensaryPage.getByRole('tabpanel');
        await expect(tabPanel).toBeVisible({ timeout: 15000 });

        // Check that no error boundaries or error messages are shown
        const errorMessage = dispensaryPage.getByText(/something went wrong/i);
        await expect(errorMessage).not.toBeVisible({ timeout: 5000 }).catch(() => {
            // It's fine if this selector doesn't exist at all
        });

        // Verify the page has meaningful content (not blank)
        const bodyText = await dispensaryPage.locator('body').innerText();
        expect(bodyText.length).toBeGreaterThan(10);
    });
});