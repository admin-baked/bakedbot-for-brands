# Legal Review Required - Cannabis Compliance Rules

**Status**: ⚠️ CRITICAL BLOCKER FOR PRODUCTION LAUNCH
**Priority**: P0 - Must be completed before any customer transactions
**Owner**: Legal Counsel (Attorney Review Required)
**Technical Contact**: Dev 1 (Team Lead)

---

## Executive Summary

This document compiles all state-specific cannabis compliance rules implemented in the BakedBot platform. **Legal counsel must review and approve all rules before production launch** to ensure regulatory compliance across all 51 jurisdictions (50 states + DC).

### Implementation Status
- ✅ **Technical Implementation**: Complete (all 51 jurisdictions)
- ⚠️ **Legal Review**: PENDING (blocks production)
- ⚠️ **Attorney Sign-off**: REQUIRED

### Regulatory Scope
- **24 States**: Fully legal recreational cannabis
- **15 States + DC**: Medical-only (requires medical marijuana card)
- **12 States**: Illegal or decriminalized (sales blocked)

---

## Critical Legal Requirements

### 1. Age Verification
The platform enforces age requirements at two checkpoints:

**Client-Side (Age Gate)**
- Located at: `src/components/age-gate.tsx`
- Stores verification in localStorage (bypassable - not legally sufficient)
- Purpose: User experience only, NOT compliance

**Server-Side (Checkout) ⚠️ LEGALLY BINDING**
- Located at: `src/server/agents/deebo.ts` (Deebo Compliance Agent)
- Function: `deeboCheckCheckout()`
- Validates date of birth against state minimum age
- **Recreational states**: 21+ required
- **Medical states**: 18+ required (with valid medical card)
- Blocks transaction if age requirement not met

### 2. Purchase Limits Enforcement
The platform enforces state-specific purchase limits at checkout:

**Product Categories**
- **Flower**: Cannabis flower/bud (measured in grams)
- **Concentrate**: Hash, wax, shatter, etc. (measured in grams)
- **Edibles**: THC-infused products (measured in mg THC)

**Enforcement Location**
- File: `src/lib/compliance/compliance-rules.ts`
- Function: `validatePurchaseLimit(cart, state)`
- Called by: Deebo agent during checkout validation

### 3. Medical Card Requirements
For medical-only states, the platform requires:
- Valid medical marijuana card on file
- Customer profile field: `hasMedicalCard: boolean`
- Blocks transaction if medical card not verified

### 4. Sales Prohibition
The platform blocks all sales in illegal/decriminalized states:
- Returns error: "Cannabis sales are not legal in [State]"
- No checkout processing allowed
- Prevents order creation in Firestore

---

## State-by-State Compliance Rules

### Attorney Review Checklist
For each state below, legal counsel must verify:
- ✅ Legal status is accurate (recreational, medical, illegal, decriminalized)
- ✅ Age requirement matches current state law
- ✅ Purchase limits match current state regulations
- ✅ Medical card requirements are correctly identified
- ✅ Any special restrictions or notes are documented

---

## Fully Legal Recreational States (24 States)

### California (CA)
- **Legal Status**: Recreational
- **Minimum Age**: 21
- **Purchase Limits**:
  - Flower: 28.5 grams (1 oz)
  - Concentrate: 8 grams
  - Edibles: 1,000 mg THC
- **Medical Card Required**: No
- **Notes**: Prop 64 compliant

### Colorado (CO)
- **Legal Status**: Recreational
- **Minimum Age**: 21
- **Purchase Limits**:
  - Flower: 28 grams (1 oz)
  - Concentrate: 8 grams
  - Edibles: 800 mg THC
- **Medical Card Required**: No
- **Notes**: First state to legalize recreational use

### Illinois (IL)
- **Legal Status**: Recreational
- **Minimum Age**: 21
- **Purchase Limits**:
  - Flower: 30 grams
  - Concentrate: 5 grams
  - Edibles: 500 mg THC
- **Medical Card Required**: No
- **Notes**: Out-of-state residents may have different limits

