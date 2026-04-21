# Thrive Syracuse Inbox Stress Report

- Generated: 2026-04-18T16:47:09.781Z
- Org: org_thrive_syracuse
- Cases run: 25
- Average score: 76.9
- Response-ready cases: 21/25
- Poor or fail: 4
- Failures: 0

## Summary Table
| Case | Kind | Agent | Grade | Score | Ready | Top issue |
| --- | --- | --- | --- | ---: | --- | --- |
| slow-movers-table | data | money_mike | great | 92 | yes | No specific bundle recommendations mentioned for bundling actions |
| expiring-inventory-writeoff | data | money_mike | good | 75 | yes | Didn't consider absolute time-to-expire for each item |
| top-sellers-restock | data | pops | great | 92 | yes | None significant - the response is comprehensive and well-structured |
| category-margin-mix | data | money_mike | poor | 35 | no | Directly contradicts the stated goal of using concentrate as the anchor |
| daily-traffic-gap | data | pops | good | 82 | yes | Missed opportunity to compare the soft window with other business metrics |
| competitor-price-response | data | ezal | great | 95 | yes | No mention of implementation timeline beyond 48-hour campaign |
| review-queue-priority | data | mrs_parker | good | 85 | yes | No specific mention of how to handle the product quality concern for Alina R. |
| checkin-daily-actions | data | mrs_parker | good | 82 | yes | Doesn't utilize the mood breakdown data effectively in the action plan |
| campaign-follow-up | data | craig | poor | 42 | no | Failed to use the actual campaign performance data provided |
| customer-segments-winback | data | mrs_parker | great | 92 | yes | Could provide more specifics on how to determine appropriate offer tiers |
| loyalty-enrollment-gap | data | mrs_parker | great | 92 | yes | Could provide more specific details about the loyalty program benefits mentioned |
| owner-briefing-summary | data | pops | good | 78 | yes | Missed including the 12:30 PM vendor meeting as a time-sensitive item |
| weekend-flash-sale | non_data | money_mike | good | 80 | yes | No specific product categories suggested for the bundles |
| compliant-sms-draft | non_data | craig | poor | 45 | no | Includes unnecessary campaign strategy and target segment sections not requested in the p... |
| one-star-review-reply | non_data | smokey | good | 75 | yes | No specific solutions offered for wait times |
| beginner-budtender-talking-points | non_data | smokey | great | 95 | yes | None significant for the required use case |
| vendor-day-plan | non_data | craig | good | 80 | yes | Overly detailed for a simple inbox response (could be more concise) |
| owner-daily-briefing-no-data | non_data | puff | good | 78 | yes | Could have suggested alternative data sources that might be available |
| differentiate-thrive | non_data | ezal | good | 82 | yes | Could provide more specific local Syracuse market insights |
| no-verified-competitor-data | non_data | ezal | good | 80 | yes | Could be more specific about where to find competitor intelligence reports if they exist |
| partial-table-analysis | data | money_mike | good | 75 | yes | Doesn't prioritize which actions to take first based on severity |
| multi-turn-sale-to-email | multi_turn | craig | good | 78 | yes | Email contains emoji and casual language that may not align with brand voice |
| multi-turn-budtender-brief | multi_turn | smokey | great | 92 | yes | Could potentially add brief examples of specific strain types to make it even more concre... |
| operator-pairings-no-medical | non_data | smokey | good | 85 | yes | The 'match confidence' and 'in stock' metrics appear arbitrary without context |
| exact-slowest-movers-no-data | non_data | puff | poor | 35 | no | Didn't address what to do with current slow-moving items |

## Launch blockers
- category-margin-mix (POOR 35): Correctly identifies concentrate as problematic but recommends anchoring bundle with flower instead of concentrate, contradicting the goal. Issue: Directly contradicts the stated goal of using concentrate as the anchor
- campaign-follow-up (POOR 42): Response ignores actual data provided and includes unsupported claims. Issue: Failed to use the actual campaign performance data provided
- compliant-sms-draft (POOR 45): The response includes unnecessary campaign structure sections and a promotional plug rather than focusing on the compliant SMS draft. Issue: Includes unnecessary campaign strategy and target segment sections not requested in the prompt
- exact-slowest-movers-no-data (POOR 35): Response failed to address slow movers without data and didn't follow expected approach. Issue: Didn't address what to do with current slow-moving items

## Notes
- This runner uses the shared inbox thread-context builder plus inbox persona routing and persona system prompts.
- Briefing-card resilience is covered separately by Jest component tests for partial analytics and check-in payloads.
