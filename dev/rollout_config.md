# Model B Rollout Configuration

## Phase 1: Initial Top 25 ZIPs

Launch claim-based access for the top-performing 25 ZIP codes.

### Selection Criteria
- Highest dispensary density
- Existing traffic from generated pages
- Geographic diversity within Illinois

### Initial 25 Target ZIPs (Illinois)
```
60601, 60602, 60603, 60604, 60605  # Chicago Loop
60606, 60607, 60608, 60609, 60610  # Downtown Chicago
60611, 60612, 60613, 60614, 60615  # North Side / Lincoln Park
60616, 60617, 60618, 60619, 60620  # South Loop / South Side
60621, 60622, 60623, 60624, 60625  # West Town / Wicker Park
```

## Billing Integration

### Platform Billing: Authorize.net
- All subscription billing (Starter $99, Growth $249, Scale $699, Enterprise)
- Recurring payment processing
- Customer payment profiles
- API: https://api.authorize.net

### Dispensary Payments: Smokey Pay (CanPay)
- Menu transaction processing for partner dispensaries
- Cannabis-compliant payment rails
- Integrated with dispensary menu sync

## Payment Flow

```
┌─────────────────┐     ┌──────────────────┐
│  Brand/Dispo    │────▶│  Authorize.net   │
│  Claims Page    │     │  (Subscription)  │
└─────────────────┘     └──────────────────┘
                               │
                               ▼
                    ┌──────────────────┐
                    │  BakedBot        │
                    │  Claim Activated │
                    └──────────────────┘

┌─────────────────┐     ┌──────────────────┐
│  Consumer       │────▶│  Smokey Pay      │
│  Menu Purchase  │     │  (CanPay)        │
└─────────────────┘     └──────────────────┘
```

## Rollout Timeline

| Phase | ZIPs | Timeline | Focus |
|-------|------|----------|-------|
| 1 | 25 | Week 1-2 | Chicago core |
| 2 | 100 | Week 3-4 | Chicago metro + suburbs |
| 3 | 500 | Week 5-8 | Full Illinois |
| 4 | 1,000 | Month 3+ | Multi-state expansion |

## Environment Variables Required

```bash
# Authorize.net
AUTHORIZE_NET_API_LOGIN_ID=your_api_login_id
AUTHORIZE_NET_TRANSACTION_KEY=your_transaction_key
AUTHORIZE_NET_ENVIRONMENT=production  # or sandbox

# Smokey Pay (CanPay)
CANPAY_API_KEY=your_canpay_key
CANPAY_MERCHANT_ID=your_merchant_id
```

## Files to Update

- `src/lib/billing/authorize-net.ts` - Authorize.net integration
- `src/lib/payments/canpay.ts` - Smokey Pay integration
- `src/lib/claim-exclusivity.ts` - Update activateClaim to use Authorize.net
- `src/server/actions/page-claims.ts` - Update billing webhook handler

## Success Metrics for Phase 1

- 10+ claims in first 2 weeks
- $1,000+ MRR from top 25 ZIPs
- 50%+ claim conversion from email outreach
- Average claim processing time < 24 hours
