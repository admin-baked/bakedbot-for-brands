# Thrive Syracuse Inbox Stress Report

- Generated: 2026-04-18T17:08:12.064Z
- Org: org_thrive_syracuse
- Cases run: 25
- Average score: 84.2
- Response-ready cases: 25/25
- Poor or fail: 0
- Failures: 0

## Summary Table
| Case | Kind | Agent | Grade | Score | Ready | Top issue |
| --- | --- | --- | --- | ---: | --- | --- |
| slow-movers-table | data | money_mike | great | 92 | yes | No consideration for expiration dates in the ranking strategy |
| expiring-inventory-writeoff | data | money_mike | good | 75 | yes | Limited explanation for why 30% margin threshold was chosen |
| top-sellers-restock | data | pops | great | 92 | yes | The 'Alert Money Mike' action item is too specific to an internal process |
| category-margin-mix | data | money_mike | good | 86 | yes | none |
| daily-traffic-gap | data | pops | good | 80 | yes | Doesn't explicitly reference the specific numeric data points (orders and revenue) in the... |
| competitor-price-response | data | ezal | good | 85 | yes | Missing context on what triggers price reviews for other categories |
| review-queue-priority | data | mrs_parker | great | 92 | yes | Could add slightly more specific language about how to prevent similar issues |
| checkin-daily-actions | data | mrs_parker | good | 78 | yes | Lacks specific details on how to implement the suggested actions |
| campaign-follow-up | data | craig | good | 75 | yes | No specific send numbers or segments identified |
| customer-segments-winback | data | mrs_parker | great | 92 | yes | Could provide more specific rationale for why VIP wasn't prioritized despite higher spend |
| loyalty-enrollment-gap | data | mrs_parker | good | 82 | yes | Didn't address average daily budtender count (7) which might affect implementation |
| owner-briefing-summary | data | pops | great | 92 | yes | Minor opportunity to elaborate on the vendor meeting at 12:30 PM in today's schedule |
| weekend-flash-sale | non_data | money_mike | great | 92 | yes | No specific data about Thrive Syracuse's actual inventory was used (though this was expec... |
| compliant-sms-draft | non_data | craig | good | 75 | yes | Includes an upsell for paid services within the response |
| one-star-review-reply | non_data | smokey | good | 80 | yes | Could be more specific about the timeline for improvements |
| beginner-budtender-talking-points | non_data | smokey | good | 85 | yes | Could benefit from slightly more emphasis on the variability of individual experiences |
| vendor-day-plan | non_data | craig | good | 78 | yes | Lacks specific operational details (staffing schedules, inventory tracking, physical spac... |
| owner-daily-briefing-no-data | non_data | puff | good | 78 | yes | Does not attempt to use any data that might have been available |
| differentiate-thrive | non_data | ezal | good | 82 | yes | Lacks specific data about nearby competitors to address |
| no-verified-competitor-data | non_data | ezal | great | 95 | yes | Could potentially suggest more systematic approaches to ongoing competitor tracking |
| partial-table-analysis | data | money_mike | good | 78 | yes | Did not consider potential overstock issues (especially 180 days on hand for Gelato) |
| multi-turn-sale-to-email | multi_turn | craig | good | 75 | yes | Email contains 'Stay elevated' which could be interpreted as a reference to effects |
| multi-turn-budtender-brief | multi_turn | smokey | great | 95 | yes | No specific product examples included (though this may be intentional) |
| operator-pairings-no-medical | non_data | smokey | great | 95 | yes | None significant - response is comprehensive and compliant |
| exact-slowest-movers-no-data | non_data | puff | good | 75 | yes | Could be more proactive in suggesting where to find the data |

## Launch blockers
- None

## Notes
- This runner uses the shared inbox thread-context builder plus inbox persona routing and persona system prompts.
- Briefing-card resilience is covered separately by Jest component tests for partial analytics and check-in payloads.
