# Intern Testing Guide: Payment & Competitive Intelligence

**Created:** 2026-01-23
**Tester:** [Your Name]
**Version:** 1.0

---

## Overview

This guide covers testing two core features:
1. **Authorize.net Checkout** - Payment processing for subscriptions and hemp/accessory products
2. **Competitive Intelligence Playbook** - Auto-generated on brand/dispensary signup (their own "Ezal")

---

## Part 1: Authorize.net Checkout Testing

### Background

BakedBot uses Authorize.net for credit card payments. Key rules:
- **Credit cards are ONLY for**: Hemp products, Accessories, Subscriptions
- **Cannabis products**: Use "Pay at Pickup" or "Smokey Pay" (CannPay)
- Cart with ANY cannabis disables credit card option

### Sandbox Test Cards

The following test cards work **only in sandbox mode**:

| Card Type | Test Number | Notes |
|-----------|-------------|-------|
| **Visa** | `4242424242424242` | Most common test card |
| **Visa (Alt)** | `4007000000027` | Alternate visa test |
| **Mastercard** | `5424000000000015` | Standard mastercard |
| **American Express** | `370000000000002` | Use 4-digit CVV |
| **Discover** | `6011000000000012` | Standard discover |
| **JCB** | `3088000000000017` | JCB network |

### Test Card Details

For ALL test transactions, use:

```
Card Number:     4242424242424242 (or any from table above)
Expiration:      Any future date (e.g., 12/2027)
CVV/CVC:         123 (use 1234 for Amex)
Billing ZIP:     Any valid format (e.g., 12345)
```

### Special Test Scenarios

#### CVV Response Testing
| CVV Value | Expected Response |
|-----------|-------------------|
| `900` | CVV not processed |
| `901` | CVV should have been present |
| `904` | CVV not applicable |

#### AVS (Address Verification) Testing
| Address | ZIP | Expected Response |
|---------|-----|-------------------|
| `123 Main St` | `12345` | Full match |
| `123 Main St` | `46282` | ZIP mismatch |
| `456 Other St` | `12345` | Address mismatch |

#### Decline Testing
| Amount | Expected Result |
|--------|-----------------|
| `$0.01 - $99.99` | Approved |
| `$100+` | Declined (for eCheck) |

### Testing Checklist

#### Setup
- [ ] Confirm sandbox mode is active (check `NODE_ENV` or config)
- [ ] Have Authorize.net sandbox credentials configured
- [ ] Access the test environment at `localhost:3000` or staging URL

#### Checkout Flow Tests

**Test 1: Subscription Checkout**
1. Navigate to `/pricing` or subscription page
2. Select a plan (e.g., Empire plan)
3. Proceed to checkout
4. Enter test card: `4242424242424242`
5. Expiry: `12/2027`, CVV: `123`
6. Submit payment
7. **Expected**: Payment approved, subscription activated

**Test 2: Hemp/Accessory Cart**
1. Add a hemp product (CBD, accessories) to cart
2. Proceed to checkout
3. Verify "Credit Card" option is available
4. Enter test card details
5. Complete payment
6. **Expected**: Order created, payment processed

**Test 3: Cannabis Cart (Credit Card Blocked)**
1. Add a cannabis product (flower, vape, etc.) to cart
2. Proceed to checkout
3. **Expected**: "Credit Card" option should NOT appear
4. Only "Pay at Pickup" and "Smokey Pay" (if enabled) should show

**Test 4: Mixed Cart**
1. Add both cannabis AND hemp/accessory products
2. Proceed to checkout
3. **Expected**: Credit Card option BLOCKED (cannabis rule)

**Test 5: Claim Subscription**
1. Navigate to brand claim page
2. Initiate claim process
3. Complete payment for claim subscription
4. **Expected**: Claim activated, brand now owned

### Error Handling Tests

**Test 6: Invalid Card**
1. Enter invalid card: `4000000000000002`
2. Submit payment
3. **Expected**: Decline message shown, user can retry

**Test 7: Expired Card**
1. Enter expiry date in the past (e.g., `01/2020`)
2. Submit payment
3. **Expected**: Validation error before submission

**Test 8: Network Error Simulation**
1. Disconnect network mid-payment (if possible in sandbox)
2. **Expected**: Graceful error, no duplicate charges

### Resources