### Washington (WA)
- **Legal Status**: Recreational
- **Minimum Age**: 21
- **Purchase Limits**:
  - Flower: 28 grams (1 oz)
  - Concentrate: 7 grams
  - Edibles: 1,000 mg THC
- **Medical Card Required**: No

### Oregon (OR)
- **Legal Status**: Recreational
- **Minimum Age**: 21
- **Purchase Limits**:
  - Flower: 28 grams (1 oz)
  - Concentrate: 5 grams
  - Edibles: 1,000 mg THC
- **Medical Card Required**: No

### Michigan (MI)
- **Legal Status**: Recreational
- **Minimum Age**: 21
- **Purchase Limits**:
  - Flower: 71 grams (2.5 oz)
  - Concentrate: 15 grams
  - Edibles: 1,500 mg THC
- **Medical Card Required**: No
- **Notes**: Higher limits than most states

### Massachusetts (MA)
- **Legal Status**: Recreational
- **Minimum Age**: 21
- **Purchase Limits**:
  - Flower: 28 grams (1 oz)
  - Concentrate: 5 grams
  - Edibles: 500 mg THC
- **Medical Card Required**: No

### Nevada (NV)
- **Legal Status**: Recreational
- **Minimum Age**: 21
- **Purchase Limits**:
  - Flower: 28 grams (1 oz)
  - Concentrate: 3.5 grams (⅛ oz)
  - Edibles: 350 mg THC
- **Medical Card Required**: No
- **Notes**: Stricter limits on concentrates/edibles

### Arizona (AZ)
- **Legal Status**: Recreational
- **Minimum Age**: 21
- **Purchase Limits**:
  - Flower: 28 grams (1 oz)
  - Concentrate: 5 grams
  - Edibles: 500 mg THC
- **Medical Card Required**: No

### New Jersey (NJ)
- **Legal Status**: Recreational
- **Minimum Age**: 21
- **Purchase Limits**:
  - Flower: 28 grams (1 oz)
  - Concentrate: 4 grams
  - Edibles: 400 mg THC
- **Medical Card Required**: No

### New York (NY)
- **Legal Status**: Recreational
- **Minimum Age**: 21
- **Purchase Limits**:
  - Flower: 85 grams (3 oz)
  - Concentrate: 24 grams
  - Edibles: 2,400 mg THC
- **Medical Card Required**: No
- **Notes**: Very high purchase limits

### Connecticut (CT)
- **Legal Status**: Recreational
- **Minimum Age**: 21
- **Purchase Limits**:
  - Flower: 42.5 grams (1.5 oz)
  - Concentrate: 7.5 grams
  - Edibles: 750 mg THC
- **Medical Card Required**: No

### Vermont (VT)
- **Legal Status**: Recreational
- **Minimum Age**: 21
- **Purchase Limits**:
  - Flower: 28 grams (1 oz)
  - Concentrate: 5 grams
  - Edibles: 500 mg THC
- **Medical Card Required**: No

### New Mexico (NM)
- **Legal Status**: Recreational
- **Minimum Age**: 21
- **Purchase Limits**:
  - Flower: 56 grams (2 oz)
  - Concentrate: 16 grams
  - Edibles: 1,600 mg THC
- **Medical Card Required**: No

### Montana (MT)
- **Legal Status**: Recreational
- **Minimum Age**: 21
- **Purchase Limits**:
  - Flower: 28 grams (1 oz)
  - Concentrate: 8 grams
  - Edibles: 800 mg THC
- **Medical Card Required**: No

### Alaska (AK)
- **Legal Status**: Recreational
- **Minimum Age**: 21
- **Purchase Limits**:
  - Flower: 28 grams (1 oz)
  - Concentrate: 7 grams
  - Edibles: 700 mg THC
- **Medical Card Required**: No

### Maine (ME)
- **Legal Status**: Recreational
- **Minimum Age**: 21
- **Purchase Limits**:
  - Flower: 71 grams (2.5 oz)
  - Concentrate: 5 grams
  - Edibles: 500 mg THC
- **Medical Card Required**: No

