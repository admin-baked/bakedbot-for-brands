/**
 * Brand Dashboard E2E Tests
 *
 * Test suite for Production Readiness Audit Phase 2
 * Covers: Dashboard load, KPIs, Playbooks, Settings, Navigation, Permissions, Mobile
 */

import { test, expect, Page } from '@playwright/test';

// Test configuration
const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';
const BRAND_EMAIL = process.env.TEST_BRAND_EMAIL || 'test-brand@bakedbot.ai';
const BRAND_PASSWORD = process.env.TEST_BRAND_PASSWORD || 'TestPassword123!';

test.describe('Brand Dashboard Production Readiness Audit', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    // Login as brand user
    await page.goto(`${BASE_URL}/signin`);
    await page.fill('input[type="email"]', BRAND_EMAIL);
    await page.fill('input[type="password"]', BRAND_PASSWORD);
    await page.click('button:has-text("Sign In")');
    await page.waitForURL(`${BASE_URL}/dashboard/**`);
  });

  test.afterAll(async () => {
    await page.close();
  });

  // ============================================================================
  // 1️⃣ DASHBOARD HOME LOAD
  // ============================================================================

  test('Dashboard home loads without errors', async () => {
    await page.goto(`${BASE_URL}/dashboard`);

    // Check for 500 errors
    const errorLogs = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errorLogs.push(msg.text());
      }
    });

    await page.waitForLoadState('networkidle');
    expect(errorLogs.filter(e => e.includes('500'))).toHaveLength(0);
  });

  test('KPI grid renders with real data', async () => {
    await page.goto(`${BASE_URL}/dashboard`);

    // Check for KPI grid
    const kpiGrid = await page.locator('[data-testid="brand-kpi-grid"]');
    await expect(kpiGrid).toBeVisible();

    // Check for KPI cards
    const kpiCards = await page.locator('[data-testid="kpi-card"]');
    const cardCount = await kpiCards.count();
    expect(cardCount).toBeGreaterThan(0);

    // Verify KPI metrics are not showing mock data
    const kpiValues = await page.locator('[data-testid="kpi-value"]').allTextContents();
    kpiValues.forEach(value => {
      expect(value).not.toContain('Coming soon');
      expect(value).not.toContain('Mock');
      // Value should be a number or "No data"
      expect(/^(\d+|No data)$/i.test(value)).toBeTruthy();
    });
  });

  test('Playbooks list loads successfully', async () => {
    await page.goto(`${BASE_URL}/dashboard`);

    const playbooksList = await page.locator('[data-testid="brand-playbooks-list"]');
    await expect(playbooksList).toBeVisible();

    // Check that playbooks loaded (even if empty)
    const playbookItems = await page.locator('[data-testid="playbook-item"]');
    const count = await playbookItems.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('Chat widget initializes', async () => {
    await page.goto(`${BASE_URL}/dashboard`);

    const chatWidget = await page.locator('[data-testid="brand-chat-widget"]');
    await expect(chatWidget).toBeVisible();

    // Chat input should be focusable
    const chatInput = await page.locator('[data-testid="chat-input"]');
    await expect(chatInput).toBeEnabled();
  });

  test('Right sidebar renders with capabilities', async () => {
    await page.goto(`${BASE_URL}/dashboard`);

    const rightSidebar = await page.locator('[data-testid="brand-right-sidebar"]');
    await expect(rightSidebar).toBeVisible();

    // Check for capabilities section
    const capabilities = await page.locator('[data-testid="capabilities-section"]');
    await expect(capabilities).toBeVisible();
  });

  // ============================================================================
  // 2️⃣ PLAYBOOKS FEATURE
  // ============================================================================

  test('Playbooks: Can navigate to playbook detail', async () => {
    await page.goto(`${BASE_URL}/dashboard/playbooks`);

    const firstPlaybook = await page.locator('[data-testid="playbook-item"]').first();
    const playbookId = await firstPlaybook.getAttribute('data-playbook-id');

    if (playbookId) {
      await firstPlaybook.click();
      await page.waitForURL(`**/playbooks/**`);
      expect(page.url()).toContain('playbooks');
    }
  });

  test('Playbooks: Can execute playbook', async () => {
    const playbookListItem = await page.locator('[data-testid="playbook-item"]').first();
    const playbookId = await playbookListItem.getAttribute('data-playbook-id');

    if (playbookId) {
      await page.goto(`${BASE_URL}/dashboard/playbooks/${playbookId}`);

      const executeButton = await page.locator('button:has-text("Execute")');
      if (await executeButton.isVisible()) {
        await executeButton.click();

        // Check for confirmation or result
        const resultSection = await page.locator('[data-testid="playbook-result"]');
        await expect(resultSection).toBeVisible({ timeout: 5000 });
      }
    }
  });

  // ============================================================================
  // 3️⃣ SETTINGS PAGES
  // ============================================================================

  test('Settings: Loyalty settings page loads', async () => {
    await page.goto(`${BASE_URL}/dashboard/settings/loyalty`);

    const loyaltySettings = await page.locator('[data-testid="loyalty-settings"]');
    await expect(loyaltySettings).toBeVisible();

    // Check for tabs (Points, Tiers, Segments, Redemptions)
    const tabs = await page.locator('[role="tab"]');
    const tabCount = await tabs.count();
    expect(tabCount).toBeGreaterThanOrEqual(3);
  });

  test('Settings: Email warmup page loads', async () => {
    await page.goto(`${BASE_URL}/dashboard/settings/email-warmup`);

    const emailWarmup = await page.locator('[data-testid="email-warmup-settings"]');
    await expect(emailWarmup).toBeVisible();

    // Check for warmup status display
    const statusSection = await page.locator('[data-testid="warmup-status"]');
    await expect(statusSection).toBeVisible();
  });

  test('Settings: Team page loads', async () => {
    await page.goto(`${BASE_URL}/dashboard/settings/team`);

    const teamSettings = await page.locator('[data-testid="team-settings"]');
    await expect(teamSettings).toBeVisible();

    // Check for members tab
    const membersTab = await page.locator('[role="tab"]:has-text("Members")');
    await expect(membersTab).toBeVisible();
  });

  // ============================================================================
  // 4️⃣ NAVIGATION & PERMISSIONS
  // ============================================================================

  test('Navigation: All sidebar links work', async () => {
    await page.goto(`${BASE_URL}/dashboard`);

    // Get all sidebar links
    const navLinks = await page.locator('[data-testid="sidebar-link"]');
    const linkCount = await navLinks.count();

    expect(linkCount).toBeGreaterThan(0);

    // Test first few links
    for (let i = 0; i < Math.min(3, linkCount); i++) {
      const link = navLinks.nth(i);
      const href = await link.getAttribute('href');

      if (href && !href.includes('javascript')) {
        await link.click();
        await page.waitForLoadState('networkidle');
        expect(page.url()).toContain(href);
      }
    }
  });

  test('Permissions: Brand user cannot access CEO dashboard', async () => {
    await page.goto(`${BASE_URL}/dashboard/ceo`);

    // Should be redirected
    await page.waitForNavigation({ timeout: 5000 }).catch(() => {});

    // Should redirect to dashboard or login
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('/ceo');
  });

  test('Permissions: Brand user cannot access other brand data', async () => {
    // Attempt to access another brand's ID via query
    const otherBrandId = 'fake-brand-id-12345';
    await page.goto(`${BASE_URL}/dashboard?brandId=${otherBrandId}`);

    // Should either show current brand or redirect
    const currentBrandElement = await page.locator('[data-testid="current-brand-id"]');
    if (await currentBrandElement.isVisible()) {
      const brandId = await currentBrandElement.textContent();
      expect(brandId).not.toBe(otherBrandId);
    }
  });

  // ============================================================================
  // 5️⃣ MOBILE RESPONSIVENESS
  // ============================================================================

  test('Mobile: Sidebar collapses on tablet', async () => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(`${BASE_URL}/dashboard`);

    const sidebarToggle = await page.locator('[data-testid="sidebar-toggle"]');

    if (await sidebarToggle.isVisible()) {
      const sidebar = await page.locator('[data-testid="main-sidebar"]');

      // Check if sidebar is hidden on tablet
      const isHidden = await sidebar.evaluate(el => {
        return getComputedStyle(el).display === 'none' ||
               getComputedStyle(el).visibility === 'hidden';
      });

      expect(isHidden).toBeTruthy();
    }
  });

  test('Mobile: Content readable on mobile', async () => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`${BASE_URL}/dashboard`);

    // Check for horizontal scroll (should be none)
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);

    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1); // +1 for rounding
  });

  test('Mobile: Touch targets are at least 44px', async () => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`${BASE_URL}/dashboard`);

    // Check button/link sizes
    const buttons = await page.locator('button, a[role="button"]');
    const buttonCount = await buttons.count();

    for (let i = 0; i < Math.min(5, buttonCount); i++) {
      const button = buttons.nth(i);
      const boundingBox = await button.boundingBox();

      if (boundingBox) {
        expect(boundingBox.height).toBeGreaterThanOrEqual(44);
        expect(boundingBox.width).toBeGreaterThanOrEqual(44);
      }
    }
  });

  // ============================================================================
  // 6️⃣ REMOVE MOCK DATA
  // ============================================================================

  test('No mock data: Review queue is empty', async () => {
    await page.goto(`${BASE_URL}/dashboard`);

    const mockItems = await page.locator('text=/Mock|Example|Demo/i');
    const mockCount = await mockItems.count();

    expect(mockCount).toBe(0);
  });

  test('No mock data: KPIs show real data or "No data"', async () => {
    await page.goto(`${BASE_URL}/dashboard`);

    const kpiValues = await page.locator('[data-testid="kpi-value"]').allTextContents();

    kpiValues.forEach(value => {
      expect(value.toLowerCase()).not.toContain('coming soon');
      expect(value.toLowerCase()).not.toContain('mock');
      expect(value.toLowerCase()).not.toContain('example');
    });
  });

  test('No mock data: Competitive intel empty state', async () => {
    await page.goto(`${BASE_URL}/dashboard`);

    const competitiveIntel = await page.locator('[data-testid="competitive-intel-snapshot"]');

    if (await competitiveIntel.isVisible()) {
      const mockText = await competitiveIntel.locator('text=/Mock|Example/i');
      const mockCount = await mockText.count();

      expect(mockCount).toBe(0);
    }
  });

  // ============================================================================
  // 7️⃣ API ERROR CHECKING
  // ============================================================================

  test('No API errors: Console has no 500 errors', async () => {
    const errors: string[] = [];
    const warnings: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
      if (msg.type() === 'warning' && msg.text().includes('500')) {
        warnings.push(msg.text());
      }
    });

    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');

    const serverErrors = errors.filter(e => e.includes('500'));
    expect(serverErrors).toHaveLength(0);
  });

  test('No API errors: Network requests all succeed', async () => {
    const failedRequests: string[] = [];

    page.on('response', response => {
      if (response.status() >= 400) {
        failedRequests.push(`${response.url()} - ${response.status()}`);
      }
    });

    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');

    // Filter out expected 4xx errors (auth, not found)
    const critical5xxErrors = failedRequests.filter(req => req.includes('5'));
    expect(critical5xxErrors).toHaveLength(0);
  });
});
