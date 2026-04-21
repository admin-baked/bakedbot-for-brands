# Thrive Syracuse Inbox Stress Report

- Generated: 2026-04-18T16:43:05.656Z
- Org: org_thrive_syracuse
- Cases run: 25
- Average score: 80.1
- Response-ready cases: 23/25
- Poor or fail: 2
- Failures: 0

## Summary Table
| Case | Kind | Agent | Grade | Score | Ready | Top issue |
| --- | --- | --- | --- | ---: | --- | --- |
| slow-movers-table | data | money_mike | good | 78 | yes | No specific discount percentages or timing details for promotions |
| expiring-inventory-writeoff | data | money_mike | good | 78 | yes | Failed to provide a definitive write-off assessment despite having expiration data |
| top-sellers-restock | data | pops | great | 92 | yes | Minor typo in vendor name ('Nanticooke' instead of 'Nanticoke') |
| category-margin-mix | data | money_mike | great | 92 | yes | Could provide more specific guidance on how much to discount the bundle |
| daily-traffic-gap | data | pops | great | 92 | yes | Could have been slightly more specific about which products to promote |
| competitor-price-response | data | ezal | great | 92 | yes | The 'medium-high' threat assessment could benefit from more specific metrics or reasoning |
| review-queue-priority | data | mrs_parker | great | 95 | yes | No specific timeline suggested for implementing the response strategy |
| checkin-daily-actions | data | mrs_parker | good | 80 | yes | Could provide more specific implementation details for each action |
| campaign-follow-up | data | craig | poor | 45 | no | Failed to use the provided numeric business data in calculations |
| customer-segments-winback | data | mrs_parker | good | 82 | yes | The recommendation focuses on the highest-risk segment but doesn't acknowledge potential ... |
| loyalty-enrollment-gap | data | mrs_parker | good | 78 | yes | No specific metrics or targets for next week |
| owner-briefing-summary | data | pops | great | 92 | yes | Very minor: Could briefly mention the 3 unread emails or vendor meeting as time considera... |
| weekend-flash-sale | non_data | money_mike | acceptable | 65 | yes | Lacks concrete examples of what specific items could be bundled |
| compliant-sms-draft | non_data | craig | great | 90 | yes | Only provided one variation when multiple options could increase testing value |
| one-star-review-reply | non_data | smokey | good | 80 | yes | Could be more specific about what will be done to improve wait times |
| beginner-budtender-talking-points | non_data | smokey | great | 90 | yes | Could potentially add more detail about product selection process |
| vendor-day-plan | non_data | craig | poor | 30 | no | Completely misses the question about inbox preparation |
| owner-daily-briefing-no-data | non_data | puff | good | 75 | yes | Could have provided more operational context for a launch scenario |
| differentiate-thrive | non_data | ezal | good | 82 | yes | Lacks specific competitor information despite request for nearby dispensary differentiati... |
| no-verified-competitor-data | non_data | ezal | great | 90 | yes | None significant - response is well-structured and responsible |
| partial-table-analysis | data | money_mike | good | 78 | yes | Claims about margins without showing calculations (compliance concern) |
| multi-turn-sale-to-email | multi_turn | craig | good | 78 | yes | Includes unsolicited marketing pitch for paid services (compliance violation) |
| multi-turn-budtender-brief | multi_turn | smokey | great | 92 | yes | The fifth point could be slightly more concise |
| operator-pairings-no-medical | non_data | smokey | great | 92 | yes | Could benefit from more variety in product types beyond Purple Punch |
| exact-slowest-movers-no-data | non_data | puff | acceptable | 65 | yes | Doesn't provide any actionable steps without data |

## Launch blockers
- campaign-follow-up (POOR 45): Response ignores the business data provided and fails to address list fatigue concerns. Issue: Failed to use the provided numeric business data in calculations
- vendor-day-plan (POOR 30): Response ignores the inbox preparation focus and includes marketing without using provided data. Issue: Completely misses the question about inbox preparation

## Notes
- This runner uses the shared inbox thread-context builder plus inbox persona routing and persona system prompts.
- Briefing-card resilience is covered separately by Jest component tests for partial analytics and check-in payloads.
