# Task Spec: Checkout Hardening (Account + Address + Order-Bound Charges)

**Date:** 2026-02-28  
**Requested by:** admin (user)  
**Spec status:** Draft

---

## 1. Intent (Why)

Stop unauthorized/random Authorize.Net charges by forcing every checkout charge to be tied to an authenticated account, a validated address, and a server-verified order/subscription amount.

---

## 2. Scope (What)

### Files affected

1. `src/types/orders.ts`
- Add explicit `BillingAddress` type.
- Add optional `billingAddress?: BillingAddress` to `OrderDoc`.

2. `src/types/users.ts`
- Add optional `billingAddress?: BillingAddress` on `DomainUserProfile` (for default checkout address persistence).

3. `src/app/api/schemas.ts`
- Add shared `billingAddressSchema` for checkout payload validation.
- Extend `processPaymentSchema` to include `billingAddress`.
- Tighten `processPaymentSchema` refinement rules:
  - `paymentMethod=credit_card` requires `orderId`.
  - `paymentMethod=credit_card` requires either `billingAddress` or order-level address to be resolvable server-side (enforced in route logic).

4. `src/app/api/checkout/process-payment/route.ts`
- Keep `withProtection`, add `requireAuth: true`.
- Remove trust in client `amount` for `credit_card`.
- Require order-bound card charges:
  - Load order by `orderId`.
  - Verify order ownership by authenticated user.
  - Verify order is charge-eligible (`paymentStatus` not already paid/refunded, total > 0).
  - Resolve billing address from request or existing order/user profile.
  - Charge with server-side order total only.
- Persist `userId` and `billingAddress` on order if missing and validated.

5. `src/app/api/checkout/shipping/route.ts`
- Add authenticated-session requirement (`requireUser()`).
- Enforce customer identity binding (`session.email` must match request customer email; request email normalized to session email).
- Enforce valid shipping address and use it as billing address fallback.
- Create draft order first to generate `orderId`, then charge using that `orderId` (invoice traceability).
- Charge with server-calculated total only.
- Persist `userId` and `billingAddress` on order.

6. `src/app/checkout/actions/createOrder.ts`
- Add authenticated-session requirement (`requireUser()`).
- Extend input contract with optional `billingAddress`.
- For `paymentMethod='authorize_net'`:
  - Require valid billing address (request billing address or delivery address fallback).
  - Generate `orderId` before charge and pass to Authorize.Net.
  - Use server-calculated total only.
- Persist `userId` and `billingAddress` on order docs.

7. `src/app/checkout/actions/createSubscription.ts`
- Add authenticated-session requirement (`requireUser()`).
- Extend input contract with required `billingAddress` for paid plans (`finalPrice > 0`).
- Bind customer identity to session (`customer.email` must equal session email; server is source of truth).
- Pass billing address to `createCustomerProfile` billTo payload.
- Persist `billingAddress` in subscription document and as default address in user profile.

8. `src/components/checkout/shipping-checkout-flow.tsx`
- Gate checkout on authenticated user:
  - If unauthenticated, render sign-in/create-account required state with CTA to `/signin?next=<encoded current checkout URL>`.
- On submit, send billing address payload (shipping address used as billing address).
- Remove ability to submit checkout payload when unauthenticated.

9. `src/components/checkout/checkout-flow.tsx`
- Gate checkout on authenticated user (same pattern as shipping flow).
- Add billing address capture for card-based checkout path.
- Pass `billingAddress` into `createOrder` action for card payments.

10. `src/app/checkout/subscription/page.tsx`
- Gate subscription checkout on authenticated user (sign in/create account required).
- Add billing address fields to checkout form step.
- Pass `billingAddress` into `createSubscription` action.

11. `src/components/auth/unified-login-form.tsx`
- Add safe `next` redirect support:
  - If `next` query param exists and is a safe relative path (`startsWith('/')` and not `//`), redirect there after session creation.
  - Otherwise preserve current role-based routing behavior.

12. `src/components/checkout/checkout-auth-required.tsx` (new)
- Reusable UI component for checkout auth gate.
- Props:
  - `title: string`
  - `description: string`
  - `nextPath: string`

13. `src/app/api/checkout/process-payment/__tests__/route.guardrails.test.ts` (new)
- Route tests for auth-required, order-bound charge, and amount mismatch rejection.

14. `src/app/api/checkout/shipping/__tests__/route.auth-address.test.ts` (new)
- Route tests for auth-required, required address, and order-id bound charge path.

15. `src/app/checkout/actions/__tests__/createOrder.auth-address.test.ts` (new)
- Server-action tests for account requirement and billing-address requirement on card payments.

