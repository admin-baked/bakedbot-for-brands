# Thrive Syracuse Inbox Stress Report

- Generated: 2026-04-18T16:26:05.718Z
- Org: org_thrive_syracuse
- Cases run: 25
- Average score: 84.0
- Response-ready cases: 24/25
- Poor or fail: 1
- Failures: 0

## Summary Table
| Case | Kind | Agent | Grade | Score | Ready | Top issue |
| --- | --- | --- | --- | ---: | --- | --- |
| slow-movers-table | data | money_mike | good | 82 | yes | Missing implementation timelines for actions |
| expiring-inventory-writeoff | data | money_mike | good | 78 | yes | No immediate next steps or implementation timeline |
| top-sellers-restock | data | pops | great | 95 | yes | No specific suggestions on how to expedite orders or alternative suppliers |
| category-margin-mix | data | money_mike | great | 92 | yes | No specific bundle product recommendations beyond category |
| daily-traffic-gap | data | pops | great | 92 | yes | Could have provided more specifics about which products to highlight in the promo |
| competitor-price-response | data | ezal | great | 92 | yes | No specific compliance considerations mentioned regarding price matching strategies |
| review-queue-priority | data | mrs_parker | great | 95 | yes | Could benefit from slightly more detail on what constitutes a 'small gesture of goodwill' |
| checkin-daily-actions | data | mrs_parker | great | 92 | yes | Email consent optimization suggestion could benefit from compliance check |
| campaign-follow-up | data | craig | good | 78 | yes | Lack of specific metrics for list fatigue prevention (e.g., frequency caps, recency windo... |
| customer-segments-winback | data | mrs_parker | poor | 45 | no | Major grounding error - ignored the most valuable segment (VIP) |
| loyalty-enrollment-gap | data | mrs_parker | great | 92 | yes | Could benefit from slightly more detail on how to replicate Saturday's success |
| owner-briefing-summary | data | pops | great | 92 | yes | Could slightly expand on the recommended next steps for each item |
| weekend-flash-sale | non_data | money_mike | good | 78 | yes | Missed opportunity to incorporate specific weekend timing psychology |
| compliant-sms-draft | non_data | craig | good | 75 | yes | Includes promotional upsell for paid services |
| one-star-review-reply | non_data | smokey | good | 80 | yes | Could be more specific about the investigation process |
| beginner-budtender-talking-points | non_data | smokey | great | 92 | yes | No specific product recommendations beyond general dosing guidance |
| vendor-day-plan | non_data | craig | good | 82 | yes | Lacks specific timing assignments for tasks throughout the week |
| owner-daily-briefing-no-data | non_data | puff | good | 75 | yes | Doesn't suggest timeframe for when data might be available |
| differentiate-thrive | non_data | ezal | good | 85 | yes | No data on specific nearby competitors to tailor recommendations |
| no-verified-competitor-data | non_data | ezal | great | 95 | yes | None - this response excels in all dimensions |
| partial-table-analysis | data | money_mike | good | 82 | yes | No guidance on implementation of the proposed promotion |
| multi-turn-sale-to-email | multi_turn | craig | good | 82 | yes | Could better utilize POS purchase history data for targeting |
| multi-turn-budtender-brief | multi_turn | smokey | great | 92 | yes | Could add slightly more detail on why myrcene-dominant products are less ideal for daytime |
| operator-pairings-no-medical | non_data | smokey | good | 82 | yes | No consideration of specific product inventory or availability |
| exact-slowest-movers-no-data | non_data | puff | good | 75 | yes | Doesn't acknowledge that this is a stress case scenario where data is unavailable |

## Launch blockers
- customer-segments-winback (POOR 45): Incorrectly prioritized At-risk segment over VIP for win-back despite clear data showing VIP should be priority. Issue: Major grounding error - ignored the most valuable segment (VIP)

## Notes
- This runner uses the shared inbox thread-context builder plus inbox persona routing and persona system prompts.
- Briefing-card resilience is covered separately by Jest component tests for partial analytics and check-in payloads.
