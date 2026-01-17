# UI Testing Guide for BakedBot

## Overview

This guide covers UI testing for BakedBot using Playwright's code generation and test framework.

## Setup

### Install Playwright

```bash
cd "c:\Users\admin\BakedBot for Brands\bakedbot-for-brands"
npm install -D @playwright/test
npx playwright install
```

### Create Test Directory

```bash
mkdir -p tests/e2e
```

---

## Recording UI Tests

### Method 1: Playwright Codegen (Recommended)

Playwright's codegen tool allows you to record browser interactions and generate test code automatically.

#### Start Recording

```bash
# Make sure dev server is running
npm run dev

# In another terminal, start recording
npx playwright codegen http://localhost:3000
```

**What happens:**
1. Browser window opens at your specified URL
2. Inspector window shows generated code in real-time
3. Interact with the app (click, type, navigate)
4. Code is generated automatically
5. Copy the code when done

#### Recording Options

```bash
# Record on specific device
npx playwright codegen --device="iPhone 13" http://localhost:3000

# Record on custom viewport
npx playwright codegen --viewport-size=1280,720 http://localhost:3000

# Save directly to file
npx playwright codegen --output tests/e2e/my-test.spec.ts --target javascript http://localhost:3000
```

### Method 2: Manual Test Writing

Create test files manually in `tests/e2e/`:

```javascript
// tests/e2e/onboarding.spec.js
const { test, expect } = require('@playwright/test');

test('complete brand onboarding flow', async ({ page }) => {
  await page.goto('http://localhost:3000/onboarding');

  // Fill business name
  await page.fill('[name="businessName"]', 'Test Cannabis Brand');

  // Select business type
  await page.click('text=Brand');

  // Continue
  await page.click('button:has-text("Continue")');

  // Verify navigation
  await expect(page).toHaveURL(/dashboard/);
});
```

---

## Running Tests

### Run All Tests

```bash
npx playwright test
```

### Run Specific Test

```bash
npx playwright test tests/e2e/onboarding.spec.js
```

### Run with UI Mode (Recommended for Development)

```bash
npx playwright test --ui
```

### Run in Headed Mode (See Browser)

```bash
npx playwright test --headed
```

### Run with Debug Mode

```bash
npx playwright test --debug
```

---

## Test Scenarios for BakedBot

### Critical User Flows

#### 1. Brand Onboarding
```bash
npx playwright codegen --output tests/e2e/brand-onboarding.spec.ts http://localhost:3000/onboarding
```

**Test:**
- Business name entry
- Business type selection (Brand/Dispensary/Location)
- Product/service configuration
- Integration setup
- Dashboard access

#### 2. Dispensary Console
```bash
npx playwright codegen --output tests/e2e/dispensary-console.spec.ts http://localhost:3000/dispensary
```

**Test:**
- Login flow
- Inventory view
- Order management
- Customer interactions
- Analytics dashboard

#### 3. Agent Interactions
```bash
npx playwright codegen --output tests/e2e/agent-chat.spec.ts http://localhost:3000
```

**Test:**
- Chatbot widget interaction
- Product search queries
- Recommendation acceptance
- Cart management
- Checkout flow

#### 4. Dashboard Features
```bash
npx playwright codegen --output tests/e2e/dashboard-navigation.spec.ts http://localhost:3000/dashboard
```

**Test:**
- Navigation between sections
- Data filtering
- Export functionality
- Settings changes
- Profile updates

---

## Playwright Configuration

Create `playwright.config.js` in project root:

```javascript
// playwright.config.js
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 13'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

---

## Best Practices

### 1. Use Data Test IDs

Add `data-testid` attributes to important elements:

```jsx
<button data-testid="submit-onboarding">Continue</button>
```

Then in tests:

```javascript
await page.click('[data-testid="submit-onboarding"]');
```

### 2. Wait for Network Idle

For pages with API calls:

```javascript
await page.goto('http://localhost:3000/dashboard', {
  waitUntil: 'networkidle'
});
```

### 3. Use Fixtures for Common Setup

```javascript
// tests/fixtures.js
const { test as base } = require('@playwright/test');

exports.test = base.extend({
  authenticatedPage: async ({ page }, use) => {
    // Login logic here
    await page.goto('http://localhost:3000/login');
    await page.fill('[name="email"]', 'test@bakedbot.ai');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await use(page);
  },
});
```

### 4. Screenshot on Failure

Already configured in `playwright.config.js`, but you can also manually:

```javascript
test('my test', async ({ page }) => {
  try {
    await page.goto('http://localhost:3000');
    // test logic
  } catch (error) {
    await page.screenshot({ path: 'failure.png' });
    throw error;
  }
});
```

---

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/playwright.yml
name: Playwright Tests
on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]
jobs:
  test:
    timeout-minutes: 60
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
      with:
        node-version: 18
    - name: Install dependencies
      run: npm ci
    - name: Install Playwright Browsers
      run: npx playwright install --with-deps
    - name: Run Playwright tests
      run: npx playwright test
    - uses: actions/upload-artifact@v3
      if: always()
      with:
        name: playwright-report
        path: playwright-report/
        retention-days: 30
```

---

## Troubleshooting

### Tests Timing Out

Increase timeout in test or config:

```javascript
test.setTimeout(60000); // 60 seconds

// Or in config
use: {
  actionTimeout: 10000,
  navigationTimeout: 30000,
}
```

### Element Not Found

Use better selectors:

```javascript
// Bad
await page.click('button');

// Good
await page.click('button:has-text("Submit")');
await page.click('[data-testid="submit-button"]');
await page.click('form button[type="submit"]');
```

### Flaky Tests

Add explicit waits:

```javascript
// Wait for element
await page.waitForSelector('[data-testid="results"]');

// Wait for state
await page.waitForLoadState('networkidle');

// Wait for URL
await page.waitForURL('**/dashboard');
```

---

## Quick Command Reference

| Command | Description |
|---------|-------------|
| `npx playwright codegen URL` | Record interactions |
| `npx playwright test` | Run all tests |
| `npx playwright test --ui` | Run with UI mode |
| `npx playwright test --headed` | Run with visible browser |
| `npx playwright test --debug` | Run in debug mode |
| `npx playwright show-report` | View HTML report |
| `npx playwright install` | Install browsers |

---

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Test Generator](https://playwright.dev/docs/codegen)
- [Debugging Tests](https://playwright.dev/docs/debug)

---

## Next Steps

1. Install Playwright: `npm install -D @playwright/test && npx playwright install`
2. Create config: Copy `playwright.config.js` example above
3. Record first test: `npx playwright codegen http://localhost:3000`
4. Run tests: `npx playwright test --ui`

For questions or issues, refer to the [Playwright documentation](https://playwright.dev) or consult the BakedBot development team.
