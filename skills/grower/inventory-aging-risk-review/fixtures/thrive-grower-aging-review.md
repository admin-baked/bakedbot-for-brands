# Fixture: Grower Aging Risk Review

**Skill:** inventory-aging-risk-review
**Skill version:** 0.1.0
**Fixture type:** trigger + output quality + policy test
**Status:** eval-ready

---

## Input

```json
{
  "org_id": "org_thrive_grower",
  "review_date": "2026-03-31",
  "batches": [
    {
      "id": "B-041",
      "strain": "Blue Dream",
      "form": "flower",
      "harvest_date": "2026-01-07",
      "coa_expiry": "2027-01-07",
      "units_lbs": 18,
      "pending_po_units_lbs": 6,
      "storage_conditions": "nominal"
    },
    {
      "id": "B-042",
      "strain": "Kiefer's OG",
      "form": "flower",
      "harvest_date": "2025-12-22",
      "coa_expiry": "2026-04-28",
      "units_lbs": 12,
      "pending_po_units_lbs": 0,
      "storage_conditions": "nominal"
    },
    {
      "id": "B-043",
      "strain": "Purple Punch",
      "form": "concentrate",
      "harvest_date": "2026-02-15",
      "coa_expiry": "2027-02-15",
      "units_g": 800,
      "pending_po_units_g": 400,
      "storage_conditions": "nominal"
    },
    {
      "id": "B-044",
      "strain": "Gelato",
      "form": "flower",
      "harvest_date": "2026-03-10",
      "coa_expiry": "2027-03-10",
      "units_lbs": 22,
      "pending_po_units_lbs": 12,
      "storage_conditions": "nominal"
    }
  ]
}
```

**Derived ages as of 2026-03-31:**
- B-041 Blue Dream flower: 83 days post-harvest · COA valid 281 days · 12 lbs uncommitted
- B-042 Kiefer's OG flower: 99 days post-harvest · COA valid 28 days · 12 lbs uncommitted (all of it)
- B-043 Purple Punch concentrate: 44 days post-harvest · COA valid 321 days · 400g uncommitted
- B-044 Gelato flower: 21 days post-harvest · COA valid 344 days · 10 lbs uncommitted

---

## Expected Output Characteristics

**PASS criteria:**
- [ ] B-042 classified as 🔴 Urgent — 99 days + COA expiry in 28 days + zero POs = three risk factors
- [ ] B-041 classified as 🟠 At Risk — 83 days approaching 90-day cliff, 12 lbs uncommitted
- [ ] B-043 classified as 🟡 Watch — 44 days, COA healthy, half allocated
- [ ] B-044 classified as 🟢 Fresh — 21 days, COA healthy
- [ ] COA expiry on B-042 (28 days) triggers an explicit escalation note / deadline
- [ ] Revenue at risk calculated for B-041 and B-042 (uncommitted units × estimated price)
- [ ] Recommended actions are specific: "Contact top velocity partners", "Schedule COA retest"
- [ ] Disposal is NOT recommended autonomously — escalated to human if relevant
- [ ] Memo stays scannable: 200–400 words

**FAIL criteria:**
- [ ] B-042 not flagged as Urgent (misses the COA clock)
- [ ] B-041 rated Fresh or Watch (ignores 83-day quality clock)
- [ ] Disposal recommended without human sign-off flag
- [ ] Revenue at risk calculation omits pending PO units (counts all units, not just uncommitted)
- [ ] Memo lists 6+ actions (violates bounded-actions rule)

---

## Policy Test

**Input addition:** Same batch data but add `"storage_conditions": "humidity_alert"` to B-041.

**Expected behavior:**
- [ ] B-041 upgrades from 🟠 At Risk to 🔴 Urgent
- [ ] Compliance + operations escalation flagged
- [ ] Skill does not recommend sales action until storage condition is resolved — compliance first

---

## Reference Output (passing example)

```
## Inventory Aging Risk Review — Thrive Grower — March 31, 2026

BATCHES REVIEWED: 4  |  UNCOMMITTED REVENUE AT RISK: ~$18,400 (est.)  |  URGENT: 1

### Risk Summary
| Tier | Batches | Est. Revenue at Risk |
|------|---------|---------------------|
| 🔴 Urgent | 1 (B-042) | ~$10,800 |
| 🟠 At Risk | 1 (B-041) | ~$7,600 |
| 🟡 Watch | 1 (B-043) | ~$0 (half allocated) |
| 🟢 Fresh | 1 (B-044) | — |

### 🔴 Urgent — Act This Week
| Batch | Strain | Harvest Age | COA Expires | Uncommitted | Risk Drivers |
|-------|--------|-------------|-------------|-------------|-------------|
| B-042 | Kiefer's OG (flower) | 99 days | 28 days (Apr 28) | 12 lbs (100%) | Quality cliff passed · COA imminent · Zero POs |

**Action required in 3 days:** Contact top velocity partners with preferential pricing on Kiefer's OG.
If no PO confirmed by Apr 14, schedule COA retest immediately — product cannot sell on an expired COA.

### 🟠 At Risk — Act This Month
| Batch | Strain | Harvest Age | COA Expires | Uncommitted |
|-------|--------|-------------|-------------|-------------|
| B-041 | Blue Dream (flower) | 83 days | 281 days | 12 lbs |

Approaching the 90-day quality cliff. COA is healthy. 12 lbs uncommitted — route to Tier 1 partners
now while it's still in peak quality window.

### Recommended Actions
| # | Action | Owner | Deadline |
|---|--------|-------|----------|
| 1 | Partner outreach — preferential pricing on B-042 Kiefer's OG | Sales | Apr 3 |
| 2 | Schedule COA retest for B-042 if no PO by Apr 14 | Compliance | Apr 14 |
| 3 | Route B-041 Blue Dream to Tier 1 partners — 7-day window before quality cliff | Sales | Apr 7 |

### Revenue Protection Summary
~$18,400 uncommitted at current wholesale estimates. Full action on B-042 and B-041 within the
next 10 days could protect ~85% of that value. After Apr 7, B-041 enters buyer-resistance territory.
```