16. `src/app/checkout/actions/__tests__/createSubscription.auth-address.test.ts` (new)
- Server-action tests for account requirement and billing-address requirement for paid plans.

### Files explicitly NOT touched

1. `src/lib/authorize-net.ts`
- No gateway transport changes in this task; hardening is at call-site and payload validation layers.

2. `src/server/actions/subscription.ts`
- Separate billing settings subscription flow; not part of checkout hardening scope here.

3. `src/app/api/billing/authorize-net/route.ts`
- Already computes plan pricing server-side and verifies org admin access; no changes in this pass.

4. `src/app/api/webhooks/*`
- Webhook verification paths out of scope for this specific checkout abuse fix.

**Estimated diff size:** 450-700 lines.

---

## 3. Boundary Check

| Boundary | Yes/No | Notes |
|---|---|---|
| Touches auth or permissions? | Yes | Enforces authenticated account for checkout charge paths |
| Touches payment or billing? | Yes | Authorize.Net charge eligibility and amount source hardening |
| Modifies database schema? | Yes (additive) | Adds optional `billingAddress` on order/subscription/user profile docs |
| Changes infra cost profile? | No | No new services |
| Modifies LLM prompts or agent behavior? | No | N/A |
| Touches compliance logic? | No | No Deebo rule changes |
| Adds new external dependency? | No | Existing stack only |

**Escalation needed?** No  
Reason: Full PRD + full AI-executable Stage 1 spec is provided for implementation approval.

---

## 4. Implementation Contract (Exact)

### 4.1 Data contracts

#### `BillingAddress` (new canonical shape)

```ts
type BillingAddress = {
  street: string;
  street2?: string;
  city: string;
  state: string;   // uppercased 2-letter US code
  zip: string;     // 5-digit or ZIP+4
  country: string; // default 'US'
};
```

#### Firestore document additions (additive only)

1. `orders/{orderId}`
- `userId: string` (must be set for all newly created checkout orders)
- `billingAddress?: BillingAddress`

2. `subscriptions/{subscriptionId}`
- `billingAddress?: BillingAddress`

3. `users/{uid}`
- `billingAddress?: BillingAddress`
- `billingAddressUpdatedAt?: Timestamp`

### 4.2 Function signatures (post-change)

1. `createOrder` in `src/app/checkout/actions/createOrder.ts`:

```ts
type CreateOrderInput = {
  items: any[];
  customer: { name: string; email: string; phone: string };
  retailerId: string;
  brandId?: string;
  couponCode?: string;
  paymentMethod: 'authorize_net' | 'cannpay' | 'cash' | 'smokey_pay';
  paymentData?: any;
  total: number;
  billingAddress?: BillingAddress;
  fulfillmentType?: 'pickup' | 'delivery';
  deliveryAddress?: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country?: string;
  };
  deliveryFee?: number;
  deliveryWindow?: { start: Date; end: Date };
  deliveryInstructions?: string;
};

export async function createOrder(input: CreateOrderInput): Promise<{
  success: boolean;
  orderId?: string;
  deliveryId?: string;
  trackingUrl?: string;
  error?: string;
}>;
```

2. `createSubscription` in `src/app/checkout/actions/createSubscription.ts`:

```ts
type CreateSubscriptionInput = {
  planId: string;
  customer: { name: string; email: string; phone: string };
  paymentData?: any;
  couponCode?: string;
  billingAddress?: BillingAddress;
};

export async function createSubscription(input: CreateSubscriptionInput): Promise<{
  success: boolean;
  subscriptionId?: string;
  error?: string;
}>;
```

3. `/api/checkout/shipping` POST body (validated in route):

```ts
{
  items: any[];
  customer: { name: string; email: string; phone?: string };
  shippingAddress: ShippingAddress;
  brandId: string;
  couponCode?: string;
  paymentMethod: 'authorize_net';
  paymentData: { opaqueData?: {...}; cardNumber?: string; expirationDate?: string; cvv?: string };
  subtotal?: number;
  tax?: number;
  total: number;
}
```

4. `/api/checkout/process-payment` POST body (validated):

```ts
{
  amount: number; // ignored for credit_card charge amount; kept for backward compatibility
  paymentMethod: 'dispensary_direct' | 'cannpay' | 'credit_card';
  paymentData?: {...};
  customer?: {...};
  orderId?: string; // REQUIRED when paymentMethod='credit_card'
  cart?: [...];
  dispensaryState?: string;
  billingAddress?: BillingAddress;
}
```

### 4.3 Authorization rules (exact)

1. `createOrder` and `createSubscription`:
- Must call `requireUser()` at function start.
- If no valid session, return/throw unauthorized error and do not call payment gateway.

