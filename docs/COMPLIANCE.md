# BakedBot AI - Cannabis Compliance Documentation

## Overview

BakedBot AI implements comprehensive state-level cannabis compliance rules for all 50 US states + District of Columbia (51 jurisdictions total).

**⚠️ LEGAL DISCLAIMER**: This is a technical implementation and does not constitute legal advice. Cannabis regulations change frequently. Consult with legal counsel for state-specific compliance before launch.

---

## Implementation Status

✅ **COMPLETE**: All 51 jurisdictions have compliance rules defined in `src/lib/compliance/compliance-rules.ts`

### Coverage Summary

- **24 Fully Legal States** (recreational cannabis)
- **15 Medical-Only States** (requires medical card)
- **12 Illegal/Decriminalized States** (no sales allowed)

---

## Compliance Rules Structure

Each state has the following compliance parameters:

```typescript
interface StateRules {
    state: string;              // Two-letter state code (e.g., "CA")
    stateName: string;          // Full state name
    legalStatus: 'legal' | 'medical' | 'illegal' | 'decriminalized';
    minAge: number;             // Minimum age requirement
    purchaseLimits: {
        flower: number;         // Grams allowed per purchase
        concentrate: number;    // Grams of concentrate allowed
        edibles: number;        // mg THC in edibles allowed
    };
    requiresMedicalCard: boolean;
}
```

---

## Fully Legal States (24)

Recreational cannabis allowed for adults 21+:

| State | Code | Flower Limit | Concentrate | Edibles (mg THC) |
|-------|------|--------------|-------------|------------------|
| Alaska | AK | 28g | 7g | 700 |
| Arizona | AZ | 28g | 5g | 500 |
| California | CA | 28.5g | 8g | 1000 |
| Colorado | CO | 28g | 8g | 800 |
| Connecticut | CT | 42.5g | 7.5g | 750 |
| Delaware | DE | 28g | 4g | 400 |
| District of Columbia | DC | 56g | 7g | 700 |
| Illinois | IL | 30g | 5g | 500 |
| Maine | ME | 71g | 5g | 500 |
| Maryland | MD | 42g | 5g | 500 |
| Massachusetts | MA | 28g | 5g | 500 |
| Michigan | MI | 71g | 15g | 1500 |
| Minnesota | MN | 56g | 8g | 800 |
| Missouri | MO | 85g | 12g | 1200 |
| Montana | MT | 28g | 8g | 800 |
| Nevada | NV | 28g | 3.5g | 350 |
| New Jersey | NJ | 28g | 4g | 400 |
| New Mexico | NM | 56g | 16g | 1600 |
| New York | NY | 85g | 24g | 2400 |
| Ohio | OH | 71g | 20g | 2000 |
| Oregon | OR | 28g | 5g | 1000 |
| Rhode Island | RI | 28g | 5g | 500 |
| Vermont | VT | 28g | 5g | 500 |
| Virginia | VA | 28g | 4g | 400 |
| Washington | WA | 28g | 7g | 1000 |

---

## Medical-Only States (15)

Requires valid medical marijuana card. Recreational sales blocked:

| State | Code | Flower Limit | Concentrate | Edibles (mg THC) | Min Age |
|-------|------|--------------|-------------|------------------|---------|
| Alabama | AL | 70g | 10g | 1000 | 18 |
| Arkansas | AR | 71g | 10g | 1000 | 18 |
| Florida | FL | 70g | 14g | 1400 | 18 |
| Hawaii | HI | 113g | 16g | 1600 | 18 |
| Louisiana | LA | 70g | 10g | 1000 | 18 |
| Mississippi | MS | 85g | 10g | 1000 | 18 |
| North Dakota | ND | 85g | 10g | 1000 | 18 |
| Oklahoma | OK | 85g | 10g | 1000 | 18 |
| Pennsylvania | PA | 0g (flower banned) | 10g | 1000 | 18 |
| South Dakota | SD | 85g | 10g | 1000 | 18 |
| Utah | UT | 0g (flower banned) | 20g | 2000 | 18 |
| West Virginia | WV | 0g (flower banned) | 10g | 1000 | 18 |

