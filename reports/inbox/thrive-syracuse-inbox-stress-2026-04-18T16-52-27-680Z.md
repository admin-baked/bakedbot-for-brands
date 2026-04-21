# Thrive Syracuse Inbox Stress Report

- Generated: 2026-04-18T16:52:27.680Z
- Org: org_thrive_syracuse
- Cases run: 25
- Average score: 78.9
- Response-ready cases: 24/25
- Poor or fail: 1
- Failures: 1

## Summary Table
| Case | Kind | Agent | Grade | Score | Ready | Top issue |
| --- | --- | --- | --- | ---: | --- | --- |
| slow-movers-table | data | money_mike | great | 92 | yes | No specific timeline for implementing the action plan |
| expiring-inventory-writeoff | data | money_mike | good | 80 | yes | Did not specify timeline for implementing these actions |
| top-sellers-restock | data | pops | great | 92 | yes | Minor inconsistency in sales velocity calculations (different decimal places) |
| category-margin-mix | data | money_mike | good | 75 | yes | Could provide more specific pricing guidance for the bundle |
| daily-traffic-gap | data | pops | good | 82 | yes | Could have provided more detail on how to implement the staffing change |
| competitor-price-response | data | ezal | good | 80 | yes | No consideration for potential margin impact on price matching |
| review-queue-priority | data | mrs_parker | great | 90 | yes | No mention of specific metrics or timeframes for implementing process improvements |
| checkin-daily-actions | data | mrs_parker | good | 82 | yes | Action #2 about email consent prompt at checkout may not be feasible for same-day impleme... |
| campaign-follow-up | data | craig | good | 75 | yes | Contains unsupported assertions about cannabis effects |
| customer-segments-winback | data | mrs_parker | good | 82 | yes | Could provide more specific justification for why At-risk should be prioritized over Casu... |
| loyalty-enrollment-gap | data | mrs_parker | good | 82 | yes | Could better analyze staffing patterns in relation to capture rates |
| owner-briefing-summary | data | pops | great | 90 | yes | Minor opportunity to expand slightly on the margin analysis recommendation |
| weekend-flash-sale | non_data | money_mike | good | 78 | yes | Lacks specific details about how to select which products go in which bundles |
| compliant-sms-draft | non_data | craig | good | 75 | yes | Includes self-promotional upsell for paid services |
| one-star-review-reply | non_data | smokey | good | 78 | yes | Lacks specificity about what changes are being implemented to fix wait times |
| beginner-budtender-talking-points | non_data | smokey | great | 85 | yes | Terpene profile details are overly specific and potentially unsupported |
| vendor-day-plan | non_data | craig | good | 78 | yes | Lacks specific timeline for 'this week' preparations |
| owner-daily-briefing-no-data | non_data | puff | acceptable | 65 | yes | Failed to provide any actual briefing content despite request |
| differentiate-thrive | non_data | ezal | good | 78 | yes | Lacks specific data about nearby competitors |
| no-verified-competitor-data | non_data | ezal | great | 95 | yes | Could potentially suggest automated competitor monitoring tools if the dispensary uses th... |
| partial-table-analysis | data | money_mike | good | 78 | yes | Didn't acknowledge that only partial data was visible |
| multi-turn-sale-to-email | multi_turn | craig | good | 78 | yes | Failed to use the previous conversation context (Friday afternoon focus) |
| multi-turn-budtender-brief | multi_turn | smokey | great | 92 | yes | Could benefit from specific strain name examples |
| operator-pairings-no-medical | non_data | smokey | great | 90 | yes | No specific terpene data from the user's actual gummies was referenced |
| exact-slowest-movers-no-data | non_data | puff | fail | 0 | no | Crashed by requesting data explicitly marked as 'no data' in the prompt |

## Launch blockers
- exact-slowest-movers-no-data (FAIL 0): Response crashes by requesting data that was explicitly not provided. Issue: Crashed by requesting data explicitly marked as 'no data' in the prompt

## Notes
- This runner uses the shared inbox thread-context builder plus inbox persona routing and persona system prompts.
- Briefing-card resilience is covered separately by Jest component tests for partial analytics and check-in payloads.
