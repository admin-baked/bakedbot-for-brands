# Thrive Syracuse Inbox Stress Report

- Generated: 2026-04-18T17:42:08.473Z
- Org: org_thrive_syracuse
- Cases run: 25
- Average score: 83.3
- Response-ready cases: 25/25
- Poor or fail: 0
- Failures: 0

## Summary Table
| Case | Kind | Agent | Grade | Score | Ready | Top issue |
| --- | --- | --- | --- | ---: | --- | --- |
| slow-movers-table | data | money_mike | great | 92 | yes | The write off consideration for Heady Tree Blueberry seems contradictory since it was alr... |
| expiring-inventory-writeoff | data | money_mike | good | 78 | yes | Didn't explicitly reference specific expiration dates in recommendations |
| top-sellers-restock | data | pops | great | 92 | yes | No suggestion on quantities to reorder (though this would require more data) |
| category-margin-mix | data | money_mike | good | 75 | yes | Lacks specific pricing or margin calculations for the proposed bundle |
| daily-traffic-gap | data | pops | good | 85 | yes | Could provide more specific product recommendations for the Flash Sample promotion |
| competitor-price-response | data | ezal | great | 92 | yes | No specific mention of implementation timeline for price changes |
| review-queue-priority | data | mrs_parker | good | 85 | yes | No specific mention of timeframes for responses |
| checkin-daily-actions | data | mrs_parker | good | 78 | yes | Suggestions could be more concrete with immediate implementation steps |
| campaign-follow-up | data | craig | good | 80 | yes | Didn't specify targeted revenue increase or provide benchmarks for what 'more revenue' me... |
| customer-segments-winback | data | mrs_parker | good | 78 | yes | Could better quantify ROI potential with more data analysis |
| loyalty-enrollment-gap | data | mrs_parker | good | 82 | yes | Could provide more concrete implementation details for the 'Tuesday-specific sign-up ince... |
| owner-briefing-summary | data | pops | great | 95 | yes | None - response is near-perfect for the brief |
| weekend-flash-sale | non_data | money_mike | acceptable | 70 | yes | No specific product recommendations based on actual inventory |
| compliant-sms-draft | non_data | craig | good | 80 | yes | Includes upsell for paid services in response |
| one-star-review-reply | non_data | smokey | good | 78 | yes | Lacks specific operational improvements being implemented |
| beginner-budtender-talking-points | non_data | smokey | great | 95 | yes | Could potentially mention how to help customers choose between different product types |
| vendor-day-plan | non_data | craig | great | 92 | yes | No specific vendor details mentioned in the response |
| owner-daily-briefing-no-data | non_data | puff | good | 80 | yes | Doesn't attempt to provide any placeholder values or example metrics |
| differentiate-thrive | non_data | ezal | good | 85 | yes | No specific data about Syracuse market or competitors |
| no-verified-competitor-data | non_data | ezal | good | 85 | yes | Could be more specific about what constitutes 'verified data' |
| partial-table-analysis | data | money_mike | good | 75 | yes | Didn't explicitly acknowledge that this is only partial data |
| multi-turn-sale-to-email | multi_turn | craig | good | 78 | yes | The assistant suggested a 15% discount but the original conversation only mentioned keepi... |
| multi-turn-budtender-brief | multi_turn | smokey | good | 82 | yes | Missing specific product names to ground the recommendations |
| operator-pairings-no-medical | non_data | smokey | good | 78 | yes | Lacks concrete implementation steps for budtenders |
| exact-slowest-movers-no-data | non_data | puff | great | 92 | yes | Somewhat lengthy response for a simple data request |

## Launch blockers
- None

## Notes
- This runner uses the shared inbox thread-context builder plus inbox persona routing and persona system prompts.
- Briefing-card resilience is covered separately by Jest component tests for partial analytics and check-in payloads.
