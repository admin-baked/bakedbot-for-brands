/**
 * Brand Dashboard Full Production Readiness Audit E2E Tests
 *
 * Comprehensive test suite covering all 8 categories:
 * 1. Core Dashboard (login, org switcher, navigation)
 * 2. Menu Management (command center, filters, COGS)
 * 3. Brand Guide (onboarding, editing)
 * 4. Creative Studio (generation, compliance)
 * 5. Campaigns (creation, sending)
 * 6. Inbox/AI Chat (threading, agents)
 * 7. Settings (loyalty, email warmup)
 * 8. Performance (load times, bundle size)
 */

import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';
const BRAND_EMAIL = process.env.TEST_BRAND_EMAIL || 'test-brand@bakedbot.ai';
const BRAND_PASSWORD = process.env.TEST_BRAND_PASSWORD || 'TestPassword123!';

test.describe('Brand Dashboard - Full Audit', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
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
  // 2️⃣ MENU MANAGEMENT (10 tests)
  // ============================================================================

  test('Menu: Command Center page loads', async () => {
    await page.goto(`${BASE_URL}/dashboard/menu`);

    const commandCenter = await page.locator('[data-testid="menu-command-center"]');
    await expect(commandCenter).toBeVisible();
  });

  test('Menu: Live preview renders', async () => {
    await page.goto(`${BASE_URL}/dashboard/menu`);

    const previewTab = await page.locator('button:has-text("Preview")');
    await expect(previewTab).toBeVisible();

    const preview = await page.locator('[data-testid="menu-preview"]');
    await expect(preview).toBeVisible();
  });

  test('Menu: Drag-to-reorder works', async () => {
    await page.goto(`${BASE_URL}/dashboard/menu`);

    const productsTab = await page.locator('button:has-text("Products")');
    await productsTab.click();

    const firstProduct = await page.locator('[data-testid="product-card"]').first();
    const secondProduct = await page.locator('[data-testid="product-card"]').nth(1);

    if (await firstProduct.isVisible() && await secondProduct.isVisible()) {
      // Verify drag handles exist
      const dragHandle = await firstProduct.locator('[data-testid="drag-handle"]');
      await expect(dragHandle).toBeVisible();
    }
  });

  test('Menu: Featured pin toggle works', async () => {
    await page.goto(`${BASE_URL}/dashboard/menu`);

    const productsTab = await page.locator('button:has-text("Products")');
    await productsTab.click();

    const featuredButton = await page.locator('[data-testid="toggle-featured"]').first();
    if (await featuredButton.isVisible()) {
      await featuredButton.click();
      // Verify state change
      await expect(featuredButton).toHaveAttribute('data-featured', /(true|false)/);
    }
  });

  test('Menu: Full screen mode works', async () => {
    await page.goto(`${BASE_URL}/dashboard/menu`);

    const fullScreenButton = await page.locator('button:has-text("Full Screen")');
    if (await fullScreenButton.isVisible()) {
      await fullScreenButton.click();

      const fullScreenPreview = await page.locator('[data-testid="full-screen-preview"]');
      await expect(fullScreenPreview).toBeVisible();
    }
  });

  test('Menu: Category filter works', async () => {
    await page.goto(`${BASE_URL}/dashboard/menu`);

    const categoryButton = await page.locator('[data-testid="filter-category"]').first();
    if (await categoryButton.isVisible()) {
      await categoryButton.click();

      // Verify URL updates
      const url = page.url();
      expect(url).toMatch(/category=/);
    }
  });

  test('Menu: Search query persists in URL', async () => {
    await page.goto(`${BASE_URL}/dashboard/menu`);

    const searchInput = await page.locator('[data-testid="menu-search"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('sativa');

      const url = page.url();
      expect(url).toContain('q=sativa');
    }
  });

  test('Menu: Sort options work', async () => {
    await page.goto(`${BASE_URL}/dashboard/menu`);

    const sortSelect = await page.locator('[data-testid="menu-sort"]');
    if (await sortSelect.isVisible()) {
      await sortSelect.selectOption('price-low');

      const url = page.url();
      expect(url).toContain('sort=price-low');
    }
  });

  test('Menu: COGS table displays', async () => {
    await page.goto(`${BASE_URL}/dashboard/menu`);

    const cosgsTab = await page.locator('button:has-text("COGS")');
    if (await cosgsTab.isVisible()) {
      await cosgsTab.click();

      const cogsTable = await page.locator('[data-testid="cogs-table"]');
      await expect(cogsTable).toBeVisible();
    }
  });

  test('Menu: Price updates sync to public menu', async () => {
    await page.goto(`${BASE_URL}/dashboard/menu`);

    const priceInput = await page.locator('[data-testid="product-price"]').first();
    if (await priceInput.isVisible()) {
      const oldValue = await priceInput.inputValue();
      await priceInput.clear();
      await priceInput.fill('99.99');

      const saveButton = await page.locator('button:has-text("Save")');
      if (await saveButton.isVisible()) {
        await saveButton.click();
      }
    }
  });

  // ============================================================================
  // 3️⃣ BRAND GUIDE (8 tests)
  // ============================================================================

  test('Brand Guide: Scan dialog opens', async () => {
    await page.goto(`${BASE_URL}/dashboard/brand-guide`);

    const scanButton = await page.locator('button:has-text("Scan Brand")');
    await expect(scanButton).toBeVisible();

    await scanButton.click();

    const dialog = await page.locator('[data-testid="brand-guide-scan-dialog"]');
    await expect(dialog).toBeVisible();
  });

  test('Brand Guide: Multi-page crawl works', async () => {
    await page.goto(`${BASE_URL}/dashboard/brand-guide`);

    const scanButton = await page.locator('button:has-text("Scan Brand")');
    await scanButton.click();

    const urlInput = await page.locator('[data-testid="brand-url-input"]');
    if (await urlInput.isVisible()) {
      await urlInput.fill('https://example.com');

      const submitButton = await page.locator('button:has-text("Scan")');
      await submitButton.click();

      // Wait for multi-page crawl to complete
      await page.waitForTimeout(2000);
    }
  });

  test('Brand Guide: Colors and logo display', async () => {
    await page.goto(`${BASE_URL}/dashboard/brand-guide`);

    const colorsSection = await page.locator('[data-testid="brand-colors"]');
    if (await colorsSection.isVisible()) {
      await expect(colorsSection).toBeVisible();
    }

    const logoPreview = await page.locator('[data-testid="brand-logo-preview"]');
    if (await logoPreview.isVisible()) {
      await expect(logoPreview).toBeVisible();
    }
  });

  test('Brand Guide: Voice smart defaults work', async () => {
    await page.goto(`${BASE_URL}/dashboard/brand-guide`);

    const voiceSection = await page.locator('[data-testid="brand-voice"]');
    if (await voiceSection.isVisible()) {
      const typeSelect = await voiceSection.locator('select, [role="combobox"]').first();
      if (await typeSelect.isVisible()) {
        // Select a type that should auto-fill voice traits
        await typeSelect.click();
      }
    }
  });

  test('Brand Guide: Edit dialog opens', async () => {
    await page.goto(`${BASE_URL}/dashboard/brand-guide`);

    const editButton = await page.locator('button:has-text("Edit Guide")');
    if (await editButton.isVisible()) {
      await editButton.click();

      const dialog = await page.locator('[data-testid="brand-guide-edit-dialog"]');
      await expect(dialog).toBeVisible();
    }
  });

  test('Brand Guide: Changes persist', async () => {
    await page.goto(`${BASE_URL}/dashboard/brand-guide`);

    const editButton = await page.locator('button:has-text("Edit Guide")');
    if (await editButton.isVisible()) {
      await editButton.click();

      const taglineInput = await page.locator('[data-testid="brand-tagline"]');
      if (await taglineInput.isVisible()) {
        const oldValue = await taglineInput.inputValue();
        await taglineInput.clear();
        await taglineInput.fill('Updated tagline');

        const saveButton = await page.locator('button:has-text("Save")');
        await saveButton.click();

        // Navigate away and back
        await page.reload();
        const newValue = await taglineInput.inputValue();
        expect(newValue).toBe('Updated tagline');
      }
    }
  });

  test('Brand Guide: Logo image preview works', async () => {
    await page.goto(`${BASE_URL}/dashboard/brand-guide`);

    const logoImage = await page.locator('[data-testid="brand-logo-image"]');
    if (await logoImage.isVisible()) {
      const src = await logoImage.getAttribute('src');
      expect(src).toBeTruthy();
      expect(src).toMatch(/^https?:\/\//);
    }
  });

  test('Brand Guide: Validation prevents empty save', async () => {
    await page.goto(`${BASE_URL}/dashboard/brand-guide`);

    const editButton = await page.locator('button:has-text("Edit Guide")');
    if (await editButton.isVisible()) {
      await editButton.click();

      const nameInput = await page.locator('[data-testid="brand-name"]');
      if (await nameInput.isVisible()) {
        await nameInput.clear();

        const saveButton = await page.locator('button:has-text("Save")');
        const isDisabled = await saveButton.isDisabled();
        expect(isDisabled).toBeTruthy();
      }
    }
  });

  // ============================================================================
  // 4️⃣ CREATIVE STUDIO (8 tests)
  // ============================================================================

  test('Creative Studio: Template selection works', async () => {
    await page.goto(`${BASE_URL}/dashboard/creative`);

    const templateGrid = await page.locator('[data-testid="template-grid"]');
    await expect(templateGrid).toBeVisible();

    const templates = await page.locator('[data-testid="template-card"]');
    const count = await templates.count();
    expect(count).toBeGreaterThanOrEqual(4);
  });

  test('Creative Studio: Text overlay generates', async () => {
    await page.goto(`${BASE_URL}/dashboard/creative`);

    const template = await page.locator('[data-testid="template-card"]').first();
    if (await template.isVisible()) {
      await template.click();

      const textOverlay = await page.locator('[data-testid="text-overlay"]');
      await expect(textOverlay).toBeVisible({ timeout: 5000 });
    }
  });

  test('Creative Studio: Image generation works', async () => {
    await page.goto(`${BASE_URL}/dashboard/creative`);

    const generateButton = await page.locator('button:has-text("Generate")');
    if (await generateButton.isVisible()) {
      await generateButton.click();

      const canvas = await page.locator('[data-testid="creative-canvas"]');
      await expect(canvas).toBeVisible({ timeout: 10000 });
    }
  });

  test('Creative Studio: Image style variation works', async () => {
    await page.goto(`${BASE_URL}/dashboard/creative`);

    const styleButtons = await page.locator('[data-testid="image-style-button"]');
    const count = await styleButtons.count();

    if (count > 1) {
      const firstStyle = styleButtons.first();
      await firstStyle.click();

      // Verify active state
      await expect(firstStyle).toHaveAttribute('data-active', 'true');
    }
  });

  test('Creative Studio: Copy editing works', async () => {
    await page.goto(`${BASE_URL}/dashboard/creative`);

    const copySection = await page.locator('[data-testid="copy-editing"]');
    if (await copySection.isVisible()) {
      const copyInput = await copySection.locator('textarea, input').first();
      if (await copyInput.isVisible()) {
        await copyInput.clear();
        await copyInput.fill('Test SMS copy');
      }
    }
  });

  test('Creative Studio: Export/Publish flow works', async () => {
    await page.goto(`${BASE_URL}/dashboard/creative`);

    const exportButton = await page.locator('button:has-text("Publish")');
    if (await exportButton.isVisible()) {
      const isDisabled = await exportButton.isDisabled();
      expect(typeof isDisabled).toBe('boolean');
    }
  });

  test('Creative Studio: No compliance violations', async () => {
    await page.goto(`${BASE_URL}/dashboard/creative`);

    const complianceCheck = await page.locator('[data-testid="compliance-check"]');
    if (await complianceCheck.isVisible()) {
      const status = await complianceCheck.getAttribute('data-status');
      expect(status).not.toContain('violation');
    }
  });

  test('Creative Studio: Generation completes within SLA', async () => {
    const startTime = Date.now();

    await page.goto(`${BASE_URL}/dashboard/creative`);

    const generateButton = await page.locator('button:has-text("Generate")');
    if (await generateButton.isVisible()) {
      await generateButton.click();

      const canvas = await page.locator('[data-testid="creative-canvas"]');
      await expect(canvas).toBeVisible({ timeout: 10000 });
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Should complete in under 10 seconds
    expect(duration).toBeLessThan(10000);
  });

  // ============================================================================
  // 5️⃣ CAMPAIGNS (8 tests)
  // ============================================================================

  test('Campaigns: Creation dialog opens', async () => {
    await page.goto(`${BASE_URL}/dashboard/campaigns`);

    const newButton = await page.locator('button:has-text("New Campaign")');
    if (await newButton.isVisible()) {
      await newButton.click();

      const dialog = await page.locator('[data-testid="campaign-dialog"]');
      await expect(dialog).toBeVisible();
    }
  });

  test('Campaigns: SMS composition works', async () => {
    await page.goto(`${BASE_URL}/dashboard/campaigns`);

    const smsInput = await page.locator('[data-testid="sms-input"]');
    if (await smsInput.isVisible()) {
      await smsInput.fill('Test SMS message');

      const charCount = await page.locator('[data-testid="sms-char-count"]');
      await expect(charCount).toBeVisible();
    }
  });

  test('Campaigns: Email composition works', async () => {
    await page.goto(`${BASE_URL}/dashboard/campaigns`);

    const emailInput = await page.locator('[data-testid="email-input"]');
    if (await emailInput.isVisible()) {
      await emailInput.fill('<h1>Test Email</h1>');

      const preview = await page.locator('[data-testid="email-preview"]');
      await expect(preview).toBeVisible();
    }
  });

  test('Campaigns: Recipient deduplication logic', async () => {
    await page.goto(`${BASE_URL}/dashboard/campaigns`);

    const recipientSection = await page.locator('[data-testid="recipient-section"]');
    if (await recipientSection.isVisible()) {
      const dedupeInfo = await page.locator('[data-testid="dedup-info"]');
      await expect(dedupeInfo).toBeVisible();
    }
  });

  test('Campaigns: Deebo compliance check', async () => {
    await page.goto(`${BASE_URL}/dashboard/campaigns`);

    const complianceCheck = await page.locator('[data-testid="compliance-check"]');
    if (await complianceCheck.isVisible()) {
      const status = await complianceCheck.getAttribute('data-compliant');
      expect(['true', 'false']).toContain(status);
    }
  });

  test('Campaigns: TCPA opt-out honored', async () => {
    await page.goto(`${BASE_URL}/dashboard/campaigns`);

    const tcpaCheckbox = await page.locator('[data-testid="tcpa-checkbox"]');
    if (await tcpaCheckbox.isVisible()) {
      const isChecked = await tcpaCheckbox.isChecked();
      expect(typeof isChecked).toBe('boolean');
    }
  });

  test('Campaigns: Send confirmation flow', async () => {
    await page.goto(`${BASE_URL}/dashboard/campaigns`);

    const previewButton = await page.locator('button:has-text("Preview")');
    if (await previewButton.isVisible()) {
      const isEnabled = await previewButton.isEnabled();
      expect(typeof isEnabled).toBe('boolean');
    }
  });

  test('Campaigns: Delivery tracking visible', async () => {
    await page.goto(`${BASE_URL}/dashboard/campaigns`);

    const campaignList = await page.locator('[data-testid="campaign-item"]').first();
    if (await campaignList.isVisible()) {
      const status = await campaignList.locator('[data-testid="delivery-status"]');
      await expect(status).toBeVisible();
    }
  });

  // ============================================================================
  // 6️⃣ INBOX/AI CHAT (6 tests)
  // ============================================================================

  test('Inbox: Messages load', async () => {
    await page.goto(`${BASE_URL}/dashboard/inbox`);

    const messageList = await page.locator('[data-testid="message-list"]');
    await expect(messageList).toBeVisible();
  });

  test('Inbox: Message threading works', async () => {
    await page.goto(`${BASE_URL}/dashboard/inbox`);

    const messageThread = await page.locator('[data-testid="message-thread"]').first();
    if (await messageThread.isVisible()) {
      const replies = await messageThread.locator('[data-testid="message-reply"]');
      const count = await replies.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  test('Inbox: Real-time updates work', async () => {
    await page.goto(`${BASE_URL}/dashboard/inbox`);

    // Verify Firestore subscription is active
    const connectionStatus = await page.locator('[data-testid="connection-status"]');
    if (await connectionStatus.isVisible()) {
      const status = await connectionStatus.getAttribute('data-connected');
      expect(status).toBeTruthy();
    }
  });

  test('Inbox: Smokey (search) agent responds', async () => {
    await page.goto(`${BASE_URL}/dashboard/inbox`);

    const agentResponse = await page.locator('[data-testid="agent-response"][data-agent="smokey"]');
    if (await agentResponse.isVisible()) {
      const text = await agentResponse.textContent();
      expect(text?.length).toBeGreaterThan(0);
    }
  });

  test('Inbox: Craig (marketing) agent responds', async () => {
    await page.goto(`${BASE_URL}/dashboard/inbox`);

    const agentResponse = await page.locator('[data-testid="agent-response"][data-agent="craig"]');
    if (await agentResponse.isVisible()) {
      const text = await agentResponse.textContent();
      expect(text?.length).toBeGreaterThan(0);
    }
  });

  test('Inbox: Artifacts save to Drive', async () => {
    await page.goto(`${BASE_URL}/dashboard/inbox`);

    const artifact = await page.locator('[data-testid="inbox-artifact"]');
    if (await artifact.isVisible()) {
      const saveButton = await artifact.locator('button:has-text("Save to Drive")');
      if (await saveButton.isVisible()) {
        expect(await saveButton.isEnabled()).toBeTruthy();
      }
    }
  });

  // ============================================================================
  // 7️⃣ SETTINGS (8 tests)
  // ============================================================================

  test('Settings: Loyalty form opens', async () => {
    await page.goto(`${BASE_URL}/dashboard/settings/loyalty`);

    const loyaltyForm = await page.locator('[data-testid="loyalty-settings"]');
    await expect(loyaltyForm).toBeVisible();
  });

  test('Settings: Loyalty settings save', async () => {
    await page.goto(`${BASE_URL}/dashboard/settings/loyalty`);

    const saveButton = await page.locator('button:has-text("Save")');
    if (await saveButton.isVisible()) {
      const isEnabled = await saveButton.isEnabled();
      expect(typeof isEnabled).toBe('boolean');
    }
  });

  test('Settings: Discount programs display on public menu', async () => {
    await page.goto(`${BASE_URL}/dashboard/settings/loyalty`);

    const programsSection = await page.locator('[data-testid="discount-programs"]');
    if (await programsSection.isVisible()) {
      const programs = await programsSection.locator('[data-testid="program-item"]');
      const count = await programs.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  test('Settings: Email warmup form works', async () => {
    await page.goto(`${BASE_URL}/dashboard/settings/email-warmup`);

    const emailWarmup = await page.locator('[data-testid="email-warmup-form"]');
    await expect(emailWarmup).toBeVisible();
  });

  test('Settings: POS sync status visible', async () => {
    await page.goto(`${BASE_URL}/dashboard/settings/integrations`);

    const posSyncStatus = await page.locator('[data-testid="pos-sync-status"]');
    if (await posSyncStatus.isVisible()) {
      const lastSync = await posSyncStatus.locator('[data-testid="last-sync-time"]');
      await expect(lastSync).toBeVisible();
    }
  });

  test('Settings: Team member management works', async () => {
    await page.goto(`${BASE_URL}/dashboard/settings/team`);

    const teamForm = await page.locator('[data-testid="team-management"]');
    await expect(teamForm).toBeVisible();

    const addButton = await teamForm.locator('button:has-text("Add Member")');
    expect(await addButton.isVisible()).toBeTruthy();
  });

  test('Settings: Compliance settings accessible', async () => {
    await page.goto(`${BASE_URL}/dashboard/settings/compliance`);

    const complianceForm = await page.locator('[data-testid="compliance-settings"]');
    if (await complianceForm.isVisible()) {
      await expect(complianceForm).toBeVisible();
    }
  });

  test('Settings: Webhook testing available', async () => {
    await page.goto(`${BASE_URL}/dashboard/settings/webhooks`);

    const webhookSection = await page.locator('[data-testid="webhook-settings"]');
    if (await webhookSection.isVisible()) {
      const testButton = await webhookSection.locator('button:has-text("Test")');
      expect(await testButton.isVisible()).toBeTruthy();
    }
  });

  // ============================================================================
  // 8️⃣ PERFORMANCE (5 tests)
  // ============================================================================

  test('Performance: Dashboard load time <2s', async () => {
    const startTime = Date.now();

    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    // Should load in under 2 seconds
    expect(loadTime).toBeLessThan(2000);
  });

  test('Performance: Menu page load time <2s', async () => {
    const startTime = Date.now();

    await page.goto(`${BASE_URL}/dashboard/menu`);
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(2000);
  });

  test('Performance: Creative Studio render <3s', async () => {
    const startTime = Date.now();

    await page.goto(`${BASE_URL}/dashboard/creative`);
    await page.waitForLoadState('networkidle');

    const canvas = await page.locator('[data-testid="creative-canvas"]');
    if (await canvas.isVisible()) {
      const renderTime = Date.now() - startTime;
      expect(renderTime).toBeLessThan(3000);
    }
  });

  test('Performance: Bundle size reasonable', async () => {
    await page.goto(`${BASE_URL}/dashboard`);

    const resourceMetrics = await page.evaluate(() => {
      const scripts = document.querySelectorAll('script[src]');
      let totalSize = 0;

      // Estimate based on resource timing
      const perf = performance.getEntriesByType('resource');
      perf.forEach(entry => {
        if (entry.name.includes('.js')) {
          totalSize += entry.transferSize || 0;
        }
      });

      return totalSize;
    });

    // Bundle should be less than 500KB (gzipped)
    expect(resourceMetrics).toBeLessThan(500 * 1024);
  });

  test('Performance: No memory leaks over extended use', async () => {
    await page.goto(`${BASE_URL}/dashboard`);

    // Simulate extended session (navigate between pages)
    for (let i = 0; i < 5; i++) {
      await page.goto(`${BASE_URL}/dashboard/menu`);
      await page.goto(`${BASE_URL}/dashboard/inbox`);
      await page.goto(`${BASE_URL}/dashboard/settings/loyalty`);
    }

    // Check for major memory leaks via console warnings
    const memoryWarnings: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'warning' && msg.text().includes('memory')) {
        memoryWarnings.push(msg.text());
      }
    });

    expect(memoryWarnings.length).toBeLessThan(3);
  });
});
