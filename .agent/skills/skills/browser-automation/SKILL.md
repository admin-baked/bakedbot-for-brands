---
name: browser-automation
description: "Automate browser interactions using Playwright or Puppeteer for end-to-end testing, web scraping, and UI validation. Use when the task requires navigating web pages, filling forms, clicking elements, extracting page data, taking screenshots, or running automated test suites against a web application."
metadata:
  source: vibeship-spawner-skills (Apache 2.0)
---

# Browser Automation

This skill provides structured patterns for automating browser-based tasks using Playwright (preferred) or Puppeteer. It covers end-to-end test authoring, web scraping, form interaction, screenshot capture, and handling common pitfalls such as flaky selectors and race conditions.

## Workflow: End-to-End Test Setup

1. Initialize a Playwright project and install browsers.
2. Create a test file with proper fixtures and assertions.
3. Configure base URL, timeouts, and retry logic.
4. Run tests and interpret results.

### Step 1 — Initialize Project

```bash
npm init -y
npm install -D @playwright/test
npx playwright install --with-deps chromium
```

### Step 2 — Configure Playwright

Create `playwright.config.ts`:

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  retries: 2,
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
});
```

### Step 3 — Write a Test

Create `tests/login.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test('user can log in with valid credentials', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('user@example.com');
  await page.getByLabel('Password').fill('s3cureP@ss');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await expect(page).toHaveURL('/dashboard');
});
```

### Step 4 — Run Tests

```bash
npx playwright test
npx playwright test --ui          # interactive UI mode
npx playwright show-report        # view HTML report after run
```

## Workflow: Web Scraping Setup

1. Launch a browser context with appropriate settings.
2. Navigate to the target page and wait for content.
3. Extract data using locators or DOM queries.
4. Close the browser and process results.

### Complete Scraping Script

```typescript
import { chromium } from 'playwright';

async function scrapeProducts() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (compatible; MyBot/1.0)',
  });
  const page = await context.newPage();

  await page.goto('https://example.com/products', {
    waitUntil: 'domcontentloaded',
  });

  // Wait for the product list to render
  await page.waitForSelector('.product-card');

  const products = await page.$$eval('.product-card', (cards) =>
    cards.map((card) => ({
      name: card.querySelector('.product-name')?.textContent?.trim() ?? '',
      price: card.querySelector('.product-price')?.textContent?.trim() ?? '',
      link: card.querySelector('a')?.href ?? '',
    }))
  );

  await browser.close();
  return products;
}

scrapeProducts().then((data) => console.log(JSON.stringify(data, null, 2)));
```

## Patterns

### Selector Strategy Priority

Choose selectors in this order for resilience and readability:

1. **Role-based** (most resilient to markup changes):
   ```typescript
   page.getByRole('button', { name: 'Submit' })
   ```
2. **Label or placeholder text**:
   ```typescript
   page.getByLabel('Email address')
   page.getByPlaceholder('Search...')
   ```
3. **Test ID** (stable contract between dev and QA):
   ```typescript
   page.getByTestId('checkout-button')
   ```
4. **CSS selector** (use only when the above are unavailable):
   ```typescript
   page.locator('div.card > span.price')
   ```

Avoid XPath and positional selectors (`nth-child`) in tests — they break on minor DOM changes.

### Waiting Strategies

Playwright auto-waits on actions, but explicit waits are needed for dynamic content:

```typescript
// Wait for a network response before asserting
await page.waitForResponse((resp) =>
  resp.url().includes('/api/data') && resp.status() === 200
);

// Wait for an element to appear after an async render
await page.waitForSelector('[data-loaded="true"]', { timeout: 10_000 });

// Wait for navigation after a click
await Promise.all([
  page.waitForNavigation({ waitUntil: 'networkidle' }),
  page.getByRole('link', { name: 'Next page' }).click(),
]);
```

### Authentication Reuse

Store authenticated state to avoid logging in for every test:

```typescript
// global-setup.ts — run once before all tests
import { chromium } from 'playwright';

export default async function globalSetup() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/login');
  await page.getByLabel('Email').fill('admin@example.com');
  await page.getByLabel('Password').fill('admin123');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('/dashboard');
  await page.context().storageState({ path: './auth-state.json' });
  await browser.close();
}
```

Reference the saved state in `playwright.config.ts`:

```typescript
use: {
  storageState: './auth-state.json',
},
```

### Screenshot and Visual Comparison

```typescript
// Capture a full-page screenshot
await page.screenshot({ path: 'homepage.png', fullPage: true });