### District of Columbia (DC)
- **Legal Status**: Recreational
- **Minimum Age**: 21
- **Purchase Limits**:
  - Flower: 56 grams (2 oz)
  - Concentrate: 7 grams
  - Edibles: 700 mg THC
- **Medical Card Required**: No
- **Notes**: Federal restrictions may apply

### Rhode Island (RI)
- **Legal Status**: Recreational
- **Minimum Age**: 21
- **Purchase Limits**:
  - Flower: 28 grams (1 oz)
  - Concentrate: 5 grams
  - Edibles: 500 mg THC
- **Medical Card Required**: No

### Virginia (VA)
- **Legal Status**: Recreational
- **Minimum Age**: 21
- **Purchase Limits**:
  - Flower: 28 grams (1 oz)
  - Concentrate: 4 grams
  - Edibles: 400 mg THC
- **Medical Card Required**: No

### Minnesota (MN)
- **Legal Status**: Recreational
- **Minimum Age**: 21
- **Purchase Limits**:
  - Flower: 56 grams (2 oz)
  - Concentrate: 8 grams
  - Edibles: 800 mg THC
- **Medical Card Required**: No

### Delaware (DE)
- **Legal Status**: Recreational
- **Minimum Age**: 21
- **Purchase Limits**:
  - Flower: 28 grams (1 oz)
  - Concentrate: 4 grams
  - Edibles: 400 mg THC
- **Medical Card Required**: No

### Maryland (MD)
- **Legal Status**: Recreational
- **Minimum Age**: 21
- **Purchase Limits**:
  - Flower: 42 grams (1.5 oz)
  - Concentrate: 5 grams
  - Edibles: 500 mg THC
- **Medical Card Required**: No

### Missouri (MO)
- **Legal Status**: Recreational
- **Minimum Age**: 21
- **Purchase Limits**:
  - Flower: 85 grams (3 oz)
  - Concentrate: 12 grams
  - Edibles: 1,200 mg THC
- **Medical Card Required**: No
- **Notes**: High purchase limits

### Ohio (OH)
- **Legal Status**: Recreational
- **Minimum Age**: 21
- **Purchase Limits**:
  - Flower: 71 grams (2.5 oz)
  - Concentrate: 20 grams
  - Edibles: 2,000 mg THC
- **Medical Card Required**: No
- **Notes**: Recently legalized

---

## Medical-Only States (15 States)

### Florida (FL)
- **Legal Status**: Medical Only
- **Minimum Age**: 18 (with medical card)
- **Purchase Limits**:
  - Flower: 70 grams
  - Concentrate: 14 grams
  - Edibles: 1,400 mg THC
- **Medical Card Required**: ✅ YES
- **Notes**: No recreational sales allowed

### Pennsylvania (PA)
- **Legal Status**: Medical Only
- **Minimum Age**: 18 (with medical card)
- **Purchase Limits**:
  - Flower: 0 grams (NOT ALLOWED)
  - Concentrate: 10 grams
  - Edibles: 1,000 mg THC
- **Medical Card Required**: ✅ YES
- **Notes**: Flower sales prohibited - only concentrates/edibles

### Arkansas (AR)
- **Legal Status**: Medical Only
- **Minimum Age**: 18 (with medical card)
- **Purchase Limits**:
  - Flower: 71 grams (2.5 oz)
  - Concentrate: 10 grams
  - Edibles: 1,000 mg THC
- **Medical Card Required**: ✅ YES

### Louisiana (LA)
- **Legal Status**: Medical Only
- **Minimum Age**: 18 (with medical card)
- **Purchase Limits**:
  - Flower: 70 grams
  - Concentrate: 10 grams
  - Edibles: 1,000 mg THC
- **Medical Card Required**: ✅ YES

### Oklahoma (OK)
- **Legal Status**: Medical Only
- **Minimum Age**: 18 (with medical card)
- **Purchase Limits**:
  - Flower: 85 grams (3 oz)
  - Concentrate: 10 grams
  - Edibles: 1,000 mg THC
- **Medical Card Required**: ✅ YES
- **Notes**: High flower limit for medical state

