# Fixture: Weekly Digest — Thrive Syracuse

**Skill:** executive-brief
**Skill version:** 0.1.0
**Fixture type:** output quality test
**Format:** digest
**Status:** eval-ready

---

## Input

```json
{
  "scope": ["org_thrive_syracuse"],
  "date_range": "2026-03-24 to 2026-03-30",
  "format": "digest",
  "focus_areas": ["revenue", "campaigns", "loyalty", "anomalies"]
}
```

## Supporting data (simulated)

```
Revenue: $28,400 (prev week $31,200, −9%)
Transactions: 2,680 (prev 2,940, −9%)
Avg basket: $10.60 (prev $10.61, flat)
Active campaigns: 0 (last campaign sent March 18)
Loyalty enrollments this week: 14 new members
Loyalty redemptions: 47 (−18% vs prior week)
Open anomaly memos: 1 (Sunday March 30 revenue drop — Monitor status)
Deebo compliance flags: 0
Upcoming: Thrive loyalty promo expiring April 5
```

---

## Expected Output Characteristics

**PASS criteria:**
- [ ] Opens with the numbers — not preamble
- [ ] Flags campaign gap (12 days since last send) as a top action
- [ ] Surfaces loyalty promo expiry as "coming up" risk
- [ ] References open anomaly memo without re-explaining it (links/references, doesn't repeat)
- [ ] Does not editorialize ("things look challenging") — factual and direct
- [ ] Total word count 150–250 words
- [ ] One clear owner per action item

**FAIL criteria:**
- [ ] Buries the revenue decline below other content
- [ ] Omits the upcoming promo expiry
- [ ] Re-explains the Sunday anomaly at length instead of referencing the memo
- [ ] Recommends a specific campaign type (that's Craig's job)
- [ ] Exceeds 300 words in digest format

---

## Reference Output (passing example)

```
## BakedBot Portfolio Brief — Thrive Syracuse — March 24–30, 2026

THIS PERIOD: Revenue $28,400 (−9% WoW) · Transactions 2,680 (−9%) · Basket $10.60 (flat)
Campaigns sent: 0 · Loyalty enrollments: 14 · Compliance flags: 0

TOP ACTIONS NEEDED:
1. No campaign sent in 12 days — at-risk and VIP segments are going cold — Craig / Operator — This week
2. Loyalty promo expires April 5 — confirm renewal or let it close intentionally — Operator — By April 3
3. Sunday revenue anomaly open (March 30, −34%) — pull Sunday baseline to diagnose — Pops — This week

HIGHLIGHTS:
- Zero compliance flags this week
- 14 new loyalty enrollments without a campaign — organic growth is working

COMING UP:
- April 5: Loyalty promo expiry — decision needed by April 3
- April 6: Second Sunday data point to confirm/clear the March 30 anomaly
- No campaigns scheduled — window is open for a spring push
```
