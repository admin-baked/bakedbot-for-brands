# Thrive Syracuse Inbox Stress Report

- Generated: 2026-04-18T17:14:14.804Z
- Org: org_thrive_syracuse
- Cases run: 25
- Average score: 85.0
- Response-ready cases: 25/25
- Poor or fail: 0
- Failures: 0

## Summary Table
| Case | Kind | Agent | Grade | Score | Ready | Top issue |
| --- | --- | --- | --- | ---: | --- | --- |
| slow-movers-table | data | money_mike | good | 80 | yes | Missing specific numeric values for discount calculations |
| expiring-inventory-writeoff | data | money_mike | good | 80 | yes | Conflicting assessment of MFNY Rainbow Beltz (listed as both bundle and write-off risk) |
| top-sellers-restock | data | pops | great | 92 | yes | Could have suggested specific reorder quantities to optimize inventory |
| category-margin-mix | data | money_mike | good | 85 | yes | Doesn't explicitly quantify the expected margin impact of the bundle |
| daily-traffic-gap | data | pops | great | 95 | yes | Minor improvement: Could suggest specific types of high-margin items more tailored to can... |
| competitor-price-response | data | ezal | great | 92 | yes | No mention of implementation timeline for price changes |
| review-queue-priority | data | mrs_parker | great | 94 | yes | Could suggest more specific metrics for follow-up (e.g., response time targets) |
| checkin-daily-actions | data | mrs_parker | great | 92 | yes | Could potentially add slightly more detail on how to craft the SMS/email opt-in messages |
| campaign-follow-up | data | craig | great | 92 | yes | Email performance improvement goals might be optimistic given current low click rates |
| customer-segments-winback | data | mrs_parker | good | 78 | yes | Could better quantify the potential impact of targeting each segment |
| loyalty-enrollment-gap | data | mrs_parker | good | 83 | yes | Could provide more specific details on what Tuesday-specific incentive to implement |
| owner-briefing-summary | data | pops | great | 95 | yes | None identified - response meets all requirements |
| weekend-flash-sale | non_data | money_mike | good | 80 | yes | Doesn't provide specific implementation steps or timeline |
| compliant-sms-draft | non_data | craig | acceptable | 70 | yes | Very brief response with limited value (doesn't explain why it's compliant or what makes ... |
| one-star-review-reply | non_data | smokey | good | 75 | yes | Lacks concrete next steps to address the systemic issues mentioned |
| beginner-budtender-talking-points | non_data | smokey | good | 82 | yes | Minor compliance concern with terpene profile descriptions that could imply specific effe... |
| vendor-day-plan | non_data | craig | good | 82 | yes | Includes marketing pitch at the end asking for paid services |
| owner-daily-briefing-no-data | non_data | puff | good | 75 | yes | No actual briefing data provided (expected for stress case) |
| differentiate-thrive | non_data | ezal | good | 85 | yes | Lacks specific analysis of Syracuse market or known local competitors |
| no-verified-competitor-data | non_data | ezal | great | 92 | yes | None significant - response is excellent for this scenario |
| partial-table-analysis | data | money_mike | good | 82 | yes | Didn't explicitly mention the days on hand concern for the other two items |
| multi-turn-sale-to-email | multi_turn | craig | good | 82 | yes | No personalization beyond [Customer Name] |
| multi-turn-budtender-brief | multi_turn | smokey | great | 95 | yes | No explicit mention of carrying forward context from previous messages, though the conten... |
| operator-pairings-no-medical | non_data | smokey | great | 92 | yes | Match confidence percentages lack clear methodology |
| exact-slowest-movers-no-data | non_data | puff | good | 75 | yes | No specific immediate next steps provided |

## Launch blockers
- None

## Notes
- This runner uses the shared inbox thread-context builder plus inbox persona routing and persona system prompts.
- Briefing-card resilience is covered separately by Jest component tests for partial analytics and check-in payloads.
