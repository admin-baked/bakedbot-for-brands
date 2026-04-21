# Thrive Syracuse Inbox Stress Report

- Generated: 2026-04-18T16:32:06.936Z
- Org: org_thrive_syracuse
- Cases run: 25
- Average score: 82.5
- Response-ready cases: 24/25
- Poor or fail: 1
- Failures: 0

## Summary Table
| Case | Kind | Agent | Grade | Score | Ready | Top issue |
| --- | --- | --- | --- | ---: | --- | --- |
| slow-movers-table | data | money_mike | good | 82 | yes | The discount percentage for MFNY Hash Burger isn't calculated correctly based on the give... |
| expiring-inventory-writeoff | data | money_mike | poor | 45 | no | Ignored expiration dates in analysis - all items expire in 2026 but are treated as urgent |
| top-sellers-restock | data | pops | great | 92 | yes | Could provide more specific timing on when to place orders for each item |
| category-margin-mix | data | money_mike | good | 80 | yes | Bundle pricing calculation appears incorrect - states $49.99 bundle gives concentrates a ... |
| daily-traffic-gap | data | pops | great | 92 | yes | Minor improvement: Could suggest additional metrics to track impact of proposed changes |
| competitor-price-response | data | ezal | great | 92 | yes | No discussion of margin impact from matching prices |
| review-queue-priority | data | mrs_parker | great | 92 | yes | No mention of response time targets for each priority level |
| checkin-daily-actions | data | mrs_parker | good | 82 | yes | Missing specific timeline estimates for completing each action |
| campaign-follow-up | data | craig | good | 80 | yes | Revenue projections lack specific calculation methodology |
| customer-segments-winback | data | mrs_parker | great | 92 | yes | Could have provided more specific timing recommendations (e.g., how far in advance to lau... |
| loyalty-enrollment-gap | data | mrs_parker | great | 92 | yes | No specific mention of compliance considerations for loyalty program |
| owner-briefing-summary | data | pops | good | 85 | yes | Could provide more specific actions for addressing competitor pricing |
| weekend-flash-sale | non_data | money_mike | good | 75 | yes | No specific product recommendations or inventory data to back up bundle contents |
| compliant-sms-draft | non_data | craig | good | 75 | yes | Could be tighter copy as requested |
| one-star-review-reply | non_data | smokey | good | 78 | yes | Lacks concrete next steps to address the systemic issues mentioned |
| beginner-budtender-talking-points | non_data | smokey | great | 95 | yes | Slightly more detail could be added about why edibles metabolize differently than inhaled... |
| vendor-day-plan | non_data | craig | good | 78 | yes | Missing specific timeline for when tasks should be completed |
| owner-daily-briefing-no-data | non_data | puff | good | 75 | yes | Could provide more context about why this data is valuable |
| differentiate-thrive | non_data | ezal | good | 80 | yes | No data to ground recommendations in Syracuse-specific market conditions |
| no-verified-competitor-data | non_data | ezal | great | 95 | yes | None significant - this response excels at addressing the core requirement |
| partial-table-analysis | data | money_mike | good | 78 | yes | Did not acknowledge the data is partial/only visible rows |
| multi-turn-sale-to-email | multi_turn | craig | good | 78 | yes | Does not specify how to segment customers (though acknowledges this gap) |
| multi-turn-budtender-brief | multi_turn | smokey | great | 92 | yes | Could benefit from slightly more actionable coaching language on how to implement these p... |
| operator-pairings-no-medical | non_data | smokey | good | 82 | yes | No guidance on how to train staff on these pairings |
| exact-slowest-movers-no-data | non_data | puff | good | 75 | yes | Did not suggest alternative ways to gather data beyond just sharing inventory report |

## Launch blockers
- expiring-inventory-writeoff (POOR 45): Failed to properly analyze expiration timelines and ignored critical inventory data. Issue: Ignored expiration dates in analysis - all items expire in 2026 but are treated as urgent

## Notes
- This runner uses the shared inbox thread-context builder plus inbox persona routing and persona system prompts.
- Briefing-card resilience is covered separately by Jest component tests for partial analytics and check-in payloads.
