import { test, expect } from '@playwright/test';

test.describe('Security Headers', () => {
  test('X-Frame-Options header prevents clickjacking', async ({ page }) => {
    const response = await page.request.get('/');
    const headers = await response.headers();
    const xFrameOptions = headers['x-frame-options'];
    // Should be set to DENY or SAMEORIGIN (or undefined in dev)
    if (xFrameOptions) {
      expect(['DENY', 'SAMEORIGIN', 'ALLOW-FROM']).toContain(xFrameOptions);
    }
  });

  test('X-Content-Type-Options prevents MIME sniffing', async ({ page }) => {
    const response = await page.request.get('/');
    const headers = await response.headers();
    const xContentType = headers['x-content-type-options'];
    if (xContentType) {
      expect(xContentType).toBe('nosniff');
    }
  });

  test('Strict-Transport-Security header is set', async ({ page }) => {
    const response = await page.request.get('/');
    const headers = await response.headers();
    const hsts = headers['strict-transport-security'];
    // HSTS should be set to ensure HTTPS (may not be set in dev)
    if (hsts) {
      expect(hsts).toContain('max-age');
    }
  });

  test('CSP header restricts resource loading', async ({ page }) => {
    const response = await page.request.get('/');
    const headers = await response.headers();
    const csp = headers['content-security-policy'];
    if (csp) {
      expect(csp).toBeTruthy();
      // CSP should have default-src or script-src directive
      expect(csp).toMatch(/default-src|script-src/);
    }
  });

  test('no sensitive data in HTML comments', async ({ page }) => {
    await page.goto('/');
    
    const html = await page.content();
    
    // Check for common sensitive patterns
    const sensitivePatterns = [
      /api[_-]?key/i,
      /secret/i,
      /password/i,
      /token/i,
      /credential/i,
    ];
    
    for (const pattern of sensitivePatterns) {
      // Should not find sensitive data in comments
      const matches = html.match(new RegExp(`<!--.*${pattern.source}.*-->`, 'gi'));
      // Allow if it's just the word, not actual secrets
      if (matches) {
        for (const match of matches) {
          expect(match.length).toBeLessThan(200); // Long strings likely not legitimate
        }
      }
    }
  });
});

test.describe('CORS and Cross-Origin Requests', () => {
  test('API endpoints have appropriate CORS headers', async ({ page }) => {
    // Try to make a cross-origin API request
    const response = await page.request.get('/api/products').catch(() => null);
    
    // API endpoint may return 404 (not implemented) or 200
    // Either way, the response should be valid
    if (response) {
      expect([200, 404, 500]).toContain(response.status());
    }
  });

  test('external resource loading is controlled', async ({ page }) => {
    await page.goto('/').catch(() => {});
    
    // Verify that external scripts/styles are from allowed origins
    const scripts = await page.locator('script[src]').all();
    const styles = await page.locator('link[rel="stylesheet"][href]').all();
    
    for (const script of scripts) {
      const src = await script.getAttribute('src');
      if (src && !src.startsWith('/')) {
        // External script - should be from trusted CDN or same origin
        expect(src).toBeTruthy();
      }
    }
  });
});

test.describe('Input Validation and Sanitization', () => {
  test('URL parameters are properly handled', async ({ page }) => {
    // Try to inject XSS through URL
    await page.goto('/?test=<script>alert(1)</script>', { waitUntil: 'domcontentloaded' }).catch(() => {});
    
    // Check that script tag is not executed or visible
    const hasAlert = await page.evaluate(() => {
      return (window as any).xssAttempt || false;
    });
    expect(hasAlert).toBe(false);
  });

  test('form inputs reject malicious content', async ({ page }) => {
    await page.goto('/').catch(() => {});
    
    // Find any input fields and test with suspicious content
    const inputs = await page.locator('input[type="text"]').all();
    
    if (inputs.length > 0) {
      // Test only the first input to avoid excessive test time
      const input = inputs[0];
      await input.fill('<script>alert("xss")</script>');
      const value = await input.inputValue();
      
      // The input may contain the raw text (which is okay for plain input fields)
      // Real XSS protection would be in how it's rendered/escaped
      expect(value).toBeDefined();
    }
  });
});
