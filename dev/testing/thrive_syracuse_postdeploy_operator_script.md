# Thrive Syracuse Post-Deploy Operator Script
**Date:** 2026-04-02
**Environment:** Production
**Primary URL:** `https://bakedbot.ai/thrivesyracuse/rewards#check-in`
**Master Reference:** `dev/testing/thrive_syracuse_master.md` -> `Post-Deploy Retest Addendum`

## Purpose

Run one focused live smoke after the April 2, 2026 Thrive check-in deployment:
- returning online-order customer via full phone
- staff-assisted first name + last 4
- net-new customer safety check

## Production Readiness Snapshot

- App Hosting deploy passed on `main`
- Type Check & Lint passed on `main`
- E2E passed on `main`
- Firestore `phoneLast4` lookup indexes are ready in production
- Thrive customer backfill is complete: `15` scanned, `13` updated, `0` remaining without `phoneLast4`
- Thrive scoped orders already had `phoneLast4`: `3669` scanned, `0` updated

## Before You Start

Prepare two test identities:

1. Returning customer
Use a real Thrive customer who already placed an AIQ / online order.
Write down:
- first name
- full phone number
- last 4 digits
- whether their email is already known in CRM

2. Net-new customer
Use a clean phone and email that do not already exist in Thrive CRM or order history.

Create a screenshot folder:
- `dev/testing/screenshots/thrive_golive_2026-04-02/`

Suggested screenshot names:
- `postdeploy_returning_fullphone_initial.png`
- `postdeploy_returning_fullphone_result.png`
- `postdeploy_staff_last4_candidates.png`
- `postdeploy_staff_last4_utility.png`
- `postdeploy_staff_last4_success.png`
- `postdeploy_net_new_success.png`

## Flow A: Returning Customer via Full Phone

1. Open `https://bakedbot.ai/thrivesyracuse/rewards#check-in`.
2. Confirm the public check-in card loads.
3. Keep `Use full phone number` selected.
4. Enter the returning customer's first name and full phone number.
5. Confirm the ID checkbox.
6. Continue.
7. Verify the flow resolves as returning, not net-new.
Expected:
- no full signup restart
- no forced duplicate email capture if email is already known and consented
- utility step should ask only for the missing enrichment
8. Finish the check-in.
9. Capture the result state screenshot.

## Flow B: Staff-Assisted First Name + Last 4

1. Refresh the same page or reopen `https://bakedbot.ai/thrivesyracuse/rewards#check-in`.
2. Choose `Use first name + last 4`.
3. Enter the same returning customer's first name and last 4 digits.
4. Confirm the ID checkbox.
5. Click `Find My Profile`.
6. Verify a masked candidate list appears.
Expected:
- at least one candidate matches the intended customer
- no full phone number is shown
7. Select the correct candidate.
8. Click `Continue to Check-In`.
9. Verify the returning utility step loads successfully.
Expected:
- returning context appears
- browser did not require re-entry of the full phone number
10. Finish the check-in.
11. Capture:
- candidate list
- utility step
- final success state

## Flow C: Net-New Safety Check

1. Stay on the public check-in card.
2. Switch back to `Use full phone number`.
3. Enter the net-new customer's first name and full phone number.
4. Confirm the ID checkbox.
5. Continue.
6. Verify the flow enters the net-new path.
Expected:
- name and email collection still work
- no returning-customer shortcut appears
7. Submit the net-new check-in.
8. Capture the success state.

## Backend Verification

After the three flows, verify:

1. Returning customer full-phone visit attached to the correct existing identity.
2. Returning customer staff-assisted visit attached to the same identity.
3. No wrong-customer merge occurred.
4. Visit count increased appropriately on the correct record.
5. Net-new customer created a fresh customer record and visit.
6. Returning customer did not receive duplicate new-customer welcome automation.
7. Net-new customer still triggered the normal welcome path.

Check these surfaces:
- public success state on the rewards page
- CRM customer record
- check-in visits feed
- playbook activity or email history, if available

## Pass / Fail Rules

Mark `PASS` if all of the following are true:
- returning customer resolves correctly via full phone
- staff last-4 lookup finds the right candidate
- staff-assisted completion reuses the correct identity
- net-new flow still works
- no duplicate welcome behavior for returning customers

Mark `P0` if any of the following occur:
- wrong-customer merge
- returning customer is blocked from check-in
- net-new customer no longer receives the welcome flow

Mark `P1` if any of the following occur:
- staff-assisted lookup fails for a known returning customer, but full-phone still works
- returning customer is treated as new and receives duplicate welcome automation

## Quick Notes Template

Use this during the live run:

```text
Returning customer tested:
Phone mode result:
Staff last-4 result:
Net-new result:
CRM verification:
Playbook / email verification:
Screenshots saved:
Open bugs:
```
