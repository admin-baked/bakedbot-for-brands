# Thrive Syracuse Inbox Stress Report

- Generated: 2026-04-18T17:13:53.142Z
- Org: org_thrive_syracuse
- Cases run: 25
- Average score: 81.2
- Response-ready cases: 22/25
- Poor or fail: 2
- Failures: 0

## Summary Table
| Case | Kind | Agent | Grade | Score | Ready | Top issue |
| --- | --- | --- | --- | ---: | --- | --- |
| slow-movers-table | data | money_mike | good | 85 | yes | No specific discount percentages mentioned for individual items |
| expiring-inventory-writeoff | data | money_mike | good | 78 | yes | Lacks specific implementation timeline for markdowns |
| top-sellers-restock | data | pops | great | 92 | yes | Slightly informal reference to 'Money Mike' without context |
| category-margin-mix | data | money_mike | good | 82 | yes | Could provide more detail on margin protection math |
| daily-traffic-gap | data | pops | good | 82 | yes | Promo move mentions 'beverage + light snack' which may not align with typical dispensary ... |
| competitor-price-response | data | ezal | great | 92 | yes | Slightly aggressive 'beat' recommendation on premium products might impact perceived value |
| review-queue-priority | data | mrs_parker | great | 92 | yes | Could suggest more specific timeline for response prioritization |
| checkin-daily-actions | data | mrs_parker | good | 78 | yes | Missing concrete implementation steps (e.g., how to follow up on Day-3 reviews) |
| campaign-follow-up | data | craig | great | 92 | yes | No specific mention of segmentation to prevent list fatigue |
| customer-segments-winback | data | mrs_parker | great | 92 | yes | Could benefit from slightly more specifics on implementation timing or metrics |
| loyalty-enrollment-gap | data | mrs_parker | great | 88 | yes | Tuesday promotion idea might need more specific incentive details |
| owner-briefing-summary | data | pops | great | 92 | yes | Could suggest specific metrics to monitor for trend analysis |
| weekend-flash-sale | non_data | money_mike | acceptable | 65 | no | Fails to use any provided data about Thrive Syracuse (prompt was marked as non_data but s... |
| compliant-sms-draft | non_data | craig | poor | 40 | no | Major deviation from the requested task by adding marketing pitch for services |
| one-star-review-reply | non_data | smokey | good | 80 | yes | Could be more specific about the resolution process |
| beginner-budtender-talking-points | non_data | smokey | great | 95 | yes | Could potentially mention different product formats (gummies, chocolates, etc.) |
| vendor-day-plan | non_data | craig | good | 80 | yes | No consideration of staffing requirements during the 4-hour event |
| owner-daily-briefing-no-data | non_data | puff | great | 92 | yes | Template is generic but appropriate given lack of specific data |
| differentiate-thrive | non_data | ezal | good | 80 | yes | No specific market analysis of nearby competitors |
| no-verified-competitor-data | non_data | ezal | great | 95 | yes | None significant - response handles the stress case perfectly |
| partial-table-analysis | data | money_mike | great | 92 | yes | Could benefit from slightly more specific promotion recommendations (e.g., exact discount... |
| multi-turn-sale-to-email | multi_turn | craig | poor | 35 | no | Ignored the business data about keeping discount under 20% (used 15% instead) |
| multi-turn-budtender-brief | multi_turn | smokey | good | 75 | yes | Contains compliance risk with 'associated with alertness and focus' assertions |
| operator-pairings-no-medical | non_data | smokey | good | 82 | yes | Could provide more specific product examples |
| exact-slowest-movers-no-data | non_data | puff | good | 75 | yes | Missed the prompt constraint of 'no data' |

## Launch blockers
- compliant-sms-draft (POOR 40): The response includes a compliant SMS draft but fails to focus on the request and adds unnecessary marketing pitch. Issue: Major deviation from the requested task by adding marketing pitch for services
- multi-turn-sale-to-email (POOR 35): Response lacks proper grounding and has compliance issues. Issue: Ignored the business data about keeping discount under 20% (used 15% instead)

## Notes
- This runner uses the shared inbox thread-context builder plus inbox persona routing and persona system prompts.
- Briefing-card resilience is covered separately by Jest component tests for partial analytics and check-in payloads.
