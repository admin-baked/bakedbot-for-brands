# Thrive Syracuse Inbox Stress Report

- Generated: 2026-04-18T17:55:57.209Z
- Org: org_thrive_syracuse
- Cases run: 25
- Average score: 79.6
- Response-ready cases: 22/25
- Poor or fail: 3
- Failures: 0

## Summary Table
| Case | Kind | Agent | Grade | Score | Ready | Top issue |
| --- | --- | --- | --- | ---: | --- | --- |
| slow-movers-table | data | money_mike | great | 92 | yes | The total inventory value calculation seems off - the actual sum is $2,884, not $14,405 |
| expiring-inventory-writeoff | data | money_mike | good | 78 | yes | Didn't adequately address the urgency of expiration dates in recommendations |
| top-sellers-restock | data | pops | great | 92 | yes | Slightly high score as could benefit from quantifying the business impact (lost revenue p... |
| category-margin-mix | data | money_mike | good | 78 | yes | Bundle calculation is approximate and not fully precise |
| daily-traffic-gap | data | pops | good | 78 | yes | Promo suggestions are generic and not cannabis-industry specific |
| competitor-price-response | data | ezal | great | 92 | yes | No implementation timeline suggested |
| review-queue-priority | data | mrs_parker | great | 92 | yes | No specific mention of how to quantify 'compensation' for Alina R. |
| checkin-daily-actions | data | mrs_parker | poor | 45 | no | Ignores the 'before noon' urgency requirement |
| campaign-follow-up | data | craig | good | 75 | yes | Did not suggest specific revenue targets for next week |
| customer-segments-winback | data | mrs_parker | great | 92 | yes | Could have provided more specific examples of 'new products/strains they haven't tried' |
| loyalty-enrollment-gap | data | mrs_parker | great | 91 | yes | Could have included more specific ideas for how to analyze Tuesday's performance barriers |
| owner-briefing-summary | data | pops | great | 92 | yes | Minor opportunity to mention the vendor meeting or unread emails as additional context |
| weekend-flash-sale | non_data | money_mike | good | 75 | yes | Lacks specific implementation details like timing, duration, or promotion channels |
| compliant-sms-draft | non_data | craig | good | 82 | yes | Includes unnecessary upsell for paid services |
| one-star-review-reply | non_data | smokey | good | 80 | yes | Lacks specific operational follow-up steps |
| beginner-budtender-talking-points | non_data | smokey | great | 92 | yes | None significant - this is a top-tier response |
| vendor-day-plan | non_data | craig | good | 80 | yes | The plan is very detailed but might be overwhelming without prioritization |
| owner-daily-briefing-no-data | non_data | puff | good | 78 | yes | Lacks concrete next steps for immediate action |
| differentiate-thrive | non_data | ezal | good | 85 | yes | Lacks specific data about nearby competitors mentioned in the stress case |
| no-verified-competitor-data | non_data | ezal | great | 95 | yes | None significant - the response perfectly addresses the scenario |
| partial-table-analysis | data | money_mike | poor | 45 | no | Incorrect margin calculations (retail - cost is not margin calculation) |
| multi-turn-sale-to-email | multi_turn | craig | poor | 45 | no | Failed to reference or use the provided Friday afternoon flash sale focus |
| multi-turn-budtender-brief | multi_turn | smokey | good | 78 | yes | Missing specific terpene percentages mentioned in the initial prompt |
| operator-pairings-no-medical | non_data | smokey | good | 80 | yes | Could provide more detail on customer benefits without medical claims |
| exact-slowest-movers-no-data | non_data | puff | good | 78 | yes | Didn't leverage any available conversation history (though there was none) |

## Launch blockers
- checkin-daily-actions (POOR 45): Response misses key data points and contains compliance issues Issue: Ignores the 'before noon' urgency requirement
- partial-table-analysis (POOR 45): Response fails to use the provided data correctly and makes unsupported margin calculations. Issue: Incorrect margin calculations (retail - cost is not margin calculation)
- multi-turn-sale-to-email (POOR 45): Response shows good compliance but fails to leverage provided data and includes inappropriate upsell pitch. Issue: Failed to reference or use the provided Friday afternoon flash sale focus

## Notes
- This runner uses the shared inbox thread-context builder plus inbox persona routing and persona system prompts.
- Briefing-card resilience is covered separately by Jest component tests for partial analytics and check-in payloads.
