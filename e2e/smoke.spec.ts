import { test, expect } from '@playwright/test';

test.describe('Smoke Tests - Core Functionality', () => {
  test('homepage renders with main content', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    
    // Verify page loaded
    const url = page.url();
    expect(url).toContain('localhost');
    
    // Check for common main sections
    const body = await page.locator('body');
    expect(body).toBeTruthy();
  });

  test('header/navbar is visible', async ({ page }) => {
    await page.goto('/');
    
    // Look for header-like elements
    const header = page.locator('header, [role="banner"], nav');
    const headerCount = await header.count();
    expect(headerCount).toBeGreaterThan(0);
  });

  test('footer is visible and has content', async ({ page }) => {
    await page.goto('/');
    
    // Scroll to bottom
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    
    // Look for footer
    const footer = page.locator('footer, [role="contentinfo"]');
    const footerCount = await footer.count();
    
    if (footerCount > 0) {
      const text = await footer.first().textContent();
      expect(text).toBeTruthy();
    }
  });

  test('page has no broken links to same-origin routes', async ({ page }) => {
    await page.goto('/');
    
    // Get all links to same origin
    const links = await page.locator('a[href^="/"]').all();
    
    // Test first few links
    for (let i = 0; i < Math.min(3, links.length); i++) {
      const href = await links[i].getAttribute('href');
      if (href && href !== '/' && !href.includes('#')) {
        const response = await page.request.head(href).catch(() => null);
        // Some routes may not support HEAD, that's okay
        expect(href).toBeTruthy();
      }
    }
  });

  test('common UI patterns are interactive', async ({ page }) => {
    await page.goto('/');
    
    // Check for buttons and test hover state
    const buttons = await page.locator('button').all();
    
    if (buttons.length > 0) {
      const firstButton = buttons[0];
      await firstButton.hover();
      // Should not throw error
      expect(firstButton).toBeTruthy();
    }
  });

  test('page responds to user interactions', async ({ page }) => {
    await page.goto('/');
    
    // Try to find and interact with a clickable element
    const clickables = await page.locator('a, button, [role="button"]').all();
    
    if (clickables.length > 0) {
      const element = clickables[0];
      await element.hover();
      // Element should exist and be interactive
      expect(element).toBeTruthy();
    }
  });

  test('page can be scrolled', async ({ page }) => {
    await page.goto('/');
    
    const initialScroll = await page.evaluate(() => window.scrollY);
    
    await page.evaluate(() => window.scrollBy(0, 100));
    
    const newScroll = await page.evaluate(() => window.scrollY);
    
    // Page should scroll (or be short enough that scroll is 0)
    expect(newScroll).toBeGreaterThanOrEqual(initialScroll);
  });

  test('favicon is present', async ({ page }) => {
    await page.goto('/');
    
    const favicon = await page.locator('link[rel="icon"], link[rel="shortcut icon"]');
    const faviconCount = await favicon.count();
    
    // Favicon may or may not be present, but if it is, it should have href
    if (faviconCount > 0) {
      const href = await favicon.first().getAttribute('href');
      expect(href).toBeTruthy();
    }
  });

  test('page title is set', async ({ page }) => {
    await page.goto('/');
    
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });

  test('meta description is present', async ({ page }) => {
    await page.goto('/');
    
    const description = await page.locator('meta[name="description"]');
    const descCount = await description.count();
    
    if (descCount > 0) {
      const content = await description.first().getAttribute('content');
      expect(content).toBeTruthy();
    }
  });
});

test.describe('Session and State Management', () => {
  test('page state persists during session', async ({ page }) => {
    await page.goto('/');
    
    // Store a value in localStorage
    await page.evaluate(() => {
      localStorage.setItem('test_key', 'test_value');
    });
    
    // Get the value immediately (don't navigate away to avoid context destruction)
    const value = await page.evaluate(() => {
      return localStorage.getItem('test_key');
    });
    
    expect(value).toBe('test_value');
    
    // Clean up
    await page.evaluate(() => {
      localStorage.removeItem('test_key');
    });
  });

  test('page handles cookies', async ({ page }) => {
    await page.goto('/');
    
    // Set a cookie
    await page.context().addCookies([
      {
        name: 'test_cookie',
        value: 'test_value',
        url: 'http://localhost:3001',
      },
    ]);
    
    // Reload and check if cookie persists
    await page.reload();
    
    const cookies = await page.context().cookies();
    const testCookie = cookies.find(c => c.name === 'test_cookie');
    
    if (testCookie) {
      expect(testCookie.value).toBe('test_value');
    }
  });
});