### Utah (UT)
- **Legal Status**: Medical Only
- **Minimum Age**: 18 (with medical card)
- **Purchase Limits**:
  - Flower: 0 grams (NOT ALLOWED)
  - Concentrate: 20 grams
  - Edibles: 2,000 mg THC
- **Medical Card Required**: ✅ YES
- **Notes**: Flower sales prohibited

### North Dakota (ND)
- **Legal Status**: Medical Only
- **Minimum Age**: 18 (with medical card)
- **Purchase Limits**:
  - Flower: 85 grams (3 oz)
  - Concentrate: 10 grams
  - Edibles: 1,000 mg THC
- **Medical Card Required**: ✅ YES

### South Dakota (SD)
- **Legal Status**: Medical Only
- **Minimum Age**: 18 (with medical card)
- **Purchase Limits**:
  - Flower: 85 grams (3 oz)
  - Concentrate: 10 grams
  - Edibles: 1,000 mg THC
- **Medical Card Required**: ✅ YES

### West Virginia (WV)
- **Legal Status**: Medical Only
- **Minimum Age**: 18 (with medical card)
- **Purchase Limits**:
  - Flower: 0 grams (NOT ALLOWED)
  - Concentrate: 10 grams
  - Edibles: 1,000 mg THC
- **Medical Card Required**: ✅ YES
- **Notes**: Flower sales prohibited

### Mississippi (MS)
- **Legal Status**: Medical Only
- **Minimum Age**: 18 (with medical card)
- **Purchase Limits**:
  - Flower: 85 grams (3 oz)
  - Concentrate: 10 grams
  - Edibles: 1,000 mg THC
- **Medical Card Required**: ✅ YES

### Alabama (AL)
- **Legal Status**: Medical Only
- **Minimum Age**: 18 (with medical card)
- **Purchase Limits**:
  - Flower: 70 grams
  - Concentrate: 10 grams
  - Edibles: 1,000 mg THC
- **Medical Card Required**: ✅ YES

### Hawaii (HI)
- **Legal Status**: Medical Only
- **Minimum Age**: 18 (with medical card)
- **Purchase Limits**:
  - Flower: 113 grams (4 oz)
  - Concentrate: 16 grams
  - Edibles: 1,600 mg THC
- **Medical Card Required**: ✅ YES
- **Notes**: Very high purchase limits

---

## Illegal/Decriminalized States (12 States)
⚠️ **Platform blocks ALL sales in these states**

### Texas (TX)
- **Legal Status**: ILLEGAL
- **Sales Allowed**: ❌ NO
- **Purchase Limits**: 0g (all products)
- **Platform Action**: Blocks checkout, returns error

### Georgia (GA)
- **Legal Status**: ILLEGAL
- **Sales Allowed**: ❌ NO
- **Purchase Limits**: 0g (all products)
- **Platform Action**: Blocks checkout, returns error

### North Carolina (NC)
- **Legal Status**: DECRIMINALIZED (possession allowed, sales prohibited)
- **Sales Allowed**: ❌ NO
- **Purchase Limits**: 0g (all products)
- **Platform Action**: Blocks checkout, returns error

### South Carolina (SC)
- **Legal Status**: ILLEGAL
- **Sales Allowed**: ❌ NO
- **Purchase Limits**: 0g (all products)
- **Platform Action**: Blocks checkout, returns error

### Tennessee (TN)
- **Legal Status**: ILLEGAL
- **Sales Allowed**: ❌ NO
- **Purchase Limits**: 0g (all products)
- **Platform Action**: Blocks checkout, returns error

### Kentucky (KY)
- **Legal Status**: ILLEGAL
- **Sales Allowed**: ❌ NO
- **Purchase Limits**: 0g (all products)
- **Platform Action**: Blocks checkout, returns error

### Indiana (IN)
- **Legal Status**: ILLEGAL
- **Sales Allowed**: ❌ NO
- **Purchase Limits**: 0g (all products)
- **Platform Action**: Blocks checkout, returns error

### Wisconsin (WI)
- **Legal Status**: ILLEGAL
- **Sales Allowed**: ❌ NO
- **Purchase Limits**: 0g (all products)
- **Platform Action**: Blocks checkout, returns error

