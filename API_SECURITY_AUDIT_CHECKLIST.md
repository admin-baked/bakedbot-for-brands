# API Security Audit Checklist

**Status**: PENDING - Manual audit required before production  
**Scope**: 47 API routes in `src/app/api/`  
**Priority**: P0 - BLOCKS LAUNCH  
**Owner**: Security Review Team  

---

## Executive Summary

47 API routes have been identified. Each must be manually reviewed for:
1. ✅ Authentication enforcement
2. ✅ Authorization (role-based access)
3. ✅ Input validation
4. ✅ Rate limiting
5. ✅ Error handling
6. ✅ Sensitive data exposure
7. ✅ SQL/NoSQL injection prevention
8. ✅ CSRF protection
9. ✅ CORS configuration

---

## Security Audit Template

For EACH route, fill in this checklist:

```
Route: /api/[path]
Method: GET|POST|PUT|DELETE|PATCH
Authenticated: YES|NO
Authorization: (roles checked)
Input Validation: YES|NO
Rate Limited: YES|NO
Errors Handled: YES|NO
Sensitive Data: YES|NO
CSRF Protected: YES|NO
CORS Configured: YES|NO
Status: ✅ PASS | 🟡 REVIEW | 🔴 FAIL
Notes:
```

---

## API Routes to Audit

### Payment Routes
```
📍 POST /api/payments/create-intent
   - Requires: requireUser() + role check
   - Inputs: amount (number), currency, metadata
   - Risks: Could allow arbitrary amount, bypass auth
   - Status: [ ] AUDIT

📍 POST /api/payments/webhooks
   - Requires: Stripe signature verification
   - Inputs: Stripe webhook payload
   - Risks: Could spoof payment confirmations
   - Status: [ ] AUDIT

📍 GET /api/payments/status/:transactionId
   - Requires: requireUser() + ownership check
   - Risks: Information disclosure
   - Status: [ ] AUDIT
```

### Authentication Routes
```
📍 POST /api/auth/login
   - Requires: Session cookie setup
   - Inputs: email, password
   - Risks: Brute force, account takeover
   - Rate limit: REQUIRED
   - Status: [ ] AUDIT

📍 POST /api/auth/logout
   - Requires: Valid session
   - Status: [ ] AUDIT

📍 POST /api/auth/verify-otp
   - Requires: OTP validation
   - Risks: Timing attacks
   - Status: [ ] AUDIT
```

### Product & Inventory Routes
```
📍 GET /api/products
   - Requires: Public read OR role-based
   - Inputs: filters, pagination
   - Status: [ ] AUDIT

📍 POST /api/products
   - Requires: requireUser(['brand', 'owner'])
   - Inputs: product data (untrusted)
   - Validation: Product schema, THC limits
   - Status: [ ] AUDIT

📍 PUT /api/products/:id
   - Requires: Brand ownership verification
   - Inputs: product updates
   - Status: [ ] AUDIT

📍 DELETE /api/products/:id
   - Requires: Brand ownership + admin
   - Status: [ ] AUDIT
```

### Order Routes
```
📍 POST /api/orders
   - Requires: Age verification + state compliance
   - Inputs: cart items, address, payment method
   - Validation: CRITICAL - check compliance
   - Status: [ ] AUDIT

📍 GET /api/orders/:id
   - Requires: Order ownership verification
   - Risks: Information disclosure
   - Status: [ ] AUDIT

📍 PUT /api/orders/:id/status
   - Requires: Dispensary or brand role
   - Risks: Could mark paid orders as unpaid
   - Status: [ ] AUDIT
```

### Search & Discovery Routes
```
📍 GET /api/search/products
   - Inputs: query (string), filters
   - Risks: SQL/NoSQL injection possible
   - Validation: Query string sanitization
   - Status: [ ] AUDIT

📍 GET /api/menu/:brandId
   - Public endpoint
   - Risks: DoS attack (no rate limit?)
   - Status: [ ] AUDIT
```

### Webhook Routes
```
📍 POST /api/webhooks/stripe
   - Signature verification: REQUIRED
   - Status: [ ] AUDIT

📍 POST /api/webhooks/cannpay
   - Signature verification: REQUIRED
   - Status: [ ] AUDIT

📍 POST /api/webhooks/authorize-net
   - Signature verification: REQUIRED
   - Status: [ ] AUDIT
```

### Agent/AI Routes
```
📍 POST /api/agents/dispatch
   - Requires: requireUser()
   - Inputs: agent name, parameters
   - Risks: Agent injection?
   - Status: [ ] AUDIT

📍 GET /api/agents/status
   - Requires: Role check
   - Status: [ ] AUDIT
```

### Admin/CEO Routes
```
📍 GET /api/admin/analytics
   - Requires: requireUser(['owner', 'admin'])
   - Status: [ ] AUDIT

📍 POST /api/admin/users
   - Requires: Owner role
   - Risks: Privilege escalation
   - Status: [ ] AUDIT

📍 GET /api/admin/audit-log
   - Requires: Owner role
   - Status: [ ] AUDIT
```