2. `/api/checkout/shipping`:
- Must call `requireUser()` before payment attempt.
- Must enforce session identity binding:
  - request `customer.email` normalized to lower-case.
  - if session email exists and mismatched, return 403.

3. `/api/checkout/process-payment`:
- `withProtection(..., { requireAuth: true, ... })`.
- For `paymentMethod='credit_card'`, `orderId` is mandatory and ownership verification is mandatory.

### 4.4 Address rules (exact)

1. Card charges (`authorize_net` and `credit_card`) require resolved billing address.
2. Address resolution precedence:
- explicit request `billingAddress`
- existing order `billingAddress`
- order `shippingAddress` (shipping routes)
- user profile default `billingAddress`
3. If no valid address resolves, reject with 400 and do not charge.
4. On successful charge, persist resolved billing address to:
- order document
- user profile default address (`users/{uid}`)

### 4.5 Amount integrity rules (exact)

1. Never charge client `amount` for card authorization in checkout.
2. Charge amount source:
- `createOrder`: server-computed total
- `shipping route`: server-computed total
- `process-payment credit_card`: order `totals.total` from Firestore
3. If request amount mismatches server amount, log warning and continue with server amount only.
4. Reject card charge if order already paid/settled.

### 4.6 Order traceability rules (exact)

1. Every Authorize.Net charge must include a non-empty `orderId`/invoice reference.
2. Shipping API must create a draft order id before charge and use it in Authorize.Net request.
3. For failed card charges on existing draft order, persist `paymentStatus='failed'`.

---

## 5. Implementation Plan

1. Add shared billing-address types and schema definitions.
2. Harden backend charge entry points (`createOrder`, `createSubscription`, `/api/checkout/shipping`, `/api/checkout/process-payment`) for auth, address, and server-amount enforcement.
3. Update checkout UIs (shipping, regular, subscription) to require authenticated account and collect/push billing address.
4. Add safe sign-in callback redirect (`next`) so checkout can resume after account creation/sign-in.
5. Add focused tests for auth/address/order-bound charge guardrails.
6. Run typecheck and targeted test suites, then run full test command if green.

---

## 6. Test Plan

### Unit/route tests

1. `src/app/api/checkout/process-payment/__tests__/route.guardrails.test.ts`
- `credit_card without session -> 401`
- `credit_card without orderId -> 400`
- `credit_card with non-owner orderId (ownership mismatch) -> 403`
- `credit_card with amount mismatch -> uses order total, returns success mock`
- `credit_card without resolvable billing address -> 400`

2. `src/app/api/checkout/shipping/__tests__/route.auth-address.test.ts`
- unauthenticated request -> 401
- authenticated but missing shipping address -> 400
- authenticated with mismatched customer email -> 403
- authenticated valid payload -> creates draft order id before charge; charge called with that orderId

3. `src/app/checkout/actions/__tests__/createOrder.auth-address.test.ts`
- no session -> unauthorized
- card payment without billing/delivery address -> error
- card payment with address -> success and order contains `userId` + `billingAddress`

4. `src/app/checkout/actions/__tests__/createSubscription.auth-address.test.ts`
- no session -> unauthorized
- paid plan without billing address -> error
- paid plan with billing address -> profile payload includes address and subscription record persists it

### Manual smoke

1. Logged-out user opens `/checkout` -> sees sign-in/create-account gate.
2. Logged-out user opens `/checkout/subscription?plan=...` -> sees sign-in/create-account gate.
3. Signed-in user completes shipping checkout -> success, order doc includes `userId` and `billingAddress`.
4. Signed-in user tries tampered total from DevTools -> charge amount still server-computed.
5. Verify Authorize.Net receipt now includes order/invoice reference and non-empty billing info fields.

### Golden set eval

Not required (no LLM prompt behavior changes).

---

## 7. Rollback Plan

| Strategy | Details |
|---|---|
| Single commit revert? | Yes |
| Feature flag? | No new flag in this pass |
| Data migration rollback needed? | No (additive optional fields only) |
| Downstream services affected? | Checkout UI + Authorize.Net checkout calls |

Rollback command: revert checkout-hardening commit and redeploy. Existing docs with optional `billingAddress` remain forward-compatible.

---

## 8. Success Criteria

1. No unauthenticated card charge path remains in checkout code.
2. No card charge proceeds without a validated billing address.
3. No card charge proceeds from client-supplied arbitrary amount.
4. 100% of new Authorize.Net checkout transactions include order/invoice traceability.
5. Typecheck passes and new tests pass.
6. Post-deploy: random/off-plan receipts trend to zero for at least 24 hours.

---

## Approval

- [ ] **Spec reviewed by:** _______________
- [ ] **Approved to implement:** Yes / No
- [ ] **Modifications required:** [list or "none"]
