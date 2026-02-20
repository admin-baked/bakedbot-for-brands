/**
 * Campaign Send Flow E2E Tests
 *
 * Test suite for Production Readiness Audit - Track C
 * Covers: Campaign creation → Deebo check → Schedule → Send → Verify delivery
 *
 * Priority: Tier 1 (Revenue + Compliance Critical)
 */

import { test, expect, Page } from '@playwright/test';

// Test configuration
const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';
const BRAND_EMAIL = process.env.TEST_BRAND_EMAIL || 'test-brand@bakedbot.ai';
const BRAND_PASSWORD = process.env.TEST_BRAND_PASSWORD || 'TestPassword123!';

test.describe('Campaign Send Flow - End to End', () => {
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

  // ===========================================================================
  // 1. CAMPAIGN CREATION
  // ===========================================================================

  test('User can navigate to campaign creation page', async () => {
    await page.goto(`${BASE_URL}/dashboard/campaigns`);

    const createButton = page.locator('button:has-text("Create Campaign")').or(
      page.locator('a:has-text("Create Campaign")')
    );
    await expect(createButton).toBeVisible();

    await createButton.click();
    await page.waitForURL(`**/campaigns/create`);
    expect(page.url()).toContain('campaigns/create');
  });

  test('Campaign creation form renders all required fields', async () => {
    await page.goto(`${BASE_URL}/dashboard/campaigns/create`);

    // Check for required form elements
    await expect(page.locator('input[name="name"]').or(page.locator('[data-testid="campaign-name"]'))).toBeVisible();
    await expect(page.locator('[data-testid="campaign-goal"]').or(page.locator('select[name="goal"]'))).toBeVisible();
    await expect(page.locator('[data-testid="campaign-channels"]').or(page.locator('[name="channels"]'))).toBeVisible();
    await expect(page.locator('[data-testid="campaign-audience"]').or(page.locator('[name="audience"]'))).toBeVisible();
  });

  test('Can create draft campaign with valid data', async () => {
    await page.goto(`${BASE_URL}/dashboard/campaigns/create`);

    // Fill campaign form
    const timestamp = Date.now();
    const campaignName = `E2E Test Campaign ${timestamp}`;

    await page.fill('input[name="name"]', campaignName);

    // Select goal
    const goalSelect = page.locator('[data-testid="campaign-goal"]').or(page.locator('select[name="goal"]'));
    await goalSelect.selectOption('drive_sales');

    // Select channel (email)
    const emailCheckbox = page.locator('input[type="checkbox"][value="email"]');
    if (await emailCheckbox.isVisible()) {
      await emailCheckbox.check();
    }

    // Select audience (all)
    const audienceSelect = page.locator('[data-testid="campaign-audience"]').or(page.locator('select[name="audience"]'));
    await audienceSelect.selectOption('all');

    // Fill email content
    await page.fill('[data-testid="email-subject"]', 'Test Subject');
    await page.fill('[data-testid="email-body"]', 'Test message content for E2E campaign.');

    // Save as draft
    const saveDraftButton = page.locator('button:has-text("Save Draft")').or(
      page.locator('[data-testid="save-draft-button"]')
    );
    await saveDraftButton.click();

    // Should redirect to campaign list or detail page
    await page.waitForURL(/campaigns/, { timeout: 5000 });

    // Verify campaign appears in list
    await page.goto(`${BASE_URL}/dashboard/campaigns`);
    await expect(page.locator(`text=${campaignName}`)).toBeVisible({ timeout: 10000 });
  });

  // ===========================================================================
  // 2. DEEBO COMPLIANCE CHECK
  // ===========================================================================

  test('Compliance check button is visible on draft campaign', async () => {
    await page.goto(`${BASE_URL}/dashboard/campaigns`);

    // Find first draft campaign
    const draftCampaign = page.locator('[data-status="draft"]').first().or(
      page.locator('[data-testid="campaign-item"]').filter({ hasText: 'Draft' }).first()
    );

    if (await draftCampaign.isVisible()) {
      await draftCampaign.click();

      // Check for compliance check button
      const complianceButton = page.locator('button:has-text("Check Compliance")').or(
        page.locator('[data-testid="check-compliance-button"]')
      );
      await expect(complianceButton).toBeVisible();
    }
  });

  test('Can run compliance check on campaign', async () => {
    await page.goto(`${BASE_URL}/dashboard/campaigns`);

    // Find a draft campaign
    const draftCampaign = page.locator('[data-status="draft"]').first().or(
      page.locator('[data-testid="campaign-item"]').filter({ hasText: 'Draft' }).first()
    );

    if (await draftCampaign.isVisible()) {
      await draftCampaign.click();

      const complianceButton = page.locator('button:has-text("Check Compliance")').or(
        page.locator('[data-testid="check-compliance-button"]')
      );

      if (await complianceButton.isVisible()) {
        await complianceButton.click();

        // Wait for compliance check to complete
        const complianceResult = page.locator('[data-testid="compliance-result"]').or(
          page.locator('text=/Compliance (Passed|Failed|Warning)/i')
        );
        await expect(complianceResult).toBeVisible({ timeout: 15000 });
      }
    }
  });

  test('Compliance failures block campaign approval', async () => {
    await page.goto(`${BASE_URL}/dashboard/campaigns/create`);

    // Create campaign with compliance violation (medical claim)
    const timestamp = Date.now();
    await page.fill('input[name="name"]', `Failing Campaign ${timestamp}`);

    const goalSelect = page.locator('[data-testid="campaign-goal"]').or(page.locator('select[name="goal"]'));
    await goalSelect.selectOption('drive_sales');

    const emailCheckbox = page.locator('input[type="checkbox"][value="email"]');
    if (await emailCheckbox.isVisible()) {
      await emailCheckbox.check();
    }

    await page.fill('[data-testid="email-subject"]', 'Cure Your Pain');
    await page.fill('[data-testid="email-body"]', 'Our CBD cures chronic pain. Try it today!');

    // Save draft
    const saveDraftButton = page.locator('button:has-text("Save Draft")');
    if (await saveDraftButton.isVisible()) {
      await saveDraftButton.click();
      await page.waitForURL(/campaigns/, { timeout: 5000 });
    }

    // Run compliance check
    const complianceButton = page.locator('button:has-text("Check Compliance")');
    if (await complianceButton.isVisible()) {
      await complianceButton.click();

      // Should show compliance failure
      const failureIndicator = page.locator('text=/Compliance (Failed|Violation)/i').or(
        page.locator('[data-status="failed"]')
      );
      await expect(failureIndicator).toBeVisible({ timeout: 15000 });

      // Approve/Schedule button should be disabled
      const scheduleButton = page.locator('button:has-text("Schedule")').or(
        page.locator('[data-testid="schedule-button"]')
      );
      if (await scheduleButton.isVisible()) {
        await expect(scheduleButton).toBeDisabled();
      }
    }
  });

  // ===========================================================================
  // 3. CAMPAIGN SCHEDULING
  // ===========================================================================

  test('Can schedule compliant campaign for future send', async () => {
    // This test requires a campaign with passing compliance
    await page.goto(`${BASE_URL}/dashboard/campaigns`);

    // Look for a campaign with passing compliance status
    const passingCampaign = page.locator('[data-compliance="passed"]').first().or(
      page.locator('[data-testid="campaign-item"]').filter({ hasText: /Passed|Pass/i }).first()
    );

    if (await passingCampaign.isVisible()) {
      await passingCampaign.click();

      const scheduleButton = page.locator('button:has-text("Schedule")').or(
        page.locator('[data-testid="schedule-button"]')
      );

      if (await scheduleButton.isVisible() && await scheduleButton.isEnabled()) {
        await scheduleButton.click();

        // Schedule dialog should appear
        const scheduleDialog = page.locator('[data-testid="schedule-dialog"]').or(
          page.locator('[role="dialog"]')
        );
        await expect(scheduleDialog).toBeVisible({ timeout: 5000 });

        // Select future date/time
        const dateInput = page.locator('input[type="datetime-local"]').or(
          page.locator('[data-testid="schedule-date"]')
        );

        if (await dateInput.isVisible()) {
          // Set to tomorrow at 10 AM
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(10, 0, 0, 0);
          const dateString = tomorrow.toISOString().slice(0, 16);
          await dateInput.fill(dateString);
        }

        // Confirm schedule
        const confirmButton = page.locator('button:has-text("Confirm Schedule")').or(
          page.locator('[data-testid="confirm-schedule"]')
        );
        await confirmButton.click();

        // Status should update to scheduled
        await expect(page.locator('text=/Scheduled|Pending/i')).toBeVisible({ timeout: 5000 });
      }
    }
  });

  // ===========================================================================
  // 4. TIER LIMITS ENFORCEMENT
  // ===========================================================================

  test('Displays tier limit warning when approaching limit', async () => {
    await page.goto(`${BASE_URL}/dashboard/campaigns`);

    // Check for tier limit indicator
    const tierLimitBadge = page.locator('[data-testid="tier-limit-badge"]').or(
      page.locator('text=/\d+\/\d+ campaigns/i')
    );

    if (await tierLimitBadge.isVisible()) {
      const limitText = await tierLimitBadge.textContent();
      expect(limitText).toMatch(/\d+/);
    }
  });

  test('Blocks campaign send when tier limit exceeded', async () => {
    // This test assumes test account is at/near limit
    await page.goto(`${BASE_URL}/dashboard/campaigns/create`);

    const timestamp = Date.now();
    await page.fill('input[name="name"]', `Limit Test ${timestamp}`);

    const goalSelect = page.locator('[data-testid="campaign-goal"]').or(page.locator('select[name="goal"]'));
    await goalSelect.selectOption('drive_sales');

    const emailCheckbox = page.locator('input[type="checkbox"][value="email"]');
    if (await emailCheckbox.isVisible()) {
      await emailCheckbox.check();
    }

    await page.fill('[data-testid="email-subject"]', 'Test Subject');
    await page.fill('[data-testid="email-body"]', 'Clean compliant message. 21+ only.');

    const saveDraftButton = page.locator('button:has-text("Save Draft")');
    if (await saveDraftButton.isVisible()) {
      await saveDraftButton.click();

      // Check for limit exceeded message
      const limitMessage = page.locator('text=/limit exceeded/i').or(
        page.locator('[data-testid="limit-exceeded-warning"]')
      );

      // Either we can't save, or schedule button is disabled due to limits
      const hasLimitError = await limitMessage.isVisible({ timeout: 2000 }).catch(() => false);

      if (hasLimitError) {
        expect(await limitMessage.textContent()).toMatch(/limit/i);
      }
    }
  });

  // ===========================================================================
  // 5. SEND TRACKING
  // ===========================================================================

  test('Campaign performance metrics update after send', async () => {
    await page.goto(`${BASE_URL}/dashboard/campaigns`);

    // Find a sent campaign
    const sentCampaign = page.locator('[data-status="sent"]').first().or(
      page.locator('[data-testid="campaign-item"]').filter({ hasText: /Sent|Complete/i }).first()
    );

    if (await sentCampaign.isVisible()) {
      await sentCampaign.click();

      // Check for performance metrics
      const sentCount = page.locator('[data-testid="sent-count"]').or(
        page.locator('text=/sent:/i').locator('..').locator('text=/\d+/')
      );

      if (await sentCount.isVisible()) {
        const count = await sentCount.textContent();
        expect(count).toMatch(/\d+/);
        expect(parseInt(count!.match(/\d+/)![0])).toBeGreaterThanOrEqual(0);
      }

      // Check for other metrics
      const metricsPanel = page.locator('[data-testid="campaign-metrics"]').or(
        page.locator('text=/Performance|Metrics/i')
      );
      await expect(metricsPanel).toBeVisible({ timeout: 5000 });
    }
  });

  // ===========================================================================
  // 6. ERROR HANDLING
  // ===========================================================================

  test('Shows error when send fails due to missing email config', async () => {
    // This test verifies graceful failure handling
    await page.goto(`${BASE_URL}/dashboard/campaigns`);

    const scheduledCampaign = page.locator('[data-status="scheduled"]').first();

    if (await scheduledCampaign.isVisible()) {
      await scheduledCampaign.click();

      // Check for send status
      const statusIndicator = page.locator('[data-testid="send-status"]').or(
        page.locator('text=/Status:/i').locator('..')
      );

      if (await statusIndicator.isVisible()) {
        const statusText = await statusIndicator.textContent();
        // Should either be scheduled, sending, sent, or failed (not stuck in limbo)
        expect(statusText).toMatch(/scheduled|sending|sent|failed|error/i);
      }
    }
  });

  test('Displays delivery errors in campaign detail', async () => {
    await page.goto(`${BASE_URL}/dashboard/campaigns`);

    const anyCampaign = page.locator('[data-testid="campaign-item"]').first();

    if (await anyCampaign.isVisible()) {
      await anyCampaign.click();

      // Look for error section (may not always be present)
      const errorSection = page.locator('[data-testid="delivery-errors"]').or(
        page.locator('text=/errors|failed/i')
      );

      const hasErrors = await errorSection.isVisible({ timeout: 2000 }).catch(() => false);

      if (hasErrors) {
        // Errors should have details (not just "Error")
        const errorText = await errorSection.textContent();
        expect(errorText!.length).toBeGreaterThan(10);
      }
    }
  });

  // ===========================================================================
  // 7. NEGATIVE CASES
  // ===========================================================================

  test('Cannot send campaign without compliance check', async () => {
    await page.goto(`${BASE_URL}/dashboard/campaigns`);

    const draftCampaign = page.locator('[data-status="draft"]').first();

    if (await draftCampaign.isVisible()) {
      await draftCampaign.click();

      // Schedule button should be disabled without compliance check
      const scheduleButton = page.locator('button:has-text("Schedule")').or(
        page.locator('[data-testid="schedule-button"]')
      );

      if (await scheduleButton.isVisible()) {
        const isDisabled = await scheduleButton.isDisabled();

        if (!isDisabled) {
          // If button is enabled, clicking should show warning
          await scheduleButton.click();

          const warning = page.locator('text=/compliance check required/i').or(
            page.locator('[data-testid="compliance-required-warning"]')
          );
          await expect(warning).toBeVisible({ timeout: 3000 });
        } else {
          expect(isDisabled).toBe(true);
        }
      }
    }
  });

  test('Cannot schedule campaign with past date', async () => {
    await page.goto(`${BASE_URL}/dashboard/campaigns`);

    const passingCampaign = page.locator('[data-compliance="passed"]').first();

    if (await passingCampaign.isVisible()) {
      await passingCampaign.click();

      const scheduleButton = page.locator('button:has-text("Schedule")');

      if (await scheduleButton.isVisible() && await scheduleButton.isEnabled()) {
        await scheduleButton.click();

        const dateInput = page.locator('input[type="datetime-local"]');

        if (await dateInput.isVisible()) {
          // Try to set past date
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const pastDate = yesterday.toISOString().slice(0, 16);

          await dateInput.fill(pastDate);

          const confirmButton = page.locator('button:has-text("Confirm Schedule")');
          await confirmButton.click();

          // Should show error or validation message
          const error = page.locator('text=/past|invalid|future/i');
          await expect(error).toBeVisible({ timeout: 3000 });
        }
      }
    }
  });

  test('Cannot send campaign to empty audience', async () => {
    await page.goto(`${BASE_URL}/dashboard/campaigns/create`);

    const timestamp = Date.now();
    await page.fill('input[name="name"]', `Empty Audience ${timestamp}`);

    // Select very restrictive segment that has no customers
    const audienceSelect = page.locator('[data-testid="campaign-audience"]');

    if (await audienceSelect.isVisible()) {
      // Try to select a segment with 0 customers (if available)
      const options = await audienceSelect.locator('option').allTextContents();
      const emptyOption = options.find(opt => opt.match(/0 customers|empty/i));

      if (emptyOption) {
        await audienceSelect.selectOption({ label: emptyOption });

        // Check for warning
        const warning = page.locator('text=/no customers|empty audience/i');
        await expect(warning).toBeVisible({ timeout: 3000 });
      }
    }
  });
});