### Iowa (IA)
- **Legal Status**: ILLEGAL
- **Sales Allowed**: ❌ NO
- **Purchase Limits**: 0g (all products)
- **Platform Action**: Blocks checkout, returns error

### Nebraska (NE)
- **Legal Status**: DECRIMINALIZED (possession allowed, sales prohibited)
- **Sales Allowed**: ❌ NO
- **Purchase Limits**: 0g (all products)
- **Platform Action**: Blocks checkout, returns error

### Kansas (KS)
- **Legal Status**: ILLEGAL
- **Sales Allowed**: ❌ NO
- **Purchase Limits**: 0g (all products)
- **Platform Action**: Blocks checkout, returns error

### Wyoming (WY)
- **Legal Status**: ILLEGAL
- **Sales Allowed**: ❌ NO
- **Purchase Limits**: 0g (all products)
- **Platform Action**: Blocks checkout, returns error

### Idaho (ID)
- **Legal Status**: ILLEGAL
- **Sales Allowed**: ❌ NO
- **Purchase Limits**: 0g (all products)
- **Platform Action**: Blocks checkout, returns error

### New Hampshire (NH)
- **Legal Status**: DECRIMINALIZED (possession allowed, sales prohibited)
- **Sales Allowed**: ❌ NO
- **Purchase Limits**: 0g (all products)
- **Platform Action**: Blocks checkout, returns error

---

## Technical Implementation Details

### Code Locations
1. **State Rules Database**: `src/lib/compliance/compliance-rules.ts`
2. **Deebo Compliance Agent**: `src/server/agents/deebo.ts`
3. **Checkout Validation**: `src/app/api/checkout/process-payment/route.ts`
4. **Age Gate UI**: `src/components/age-gate.tsx` (client-side only)

### Validation Flow
```
1. Customer adds products to cart
2. Customer proceeds to checkout
3. Server validates session (age, state, medical card)
4. Deebo agent checks:
   - Legal status in dispensary state
   - Customer age requirement
   - Medical card requirement (if applicable)
   - Purchase limits by product type
5. If violations found: Block transaction, return errors
6. If compliant: Allow payment processing
```

### Error Messages
All compliance errors are returned to the customer:
- "Cannabis sales are not legal in [State]"
- "Customer is [age] years old. [State] requires customers to be [minAge]+"
- "[State] requires a valid medical marijuana card for cannabis purchases"
- "Flower limit exceeded: [amount]g > [limit]g allowed in [State]"
- "Concentrate limit exceeded: [amount]g > [limit]g allowed in [State]"
- "Edibles limit exceeded: [amount]mg THC > [limit]mg allowed in [State]"

---

## Legal Review Action Items

### Attorney Must Complete:
1. ✅ Verify legal status for all 51 jurisdictions
2. ✅ Confirm age requirements match current state law
3. ✅ Validate purchase limits against state regulations
4. ✅ Review medical card requirements
5. ✅ Identify any missing restrictions or special conditions
6. ✅ Sign off on compliance implementation
7. ✅ Document any required changes
8. ✅ Approve for production deployment

### Required Deliverable:
**Legal Sign-Off Document** stating:
- All state rules have been reviewed
- Rules are accurate as of [date]
- Platform is compliant with state regulations
- Approval to launch in production

### Timeline
- **Review Deadline**: BEFORE 12-hour production launch
- **Blocker Status**: CRITICAL - No transactions without legal approval
- **Escalation**: If not complete in 6 hours, escalate to CEO

---

## Disclaimer

This document is a technical compilation of cannabis compliance rules implemented in the BakedBot platform. **This is NOT legal advice**. All rules must be reviewed and approved by qualified legal counsel before production deployment.

---

**Last Updated**: November 30, 2025
**Document Version**: 1.0
**Review Status**: ⚠️ PENDING ATTORNEY REVIEW

---

## Contact Information

**Technical Questions**: Dev 1 (Team Lead)
**Legal Review**: [Attorney Name/Firm - TO BE ASSIGNED]
**Compliance Updates**: Update `src/lib/compliance/compliance-rules.ts` and notify legal team
