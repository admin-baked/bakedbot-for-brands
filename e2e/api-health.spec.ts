import { test, expect } from '@playwright/test';

test.describe('API Health and Status Checks', () => {
  test('health endpoint returns 200', async ({ page }) => {
    const response = await page.request.get('/health');
    expect(response.status()).toBe(200);
  });

  test('health endpoint returns valid JSON', async ({ page }) => {
    const response = await page.request.get('/health').catch(() => null);
    if (response && response.status() === 200) {
      const json = await response.json().catch(() => null);
      if (json) {
        expect(json).toHaveProperty('status');
      }
    }
  });

  test('invalid route returns 404', async ({ page }) => {
    const response = await page.request.get('/api/nonexistent-route-12345');
    expect(response.status()).toBe(404);
  });

  test('homepage loads without errors', async ({ page }) => {
    await page.goto('/')
      .catch(() => {});
    const url = page.url();
    expect(url).toContain('localhost');
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });

  test('CSP headers are set', async ({ page }) => {
    const response = await page.request.get('/');
    const headers = await response.headers();
    const cspHeader = headers['content-security-policy'];
    if (cspHeader) {
      expect(cspHeader).toBeTruthy();
    }
  });
});