### Ticket/Support Routes
```
📍 POST /api/tickets
   - Requires: Authenticated user
   - Inputs: ticket data
   - Status: [ ] AUDIT

📍 GET /api/tickets/:id
   - Requires: Ticket ownership or admin
   - Status: [ ] AUDIT
```

### Misc Routes (Unknown Purpose)
```
📍 GET /api/health
   - Public health check - SAFE
   - Status: [ ] AUDIT

📍 GET /api/config
   - Check: No sensitive config exposed
   - Status: [ ] AUDIT

📍 POST /api/reach/entry
   - Purpose: ? (needs documentation)
   - Status: [ ] AUDIT

📍 GET /api/tickets/route
   - Purpose: ? (needs documentation)
   - Status: [ ] AUDIT
```

---

## Critical Security Checks

### For EVERY route, verify:

- [ ] **Authentication**
  - [ ] Uses `requireUser()` or middleware check
  - [ ] In production, NOT relying on client-side auth
  - [ ] Session cookie validated server-side

- [ ] **Authorization**
  - [ ] Role-based access control (RBAC) enforced
  - [ ] Users cannot access other users' data
  - [ ] Brand managers cannot access other brands
  - [ ] Escalation attempts logged

- [ ] **Input Validation**
  - [ ] All inputs validated with Zod or similar
  - [ ] No undefined/null handling issues
  - [ ] File uploads scanned for malware
  - [ ] String inputs sanitized

- [ ] **Rate Limiting**
  - [ ] Sensitive endpoints (login, payment) rate limited
  - [ ] DoS protection in place
  - [ ] Configuration documented

- [ ] **Error Handling**
  - [ ] No stack traces exposed to client
  - [ ] No internal implementation details revealed
  - [ ] Errors logged for debugging
  - [ ] User-friendly error messages

- [ ] **Sensitive Data**
  - [ ] No passwords in responses
  - [ ] No session tokens in logs
  - [ ] No API keys exposed
  - [ ] PII handled according to privacy policy

- [ ] **Compliance (Cannabis-Specific)**
  - [ ] Age verification enforced (if applicable)
  - [ ] State compliance rules checked
  - [ ] Purchase limits enforced
  - [ ] Audit trail maintained

---

## Common Vulnerabilities to Check

### 1. Broken Authentication
```typescript
// ❌ BAD
export async function GET(request: Request) {
  const userId = request.headers.get('x-user-id'); // Client can fake this!
  // ...
}

// ✅ GOOD
export async function GET(request: Request) {
  const user = await requireUser();
  const { uid } = user;
  // ...
}
```

### 2. Broken Authorization
```typescript
// ❌ BAD
export async function PUT(request: Request) {
  const { id } = params;
  await updateProduct(id, body); // No check if user owns this product!
}

// ✅ GOOD
export async function PUT(request: Request) {
  const user = await requireUser(['brand']);
  const product = await getProduct(id);
  
  if (product.brandId !== user.brandId) {
    throw new Error('Unauthorized');
  }
  
  await updateProduct(id, body);
}
```

### 3. Injection Attacks
```typescript
// ❌ BAD - Query injection risk
const products = db.query(`SELECT * FROM products WHERE name = '${name}'`);

// ✅ GOOD - Parameterized query
const products = db.query('SELECT * FROM products WHERE name = ?', [name]);

// ✅ GOOD - Firestore (prevents injection)
const query = db.collection('products').where('name', '==', name);
```

### 4. Missing Rate Limiting
```typescript
// ❌ BAD - No rate limiting
export async function POST(request: Request) {
  // Anyone can spam login attempts!
}

// ✅ GOOD - Rate limited
export async function POST(request: Request) {
  const rateLimit = await checkRateLimit(ip, 'login', 5); // 5 per minute
  if (!rateLimit.allowed) {
    return new Response('Too many requests', { status: 429 });
  }
}
```

---

## Audit Workflow

1. **List all routes**
   ```bash
   find src/app/api -name "route.ts" -o -name "route.js"
   ```

2. **For each route**:
   - [ ] Read the code
   - [ ] Fill in security checklist
   - [ ] Note any findings
   - [ ] Assign remediation tickets

3. **Remediation**:
   - [ ] Fix authentication
   - [ ] Fix authorization
   - [ ] Add input validation
   - [ ] Add rate limiting
   - [ ] Improve error handling

4. **Re-test**:
   - [ ] Unit tests pass
   - [ ] E2E tests pass
   - [ ] Security tests pass

---

## Sign-Off

Once all 47 routes are audited:

- [ ] Security team sign-off
- [ ] At least 2 reviews per critical route
- [ ] All findings addressed
- [ ] Documentation updated
- [ ] Ready for production

---

**Owner**: Security Review Team  
**Start Date**: December 8, 2025  
**Target Completion**: December 12, 2025  
**Blocking Deployment Until**: COMPLETE