---

## Illegal/Decriminalized States (12)

No legal cannabis sales allowed. BakedBot blocks all purchases:

| State | Code | Legal Status |
|-------|------|--------------|
| Georgia | GA | Illegal |
| Idaho | ID | Illegal |
| Indiana | IN | Illegal |
| Iowa | IA | Illegal |
| Kansas | KS | Illegal |
| Kentucky | KY | Illegal |
| Nebraska | NE | Decriminalized |
| New Hampshire | NH | Decriminalized |
| North Carolina | NC | Decriminalized |
| South Carolina | SC | Illegal |
| Tennessee | TN | Illegal |
| Texas | TX | Illegal |
| Wisconsin | WI | Illegal |
| Wyoming | WY | Illegal |

---

## Validation Functions

### `getStateRules(state: string): StateRules`

Returns compliance rules for a given state code.

```typescript
const rules = getStateRules('CA');
// Returns California rules
```

### `validatePurchaseLimit(cart: CartItem[], state: string): ValidationResult`

Validates a shopping cart against state purchase limits.

```typescript
const result = validatePurchaseLimit([
    { productType: 'flower', quantity: 30 },
    { productType: 'edibles', quantity: 500 }
], 'IL');

if (!result.valid) {
    console.error('Compliance violations:', result.errors);
}
```

**Returns:**
- `valid: boolean` - Whether cart complies with limits
- `errors: string[]` - Blocking compliance violations
- `warnings: string[]` - Non-blocking warnings (e.g., medical card requirement)

---

## Integration Points

### Deebo Compliance Agent

The Deebo agent (`src/server/agents/deebo.ts`) enforces these rules at checkout:

1. **Age Verification**: Checks customer DOB against `minAge` requirement
2. **Medical Card Check**: Validates medical card for medical-only states
3. **Purchase Limits**: Validates cart against `purchaseLimits`
4. **Geo-restriction**: Blocks sales in illegal states

### Checkout API

`src/app/api/checkout/route.ts` calls Deebo validation before processing payment.

---

## Maintenance

### Updating Compliance Rules

**CRITICAL**: Cannabis regulations change frequently. Update process:

1. Monitor state legislative changes monthly
2. Update `src/lib/compliance/compliance-rules.ts`
3. Add AI Log entry with date and source
4. Re-validate with legal counsel
5. Deploy immediately (compliance changes are CRITICAL)

### Legal Review Checklist

Before production launch:

- [ ] Legal counsel review of all 51 jurisdiction rules
- [ ] Verification of current purchase limits (as of 2025)
- [ ] Medical card validation process documented
- [ ] Age verification process meets state requirements
- [ ] Delivery restrictions match state laws
- [ ] THC percentage limits verified (if applicable)

---

## Technical Files

- **Main Rules**: `src/lib/compliance/compliance-rules.ts` (515 lines)
- **Legacy Rules**: `src/lib/compliance/state-rules.ts` (IL and CA only - deprecated)
- **Deebo Agent**: `src/server/agents/deebo.ts` (compliance enforcement)
- **Checkout Validation**: `src/app/api/checkout/route.ts`

---

## Next Steps for Production

1. **Legal Review**: Have attorney validate all 51 rules
2. **Test Suite**: Create comprehensive compliance test suite
3. **Admin UI**: Build state rules management interface
4. **Monitoring**: Add compliance violation logging to Sentry
5. **Auto-Updates**: Consider integration with cannabis legal API (e.g., Leafly)

---

*Last Updated: November 29, 2025*
*Maintained by: Dev 1 (Lead Developer)*
*Legal Review Status: **PENDING** - Required before launch*
