# Thrive Syracuse Inbox Stress Report

- Generated: 2026-04-18T17:32:38.754Z
- Org: org_thrive_syracuse
- Cases run: 25
- Average score: 83.7
- Response-ready cases: 24/25
- Poor or fail: 1
- Failures: 0

## Summary Table
| Case | Kind | Agent | Grade | Score | Ready | Top issue |
| --- | --- | --- | --- | ---: | --- | --- |
| slow-movers-table | data | money_mike | great | 92 | yes | No specific timeline provided for implementing the action plan |
| expiring-inventory-writeoff | data | money_mike | great | 92 | yes | Minor opportunity to provide more specific timing for markdown review |
| top-sellers-restock | data | pops | great | 92 | yes | Minor formatting inconsistency in all-caps 'EDIBLE' vs other category formats |
| category-margin-mix | data | money_mike | great | 92 | yes | Could have explicitly calculated the potential blended margin for the bundle |
| daily-traffic-gap | data | pops | great | 92 | yes | Could provide more specific data on expected impact of staff reassignment |
| competitor-price-response | data | ezal | great | 92 | yes | Could benefit from slightly more detail on implementation timeline for the vape promotion |
| review-queue-priority | data | mrs_parker | great | 95 | yes | No specific timeline for implementation |
| checkin-daily-actions | data | mrs_parker | good | 80 | yes | Missing specific timing details (how to prioritize the 18 pending reviews) |
| campaign-follow-up | data | craig | great | 85 | yes | No specific metrics for measuring list fatigue or frequency caps |
| customer-segments-winback | data | mrs_parker | good | 82 | yes | No specific rationale for choosing email over other channels |
| loyalty-enrollment-gap | data | mrs_parker | good | 82 | yes | No mention of investigating whether the lowest day (Tuesday) has specific challenges |
| owner-briefing-summary | data | pops | great | 90 | yes | The 'Focus' statement at the end isn't explicitly requested in the prompt |
| weekend-flash-sale | non_data | money_mike | good | 75 | yes | Doesn't address the 'non_data' nature of the stress case which had no source data |
| compliant-sms-draft | non_data | craig | great | 92 | yes | Could potentially include more specific product details to increase appeal |
| one-star-review-reply | non_data | smokey | good | 82 | yes | Could be more specific about next steps after collecting information |
| beginner-budtender-talking-points | non_data | smokey | good | 85 | yes | Lacks specific product recommendations |
| vendor-day-plan | non_data | craig | poor | 40 | no | Completely ignores floor team preparation needs |
| owner-daily-briefing-no-data | non_data | puff | good | 75 | yes | Could have provided more specific data examples rather than general categories |
| differentiate-thrive | non_data | ezal | good | 80 | yes | No reference to specific nearby dispensaries in Syracuse |
| no-verified-competitor-data | non_data | ezal | great | 95 | yes | Could be slightly more specific about how to verify data |
| partial-table-analysis | data | money_mike | good | 75 | yes | Calculated margins incorrectly (Heady Tree Gelato is actually 57.8% not higher) |
| multi-turn-sale-to-email | multi_turn | craig | good | 80 | yes | No specific timing mentioned for the 'Friday afternoon' sale |
| multi-turn-budtender-brief | multi_turn | smokey | great | 92 | yes | Minor opportunity to add language about product rotation or seasonal adjustments |
| operator-pairings-no-medical | non_data | smokey | good | 80 | yes | Doesn't use any specific product data from the dispensary |
| exact-slowest-movers-no-data | non_data | puff | good | 75 | yes | Response is generic and doesn't provide any immediate value without the data |

## Launch blockers
- vendor-day-plan (POOR 40): The response provides marketing ideas but lacks operational preparation for floor team and loyalty follow-up. Issue: Completely ignores floor team preparation needs

## Notes
- This runner uses the shared inbox thread-context builder plus inbox persona routing and persona system prompts.
- Briefing-card resilience is covered separately by Jest component tests for partial analytics and check-in payloads.
