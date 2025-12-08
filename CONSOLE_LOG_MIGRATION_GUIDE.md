# Console.log Migration Guide

**Goal**: Replace ~386 console.log statements with structured logger  
**Time Estimate**: 2-3 hours  
**Priority**: P1 (Required soon after launch)

---

## Quick Reference

### ❌ OLD (Insecure)
```typescript
console.log('User logged in:', email);
console.log('Order created:', orderId);
console.error('Payment failed:', error);
```

### ✅ NEW (Structured Logging)
```typescript
import { logger } from '@/lib/logger';

logger.info('[AUTH] User logged in', { email });
logger.info('[ORDER] Order created', { orderId });
logger.error('[PAYMENT] Payment failed', { error: error.message });
```

---

## Pattern by Category

### 1. Authentication Events
```typescript
// OLD
console.log('User logged in:', user.email);

// NEW
logger.info('[AUTH] User logged in', { email: user.email });
```

### 2. API Calls
```typescript
// OLD
console.log(`[CannMenus] Searching for: ${query}`);

// NEW
logger.info('[CANNMENUS_API] Search initiated', { query });
```

### 3. Errors & Exceptions
```typescript
// OLD
console.error('Payment failed:', error);

// NEW
logger.error('[PAYMENT] Payment processing failed', {
  error: error.message,
  code: error.code,
});
```

### 4. Mock/Test Data
```typescript
// OLD
console.log('[MOCK SMS to +1234567890]: Welcome!');

// NEW
logger.info('[SMS_MOCK] Mock SMS sent', {
  phoneNumber: '+1234567890',
  message: 'Welcome!',
});
```

### 5. Debug Info (Remove if not essential)
```typescript
// OLD - Can usually be removed
console.log('Debug:', someVariable);

// NEW - Only if really needed
logger.debug('[DEBUG] Variable state', { someVariable });
```

---

## Files with Most console.log Statements

1. **`src/lib/email/send-order-email.ts`** (6 statements)
   - Mock output for SendGrid not configured
   - Replace with: `logger.warn('[EMAIL_SENDGRID] SendGrid not configured - mock mode')`

2. **`src/server/actions/cannmenus.ts`** (2 statements)
   - API search logging
   - Replace with: `logger.info('[CANNMENUS_API]', { query, base })`

3. **`src/firebase/server-client.ts`** (1 statement)
   - Key initialization logging
   - Replace with: `logger.info('[FIREBASE] Admin SDK initializing')`

4. **`src/lib/pos/adapters/*.ts`** (6 statements across 3 files)
   - POS system connection logs
   - Replace with: `logger.info('[POS_DUTCHIE]', { storeId })`

5. **`src/lib/notifications/*.ts`** (3 statements)
   - Push notification logging
   - Replace with: `logger.info('[PUSH_NOTIFICATION]', { userId })`

6. **`src/lib/analytics.ts`** (1 statement)
   - Analytics tracking
   - Replace with: `logger.debug('[ANALYTICS]', payload)`

7. **`src/lib/monitoring.ts`** (1 statement)
   - Monitoring setup
   - Replace with structured logger

---

## Step-by-Step Process

### 1. Find all console.log statements
```bash
grep -r "console\." src/ --include="*.ts" --include="*.tsx" | wc -l
```

### 2. Group by file
```bash
grep -r "console\." src/ --include="*.ts" --include="*.tsx" | cut -d: -f1 | sort | uniq -c | sort -rn
```

### 3. For each file:
```bash
# View all statements
grep -n "console\." src/lib/email/send-order-email.ts

# Edit and replace with logger calls
# Add: import { logger } from '@/lib/logger';
```

### 4. Test
```bash
npm run check:types
npm run check:lint
npm test
```

---

## Logging Levels

Use the correct level for each message:

- **`logger.debug()`** - Development/debugging only (rarely needed)
- **`logger.info()`** - Normal operation events
- **`logger.warn()`** - Warning but not an error
- **`logger.error()`** - Errors that may need attention
- **`logger.critical()`** - Critical failures that should page on-call

---

## Tag Convention

Always use tags for filtering:
- `[AUTH]` - Authentication events
- `[PAYMENT]` - Payment processing
- `[ORDER]` - Order management
- `[COMPLIANCE]` - Compliance checks
- `[API_*]` - External API calls
- `[POS_*]` - POS system events
- `[SMS]` or `[EMAIL]` - Communication
- `[DEBUG]` - Debug info

Example:
```typescript
logger.info('[AUTH] User login attempt', { email, ip: request.ip });
logger.error('[PAYMENT] Transaction declined', { transactionId, reason });
logger.warn('[COMPLIANCE] Age verification failed', { userId, age });
```

---

## Before Production

✅ Checklist before launch:
- [ ] All console.log statements replaced with logger calls
- [ ] No sensitive data (passwords, tokens, SSNs) in logs
- [ ] Tags consistent across codebase
- [ ] Log level appropriate for each message
- [ ] Tested in staging environment
- [ ] Sentry integration confirmed working
- [ ] Cloud Logging receiving structured logs
- [ ] Log retention policy set in production

---

## Quick Find & Replace Script

```bash
# Find console.log/error/warn
grep -rn "console\.\(log\|error\|warn\|debug\)" src/ --include="*.ts" --include="*.tsx"

# For each match, determine appropriate logger level and tag
# Then manually replace to ensure accuracy

# Do NOT use automated find-replace (risks breaking functionality)
```

---

**Owner**: Development Team  
**Priority**: P1 - Complete before production deployment  
**Estimated Time**: 2-3 hours
