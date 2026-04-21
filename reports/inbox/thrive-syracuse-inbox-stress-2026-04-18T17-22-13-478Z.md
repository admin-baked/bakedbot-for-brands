# Thrive Syracuse Inbox Stress Report

- Generated: 2026-04-18T17:22:13.478Z
- Org: org_thrive_syracuse
- Cases run: 25
- Average score: 84.7
- Response-ready cases: 24/25
- Poor or fail: 1
- Failures: 0

## Summary Table
| Case | Kind | Agent | Grade | Score | Ready | Top issue |
| --- | --- | --- | --- | ---: | --- | --- |
| slow-movers-table | data | money_mike | great | 92 | yes | No consideration of product expiration dates in the ranking (though expirations are all d... |
| expiring-inventory-writeoff | data | money_mike | great | 90 | yes | No specific timeline for implementing recommendations |
| top-sellers-restock | data | pops | great | 92 | yes | The calculation for potential lost revenue for MFNY Hash Burger 1g is based on incomplete... |
| category-margin-mix | data | money_mike | great | 92 | yes | Could have explored alternative bundle combinations for comparison |
| daily-traffic-gap | data | pops | great | 92 | yes | Could suggest more specific staff scheduling details |
| competitor-price-response | data | ezal | great | 92 | yes | Could benefit from slightly more detail on how to monitor competitor responses |
| review-queue-priority | data | mrs_parker | great | 92 | yes | None significant - this response is comprehensive and well-structured |
| checkin-daily-actions | data | mrs_parker | good | 78 | yes | Suggestion for SMS optimization is vague without concrete tactics |
| campaign-follow-up | data | craig | great | 92 | yes | No specific mention of how to calculate or implement the 15% CTR improvement target for S... |
| customer-segments-winback | data | mrs_parker | good | 78 | yes | Could provide more specificity on how to determine historical purchase value |
| loyalty-enrollment-gap | data | mrs_parker | great | 92 | yes | The 22-25% improvement target seems ambitious without specific implementation details |
| owner-briefing-summary | data | pops | great | 92 | yes | Could be slightly more concrete about specific actions for gummies momentum |
| weekend-flash-sale | non_data | money_mike | poor | 45 | no | Completely misses the cannabis dispensary context - suggests fresh food items instead of ... |
| compliant-sms-draft | non_data | craig | good | 82 | yes | Includes promotional plug for paid services at the end |
| one-star-review-reply | non_data | smokey | good | 80 | yes | No specific details about what changes are being made to prevent future issues |
| beginner-budtender-talking-points | non_data | smokey | good | 85 | yes | Could include more information about possible effects to manage expectations |
| vendor-day-plan | non_data | craig | good | 78 | yes | Lacks specific vendor information (who the vendors are, what they're bringing) |
| owner-daily-briefing-no-data | non_data | puff | good | 78 | yes | Could provide more specific guidance on where to find this data |
| differentiate-thrive | non_data | ezal | good | 78 | yes | Lacks specific Syracuse market intelligence |
| no-verified-competitor-data | non_data | ezal | great | 95 | yes | Could potentially suggest more specific methods for gathering competitor pricing data |
| partial-table-analysis | data | money_mike | great | 92 | yes | Could have mentioned inventory turnover rates more explicitly |
| multi-turn-sale-to-email | multi_turn | craig | good | 82 | yes | Target segment mentions 90-day purchase history but doesn't specify how to implement targ... |
| multi-turn-budtender-brief | multi_turn | smokey | good | 82 | yes | Missing specific product inventory data that would make recommendations more concrete |
| operator-pairings-no-medical | non_data | smokey | great | 92 | yes | Could benefit from slightly more specific guidance on how budtenders should present these... |
| exact-slowest-movers-no-data | non_data | puff | good | 75 | yes | Failed to recognize the prompt explicitly stated this was a 'no data' case |

## Launch blockers
- weekend-flash-sale (POOR 45): Response ignores the cannabis dispensary context and provides grocery store strategy instead. Issue: Completely misses the cannabis dispensary context - suggests fresh food items instead of cannabis products

## Notes
- This runner uses the shared inbox thread-context builder plus inbox persona routing and persona system prompts.
- Briefing-card resilience is covered separately by Jest component tests for partial analytics and check-in payloads.