- [Authorize.net Testing Guide](https://developer.authorize.net/hello_world/testing_guide.html)
- [Authorize.net Sandbox Signup](https://developer.authorize.net/hello_world/sandbox.html)
- [Test Card Numbers (GitHub Gist)](https://gist.github.com/tleen/6382987)

---

## Part 2: Competitive Intelligence Playbook

### The Vision: "Your Own Ezal"

When a brand or dispensary signs up, they should automatically get their **own Ezal** - a competitive intelligence agent that:
- Monitors competitor pricing
- Tracks market trends
- Delivers insights on a schedule
- Alerts them to pricing opportunities

### How Ezal Works (Technical)

The Ezal 3-Agent Pipeline:

```
[User Query] --> [Finder Agent] --> [Scraper Agent] --> [Analyzer Agent] --> [Insights]
                      |                   |                    |
                 Exa/Perplexity      Firecrawl/RTRVR      Claude Analysis
                 Web Search         Menu Extraction       Strategic Intel
```

**Stages:**
1. **Finder**: Discovers competitor URLs via web search
2. **Scraper**: Extracts product data from menu pages (auto-selects Firecrawl or RTRVR)
3. **Analyzer**: Generates strategic insights and pricing comparisons

### Competitive Intelligence Playbook Structure

When a brand/dispensary onboards, create this playbook:

```yaml
name: Competitive Intelligence Report
description: Weekly competitor monitoring powered by Ezal

triggers:
  - type: schedule
    cron: "0 8 * * 1"  # Every Monday at 8 AM
  - type: event
    eventName: manual.competitive.scan

agent: ezal

steps:
  - action: ezal_pipeline
    task: Run competitive intelligence scan
    params:
      query: "{{brand.city}} {{brand.state}} cannabis dispensary"
      maxUrls: 10

  - action: generate
    agent: ezal
    task: Generate competitive intelligence report

  - action: send_email
    provider: mailjet
    subject: "Weekly Competitive Intel: {{brand.name}}"
    template: competitive_intel_report
```

### What Gets Auto-Generated on Signup

For **Brands**:
- Competitor tracking for their product category
- Price monitoring for similar brands in their distribution area
- Market trend reports

For **Dispensaries**:
- Local competitor pricing scans
- Nearby dispensary monitoring (within X miles)
- Daily deal tracking

### Implementation Location

The playbook should be created in `pilot-setup.ts` after user/org creation:

```typescript
// After creating brand/org in setupPilotCustomer():
await createCompetitiveIntelPlaybook(orgId, brandId, {
  city: config.type === 'dispensary' ? config.city : undefined,
  state: config.type === 'dispensary' ? config.state : undefined,
  brandName: config.type === 'brand' ? config.brandName : config.dispensaryName,
  scheduleFrequency: 'weekly',  // or 'daily' for premium plans
});
```

### Testing the CI Playbook

#### Test 9: Playbook Auto-Creation on Signup
1. Create a new test dispensary via pilot setup
2. Check Firestore `playbooks` collection
3. **Expected**: `playbook_{brandId}_competitive_intel` exists
4. Verify correct triggers and steps

#### Test 10: Manual CI Scan
1. Login as test brand/dispensary
2. Navigate to dashboard > Competitive Intelligence
3. Click "Run Scan Now"
4. **Expected**: Ezal pipeline executes, results displayed

#### Test 11: Ezal Pipeline Direct Test
```typescript
// Run in test environment or via API
import { runEzalPipeline } from '@/server/agents/ezal-team';

const result = await runEzalPipeline({
  tenantId: 'test-brand-123',
  query: 'Syracuse New York cannabis dispensary',
  maxUrls: 5,
});

console.log('URLs Found:', result.finderResult?.urls.length);
console.log('Products Scraped:', result.scraperResult?.totalProducts);
console.log('Insights:', result.analyzerResult?.insights);
```

#### Test 12: Quick Scan with Manual URLs
```typescript
import { quickScan } from '@/server/agents/ezal-team';

const result = await quickScan('test-brand-123', [
  'https://weedmaps.com/dispensaries/test-dispensary-1',
  'https://dutchie.com/embedded-menu/test-dispensary-2',
]);
```

### CI Report Content Verification

The generated report should include:

- [ ] Competitor names and locations
- [ ] Product categories found
- [ ] Price comparisons (if our prices available)
- [ ] Market positioning insights
- [ ] Actionable recommendations

### URL Filtering Verification

The URL filter (`url-filter.ts`) should block:
- Social media (reddit, twitter, facebook)
- News sites (hightimes.com/news, weedmaps.com/news)
- Review sites (yelp, tripadvisor)
- Generic blog content

**Test 13: URL Filter**
```typescript
import { filterUrls } from '@/server/agents/ezal-team';

const result = filterUrls([
  'https://example-dispensary.com/menu',     // Should PASS
  'https://reddit.com/r/cannabis',           // Should BLOCK
  'https://dutchie.com/store/test',          // Should PASS (platform)
  'https://hightimes.com/news/article',      // Should BLOCK
]);

console.log('Allowed:', result.allowed);
console.log('Blocked:', result.blocked);
```

---

## Part 3: Test Results Template

Copy and fill this for each testing session:

```
## Test Session: [Date]
Tester: [Name]
Environment: [localhost / staging / production]

### Authorize.net Tests
| Test | Status | Notes |
|------|--------|-------|
| Subscription Checkout | [ ] Pass [ ] Fail | |
| Hemp Cart | [ ] Pass [ ] Fail | |
| Cannabis Cart Block | [ ] Pass [ ] Fail | |
| Mixed Cart | [ ] Pass [ ] Fail | |
| Claim Subscription | [ ] Pass [ ] Fail | |
| Invalid Card | [ ] Pass [ ] Fail | |
| Expired Card | [ ] Pass [ ] Fail | |

### Competitive Intelligence Tests
| Test | Status | Notes |
|------|--------|-------|
| Playbook Auto-Creation | [ ] Pass [ ] Fail | |
| Manual CI Scan | [ ] Pass [ ] Fail | |
| Ezal Pipeline | [ ] Pass [ ] Fail | |
| Quick Scan | [ ] Pass [ ] Fail | |
| URL Filtering | [ ] Pass [ ] Fail | |

### Bugs Found
1. [Description] - Severity: [Low/Medium/High/Critical]
2. ...

### Screenshots/Recordings
- [Link or attachment]
```

---

## Quick Reference Commands

```bash
# Run dev server
npm run dev

# Run specific tests
npm test -- tests/payments/payment-integrations.test.ts
npm test -- tests/server/agents/ezal-team.test.ts

# Type check
npm run check:types

# Check logs
# Look for [Ezal:Pipeline] entries
```

---

## Questions?

- **Payment Issues**: Check `src/lib/payments/` and `src/app/api/checkout/`
- **Ezal Issues**: Check `src/server/agents/ezal-team/`
- **Playbook Issues**: Check `src/server/actions/pilot-setup.ts` and `src/config/default-playbooks.ts`

---

*Last updated: 2026-01-23*
