# Google Cloud Logging Configuration for BakedBot

## Overview
Production-grade structured logging using Google Cloud Logging SDK for Next.js.

## Installation
```bash
npm install @google-cloud/logging
```

## Configuration

### Environment Variables
- Production uses Application Default Credentials (automatic in App Hosting)
- Local dev: Uses FIREBASE_SERVICE_ACCOUNT_KEY for auth

### Log Levels
- `DEBUG`: Development debugging
- `INFO`: Normal operations
- `WARNING`: Recoverable issues
- `ERROR`: Failures (logged to Sentry also)
- `CRITICAL`: System failures

## Usage

```typescript
import { logger } from '@/lib/logger';

// Structured logging
logger.info('Order created', { 
  orderId: '123',
  amount: 50.00,
  userId: 'abc'
});

logger.error('Payment failed', {
  error: err.message,
  orderId: '123',
  provider: 'CannPay'
});
```

## GCP Console
View logs: https://console.cloud.google.com/logs/query?project=studio-567050101-bc6e8

## Next Steps (Dev1)
1. Replace 209 console.log calls with logger calls
2. Add request context (req ID, user ID) to logs
3. Configure log-based metrics for alerting

---
*Configured by Dev2 @ 2025-11-29*
