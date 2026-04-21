# Thrive Syracuse Inbox Stress Report

- Generated: 2026-04-18T17:31:15.400Z
- Org: org_thrive_syracuse
- Cases run: 25
- Average score: 81.4
- Response-ready cases: 23/25
- Poor or fail: 2
- Failures: 0

## Summary Table
| Case | Kind | Agent | Grade | Score | Ready | Top issue |
| --- | --- | --- | --- | ---: | --- | --- |
| slow-movers-table | data | money_mike | great | 92 | yes | No explicit mention of expiration dates in the ranking criteria |
| expiring-inventory-writeoff | data | money_mike | poor | 45 | no | Misinterpreted expiration dates (all items expire in 2026, not near-term) |
| top-sellers-restock | data | pops | great | 92 | yes | Minor calculation discrepancy for Matter. Blue Dream (4.3 days inventory vs 0.7 gap, when... |
| category-margin-mix | data | money_mike | good | 78 | yes | Did not directly address why other categories with higher margins (like Edibles at 58%) w... |
| daily-traffic-gap | data | pops | great | 92 | yes | Could benefit from slightly more detailed explanation of how to track bundle adoption |
| competitor-price-response | data | ezal | great | 92 | yes | No specific timing for the flash promotion mentioned |
| review-queue-priority | data | mrs_parker | great | 92 | yes | No specific mention of how to implement the quality control measures mentioned |
| checkin-daily-actions | data | mrs_parker | good | 80 | yes | Lacks specific, actionable implementation details for each recommended action |
| campaign-follow-up | data | craig | good | 78 | yes | Didn't explicitly address list fatigue concern beyond mentioning SMS targeting |
| customer-segments-winback | data | mrs_parker | great | 92 | yes | Could provide more specifics on timing or channel strategy |
| loyalty-enrollment-gap | data | mrs_parker | good | 78 | yes | Could provide more specific details about what makes Saturdays successful |
| owner-briefing-summary | data | pops | great | 95 | yes | Minor opportunity to expand on suggested actions for each point |
| weekend-flash-sale | non_data | money_mike | good | 75 | yes | Lacks specific implementation details (how to select complementary items, how to display,... |
| compliant-sms-draft | non_data | craig | good | 78 | yes | Included upsell for premium services (Hire me) which may not be appropriate |
| one-star-review-reply | non_data | smokey | good | 82 | yes | No concrete offer of compensation or incentive for return visit |
| beginner-budtender-talking-points | non_data | smokey | great | 92 | yes | Could slightly emphasize product variability more |
| vendor-day-plan | non_data | craig | acceptable | 72 | yes | No specific timeline for when tasks should be completed this week |
| owner-daily-briefing-no-data | non_data | puff | good | 75 | yes | Generic template lacks any specific insight for Thrive Syracuse specifically |
| differentiate-thrive | non_data | ezal | poor | 42 | no | Ignores the non_data prompt and asks for competition data that wasn't provided |
| no-verified-competitor-data | non_data | ezal | great | 90 | yes | Minor typo in 'Vige' instead of 'Vibe' in step 3 |
| partial-table-analysis | data | money_mike | good | 78 | yes | Failed to mention whether any of these products are approaching expiration dates |
| multi-turn-sale-to-email | multi_turn | craig | good | 82 | yes | Lacks specifics about how to carry forward customer context in implementation |
| multi-turn-budtender-brief | multi_turn | smokey | great | 95 | yes | No explicit mention of coaching staff to avoid medical language (though implied) |
| operator-pairings-no-medical | non_data | smokey | great | 92 | yes | Could provide slightly more detail on specific inventory considerations |
| exact-slowest-movers-no-data | non_data | puff | good | 75 | yes | Doesn't acknowledge that this was a stress case with no data provided |

## Launch blockers
- expiring-inventory-writeoff (POOR 45): Analysis ignores inventory data and contains unnecessary promotional content. Issue: Misinterpreted expiration dates (all items expire in 2026, not near-term)
- differentiate-thrive (POOR 42): Response asks for data that wasn't provided and fails to give actionable differentiation strategies. Issue: Ignores the non_data prompt and asks for competition data that wasn't provided

## Notes
- This runner uses the shared inbox thread-context builder plus inbox persona routing and persona system prompts.
- Briefing-card resilience is covered separately by Jest component tests for partial analytics and check-in payloads.
