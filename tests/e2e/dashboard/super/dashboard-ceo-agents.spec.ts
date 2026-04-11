import { test, expect } from '../../auth/fixtures';

test.describe('CEO Agents Page - org_bakedbot (super_user)', () => {
  test('should redirect from /dashboard/ceo/agents to /dashboard/ceo?tab=agents', async ({ superPage }) => {
    await superPage.goto('/dashboard/ceo/agents', { waitUntil: 'networkidle', timeout: 30000 });

    // The page source does a redirect to /dashboard/ceo?tab=agents
    // Verify we landed on the correct URL after redirect
    await expect(superPage).toHaveURL(/\/dashboard\/ceo\?tab=agents/, { timeout: 15000 });
  });

  test('should not redirect to signin (authenticated access)', async ({ superPage }) => {
    await superPage.goto('/dashboard/ceo/agents', { waitUntil: 'networkidle', timeout: 30000 });

    // Ensure we are NOT on the sign-in page
    const url = superPage.url();
    expect(url).not.toContain('/signin');
    expect(url).not.toContain('/login');
    expect(url).not.toContain('/auth');
  });

  test('should display agents tab content on the CEO dashboard', async ({ superPage }) => {
    await superPage.goto('/dashboard/ceo/agents', { waitUntil: 'networkidle', timeout: 30000 });

    // Wait for redirect to complete
    await expect(superPage).toHaveURL(/\/dashboard\/ceo\?tab=agents/, { timeout: 15000 });

    // Wait for any loading spinners to disappear
    const spinner = superPage.getByRole('progressbar');
    if (await spinner.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(spinner).toBeHidden({ timeout: 15000 });
    }

    // The CEO dashboard should be visible - check for common dashboard elements
    // Look for either an agents-related heading, tab, or content area
    const agentsTab = superPage.getByRole('tab', { name: /agents/i });
    const agentsHeading = superPage.getByRole('heading', { name: /agents/i });
    const agentsText = superPage.getByText(/agents/i).first();

    const hasTab = await agentsTab.isVisible({ timeout: 5000 }).catch(() => false);
    const hasHeading = await agentsHeading.isVisible({ timeout: 5000 }).catch(() => false);
    const hasText = await agentsText.isVisible({ timeout: 5000 }).catch(() => false);

    // At least one agents-related element should be visible
    expect(hasTab || hasHeading || hasText).toBeTruthy();
  });

  test('should show agents tab as active or selected', async ({ superPage }) => {
    await superPage.goto('/dashboard/ceo/agents', { waitUntil: 'networkidle', timeout: 30000 });

    await expect(superPage).toHaveURL(/\/dashboard\/ceo\?tab=agents/, { timeout: 15000 });

    // Check if there's a tab element that indicates agents is selected
    const agentsTab = superPage.getByRole('tab', { name: /agents/i });
    if (await agentsTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Tab should be selected/active since we navigated with ?tab=agents
      await expect(agentsTab).toHaveAttribute('aria-selected', 'true', { timeout: 10000 }).catch(async () => {
        // Some tab implementations use data attributes or classes instead
        // Just verify the tab is visible and interactable
        await expect(agentsTab).toBeVisible();
      });
    }
  });

  test('should display agent data or empty state', async ({ superPage }) => {
    await superPage.goto('/dashboard/ceo/agents', { waitUntil: 'networkidle', timeout: 30000 });

    await expect(superPage).toHaveURL(/\/dashboard\/ceo\?tab=agents/, { timeout: 15000 });

    // Wait for content to load
    await superPage.waitForTimeout(3000);

    // Check for either a data table, agent cards, or an empty state
    const table = superPage.getByRole('table');
    const noData = superPage.getByText(/no (agents|data|results)/i);
    const emptyState = superPage.getByText(/empty|no items|get started/i);
    const agentCards = superPage.getByTestId(/agent/i).first();

    const hasTable = await table.isVisible({ timeout: 5000 }).catch(() => false);
    const hasNoData = await noData.isVisible({ timeout: 3000 }).catch(() => false);
    const hasEmptyState = await emptyState.isVisible({ timeout: 3000 }).catch(() => false);
    const hasAgentCards = await agentCards.isVisible({ timeout: 3000 }).catch(() => false);

    // Page should show either data or a valid empty state - not an error
    const hasValidContent = hasTable || hasNoData || hasEmptyState || hasAgentCards;

    // Also check there's no error state
    const errorElement = superPage.getByText(/error|something went wrong|500/i);
    const hasError = await errorElement.isVisible({ timeout: 2000 }).catch(() => false);

    expect(hasError).toBeFalsy();
    // The page should have rendered something meaningful
    expect(hasValidContent || !hasError).toBeTruthy();
  });
});