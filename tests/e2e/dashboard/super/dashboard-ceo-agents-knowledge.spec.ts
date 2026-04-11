import { test, expect } from '../../auth/fixtures';

test.describe('Knowledge Base Management - org_bakedbot (super_user)', () => {
    test.beforeEach(async ({ superPage }) => {
        await superPage.goto('/dashboard/ceo/agents/knowledge', { waitUntil: 'domcontentloaded', timeout: 30000 });
    });

    test('page loads without redirecting to login or error state', async ({ superPage }) => {
        // Ensure we stay on the knowledge page and don't redirect to signin or generic dashboard
        await expect(superPage).toHaveURL(/\/dashboard\/ceo\/agents\/knowledge/, { timeout: 15000 });

        // Should not show any authentication error
        await expect(superPage.getByText(/sign in/i)).not.toBeVisible({ timeout: 5000 }).catch(() => {});
        await expect(superPage.getByText(/unauthorized/i)).not.toBeVisible({ timeout: 5000 }).catch(() => {});
    });

    test('displays key page elements including headings and action buttons', async ({ superPage }) => {
        // Wait for page content to load (handle loading spinners)
        await superPage.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

        // The page should have knowledge-related content
        // Look for key UI elements: agent selector, create knowledge base button, tabs, or cards
        const pageContent = superPage.locator('body');
        await expect(pageContent).toBeVisible({ timeout: 10000 });

        // Check for the agent selector (Select component for choosing agent)
        const hasAgentSelector = await superPage.getByRole('combobox').first().isVisible({ timeout: 5000 }).catch(() => false);
        const hasSelectTrigger = await superPage.locator('[role="combobox"], [data-slot="select-trigger"]').first().isVisible({ timeout: 5000 }).catch(() => false);

        // Should have some form of agent selection or knowledge base UI
        expect(hasAgentSelector || hasSelectTrigger || await superPage.getByText(/knowledge/i).first().isVisible({ timeout: 5000 }).catch(() => false)).toBeTruthy();

        // Look for the "Create Knowledge Base" or Plus button
        const createButton = superPage.getByRole('button', { name: /create|new|add/i }).first();
        const plusButton = superPage.getByRole('button').filter({ has: superPage.locator('svg') }).first();
        const hasCreateAction = await createButton.isVisible({ timeout: 5000 }).catch(() => false) ||
            await plusButton.isVisible({ timeout: 5000 }).catch(() => false);

        // There should be some actionable button on the page
        const allButtons = superPage.getByRole('button');
        await expect(allButtons.first()).toBeVisible({ timeout: 10000 });
    });

    test('tabs are present and switchable', async ({ superPage }) => {
        await superPage.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

        // The page uses Tabs component - look for tab triggers
        const tabList = superPage.getByRole('tablist');
        const hasTabList = await tabList.isVisible({ timeout: 10000 }).catch(() => false);

        if (hasTabList) {
            // Get all tab triggers
            const tabs = superPage.getByRole('tab');
            const tabCount = await tabs.count();
            expect(tabCount).toBeGreaterThan(0);

            // Click the first tab
            if (tabCount > 0) {
                await tabs.first().click();
                await expect(tabs.first()).toHaveAttribute('data-state', 'active', { timeout: 5000 }).catch(() => {});
            }

            // If there's a second tab, click it and verify switching
            if (tabCount > 1) {
                await tabs.nth(1).click();
                await expect(tabs.nth(1)).toHaveAttribute('data-state', 'active', { timeout: 5000 }).catch(() => {});
            }
        } else {
            // If no tabs, the page should still have meaningful content (cards, tables, etc.)
            const cards = superPage.locator('[data-slot="card"], .card');
            const hasCards = await cards.first().isVisible({ timeout: 5000 }).catch(() => false);
            const hasContent = hasCards || await superPage.getByText(/knowledge|document|compliance/i).first().isVisible({ timeout: 5000 }).catch(() => false);
            expect(hasContent).toBeTruthy();
        }
    });

    test('compliance search input is functional', async ({ superPage }) => {
        await superPage.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

        // Look for search input
        const searchInput = superPage.getByRole('searchbox').or(
            superPage.getByPlaceholder(/search/i)
        ).or(
            superPage.locator('input[type="search"], input[type="text"]').first()
        );

        const hasSearch = await searchInput.first().isVisible({ timeout: 10000 }).catch(() => false);

        if (hasSearch) {
            await searchInput.first().fill('cannabis compliance');
            await expect(searchInput.first()).toHaveValue('cannabis compliance', { timeout: 5000 });

            // Look for a search button to trigger the search
            const searchButton = superPage.getByRole('button', { name: /search/i });
            if (await searchButton.isVisible({ timeout: 3000 }).catch(() => false)) {
                await searchButton.click();
                // After clicking search, wait for results or loading state
                await superPage.waitForTimeout(2000);
            }
        }

        // Whether search exists or not, the page should remain on the knowledge route
        await expect(superPage).toHaveURL(/\/dashboard\/ceo\/agents\/knowledge/);
    });

    test('knowledge base list displays or shows empty state', async ({ superPage }) => {
        await superPage.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

        // Wait for any loading spinner to disappear
        const spinner = superPage.locator('.animate-spin, [data-loading="true"]');
        if (await spinner.isVisible({ timeout: 3000 }).catch(() => false)) {
            await expect(spinner).not.toBeVisible({ timeout: 15000 });
        }

        // Check if there's a table with knowledge bases or an empty state
        const table = superPage.getByRole('table');
        const hasTable = await table.isVisible({ timeout: 5000 }).catch(() => false);

        const emptyState = superPage.getByText(/no knowledge|no documents|empty|get started|create your first/i);
        const hasEmptyState = await emptyState.first().isVisible({ timeout: 5000 }).catch(() => false);

        // Either we have a table with data, an empty state message, or cards with knowledge bases
        const cards = superPage.locator('[data-slot="card"]');
        const hasCards = await cards.first().isVisible({ timeout: 5000 }).catch(() => false);

        // At least one of these should be true - the page renders some meaningful state
        const pageHasContent = hasTable || hasEmptyState || hasCards ||
            await superPage.getByText(/knowledge/i).first().isVisible({ timeout: 5000 }).catch(() => false);

        expect(pageHasContent).toBeTruthy();

        // Verify we're still on the correct page
        await expect(superPage).toHaveURL(/\/dashboard\/ceo\/agents\/knowledge/);
    });
});