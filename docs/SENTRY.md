# Sentry Configuration for BakedBot

## Setup

### 1. Get Sentry DSN
- Project: https://bakedbot.sentry.io (or create new project)
- Copy DSN from Settings → Client Keys
- Format: `https://[key]@[org].ingest.sentry.io/[project]`

### 2. Add to Secret Manager
```bash
echo "https://your-sentry-dsn" | gcloud secrets create SENTRY_DSN --data-file=- --project=studio-567050101-bc6e8
```

### 3. Configuration Files

Already configured in:
- `apphosting.yaml` - SENTRY_DSN secret binding
- Build: Creates source maps for better error tracking
- Runtime: Captures errors server and client-side

## Usage

Sentry automatically captures:
- Unhandled exceptions
- Console errors  
- API errors
- Performance metrics

Manual error capture:
```typescript
import * as Sentry from '@sentry/nextjs';

try {
  // risky code
} catch (error) {
  Sentry.captureException(error, {
    tags: { feature: 'payments' },
    extra: { orderId: '123' }
  });
}
```

## Dashboard
View errors: https://bakedbot.sentry.io/issues

---
*Configured by Dev2 @ 2025-11-29*