// Visual regression with Playwright's built-in comparison
await expect(page).toHaveScreenshot('dashboard.png', {
  maxDiffPixelRatio: 0.01,
});
```

### Handling Iframes

```typescript
const frame = page.frameLocator('#payment-iframe');
await frame.getByLabel('Card number').fill('4242424242424242');
await frame.getByRole('button', { name: 'Pay' }).click();
```

## Sharp Edges

| Issue | Why It Happens | Solution |
|-------|---------------|----------|
| `TimeoutError` on `click()` | Element exists in DOM but is covered by an overlay, modal, or loading spinner. | Wait for the overlay to disappear first: `await page.locator('.overlay').waitFor({ state: 'hidden' });` then click. |
| Tests pass locally, fail in CI | CI runs headless with different viewport, fonts, or timing. | Set explicit viewport in config (`use: { viewport: { width: 1280, height: 720 } }`) and use `retries: 2`. |
| `page.goto` hangs | Page fires long-running requests that prevent `load` event. | Use `waitUntil: 'domcontentloaded'` instead of the default `'load'`. |
| Stale element after SPA navigation | A soft navigation re-renders the component, invalidating a previous locator handle. | Re-query the locator after navigation instead of reusing a stored `ElementHandle`. Prefer Playwright locators (auto-retry) over `$()` handles. |
| Flaky date/time assertions | Tests depend on `Date.now()` which varies between runs. | Use `page.clock` API or mock the clock: `await page.clock.setFixedTime(new Date('2025-01-15T10:00:00Z'));` |
| CORS or cookie issues in scraping | Site blocks cross-origin or headless requests. | Set a realistic `userAgent` in the browser context and use `context.addCookies()` to inject session cookies. |
| Bot detection blocks scraper | Headless Chrome exposes automation flags (`navigator.webdriver`). | Use `playwright-extra` with `stealth` plugin, or set `args: ['--disable-blink-features=AutomationControlled']` on launch. |
| Popup or new tab lost | Clicking a link opens a new tab that is never captured. | Register the listener before triggering: `const [popup] = await Promise.all([page.waitForEvent('popup'), page.click('a[target=_blank]')]);` |

## Examples

### Fill a Multi-Step Form

```typescript
import { test, expect } from '@playwright/test';

test('complete a multi-step checkout form', async ({ page }) => {
  await page.goto('/checkout');

  // Step 1 — Shipping
  await page.getByLabel('Full name').fill('Jane Doe');
  await page.getByLabel('Address').fill('123 Main St');
  await page.getByLabel('City').fill('Portland');
  await page.getByLabel('Zip code').fill('97201');
  await page.getByRole('button', { name: 'Continue' }).click();

  // Step 2 — Payment
  await page.getByLabel('Card number').fill('4242424242424242');
  await page.getByLabel('Expiry').fill('12/27');
  await page.getByLabel('CVC').fill('123');
  await page.getByRole('button', { name: 'Place order' }).click();

  // Confirmation
  await expect(page.getByText('Order confirmed')).toBeVisible();
});
```

### Scrape a Paginated List

```typescript
import { chromium } from 'playwright';

async function scrapeAllPages(startUrl: string) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const allItems: string[] = [];

  await page.goto(startUrl);

  while (true) {
    const items = await page.$$eval('.item-title', (els) =>
      els.map((el) => el.textContent?.trim() ?? '')
    );
    allItems.push(...items);

    const nextButton = page.getByRole('link', { name: 'Next' });
    if (await nextButton.isVisible()) {
      await nextButton.click();
      await page.waitForLoadState('domcontentloaded');
    } else {
      break;
    }
  }

  await browser.close();
  return allItems;
}
```

### Intercept and Mock an API Response

```typescript
import { test, expect } from '@playwright/test';

test('display error banner when API returns 500', async ({ page }) => {
  await page.route('**/api/user/profile', (route) =>
    route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Internal server error' }),
    })
  );

  await page.goto('/profile');
  await expect(page.getByRole('alert')).toContainText('Something went wrong');
});
```

## Related Skills

Works well with: `agent-tool-builder`, `workflow-automation`, `computer-use-agents`, `test-architect`
