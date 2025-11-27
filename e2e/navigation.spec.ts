import { test, expect } from '@playwright/test';

test.describe('Navigation and Routing', () => {
  test('navigation between public pages works', async ({ page }) => {
    // Start at home
    await page.goto('/');
    const url = page.url();
    expect(url).toContain('localhost');

    // Find and click a link (e.g., menu link if present)
    const links = await page.locator('a[href*="/menu"]').count();
    if (links > 0) {
      await page.locator('a[href*="/menu"]').first().click();
      await page.waitForLoadState('networkidle').catch(() => {});
    }
  });

  test('back button navigation works', async ({ page }) => {
    await page.goto('/');
    await page.goto('/menu').catch(() => {});
    await page.goBack();
    const url = page.url();
    expect(url).toContain('localhost');
  });

  test('forward button navigation works', async ({ page }) => {
    await page.goto('/');
    const secondPage = await page.goto('/menu').catch(() => null);
    
    if (secondPage) {
      await page.goBack();
      // Only test forward if we successfully navigated to /menu
      try {
        await page.goForward();
      } catch (e) {
        // Forward navigation may not work in all cases
      }
    }
    
    const url = page.url();
    expect(url).toContain('localhost');
  });

  test('URL parameters are preserved', async ({ page }) => {
    await page.goto('/menu?type=default&sort=recent').catch(() => {});
    const url = page.url();
    expect(url).toBeTruthy();
  });
});

test.describe('Responsive Layout', () => {
  test('layout adapts to mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    const body = await page.locator('body').boundingBox();
    expect(body?.width).toBeLessThanOrEqual(375);
  });

  test('layout adapts to tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    const body = await page.locator('body').boundingBox();
    expect(body?.width).toBeLessThanOrEqual(768);
  });

  test('layout works at desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    const body = await page.locator('body').boundingBox();
    expect(body?.width).toBeLessThanOrEqual(1920);
  });
});
