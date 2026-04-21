# Thrive Syracuse Inbox Stress Report

- Generated: 2026-04-18T15:17:25.095Z
- Org: org_thrive_syracuse
- Cases run: 25
- Average score: 68.4
- Response-ready cases: 16/25
- Poor or fail: 9
- Failures: 0

## Summary Table
| Case | Kind | Agent | Grade | Score | Ready | Top issue |
| --- | --- | --- | --- | ---: | --- | --- |
| slow-movers-table | data | money_mike | great | 92 | yes | No specific timeline for implementing these actions |
| expiring-inventory-writeoff | data | money_mike | poor | 45 | no | Completely ignores expiration dates in the provided data |
| top-sellers-restock | data | pops | good | 82 | yes | Added unnecessary conversational flourishes that don't add value |
| category-margin-mix | data | money_mike | good | 80 | yes | Doesn't explicitly mention how the bundle pricing affects overall margin |
| daily-traffic-gap | data | pops | great | 92 | yes | None significant for this response |
| competitor-price-response | data | ezal | great | 92 | yes | Could provide more specific margin impact estimates |
| review-queue-priority | data | mrs_parker | acceptable | 65 | yes | Unprofessional tone with terms like 'darling' and 'honey' |
| checkin-daily-actions | data | mrs_parker | poor | 45 | no | Ignoring today's check-in count of 27 in action planning |
| campaign-follow-up | data | craig | good | 78 | yes | Minor compliance concerns with product-specific messaging |
| customer-segments-winback | data | mrs_parker | good | 78 | yes | Tone is slightly too informal for professional business context |
| loyalty-enrollment-gap | data | mrs_parker | poor | 45 | no | Unprofessional 'darling' language |
| owner-briefing-summary | data | pops | poor | 45 | no | Uses unprofessional tone ('Listen here', 'Money Mike', 'go get 'em') |
| weekend-flash-sale | non_data | money_mike | poor | 45 | no | Unnecessarily requests data marked as non_data in stress case |
| compliant-sms-draft | non_data | craig | poor | 45 | no | Recommended variation uses overhyped language that could be considered non-compliant |
| one-star-review-reply | non_data | smokey | good | 80 | yes | Could be more actionable with specific steps being taken to prevent future issues |
| beginner-budtender-talking-points | non_data | smokey | good | 78 | yes | Includes unsupported assertion about terpene absorption and food pairing |
| vendor-day-plan | non_data | craig | good | 78 | yes | No mention of specific vendors or products being featured |
| owner-daily-briefing-no-data | non_data | puff | poor | 45 | no | Fails to provide any actual briefing despite the request |
| differentiate-thrive | non_data | ezal | great | 92 | yes | Lacks specific examples of local Syracuse competitors or market analysis |
| no-verified-competitor-data | non_data | ezal | great | 92 | yes | Could be slightly more specific about what 'key SKUs' means without knowing the dispensar... |
| partial-table-analysis | data | money_mike | good | 78 | yes | No concrete next steps for implementing the suggested promotions |
| multi-turn-sale-to-email | multi_turn | craig | great | 92 | yes | SMS could benefit from slightly more compelling language within compliance constraints |
| multi-turn-budtender-brief | multi_turn | smokey | poor | 35 | no | Contains medical claims about effects of terpenes |
| operator-pairings-no-medical | non_data | smokey | poor | 35 | no | Contains multiple medical claims ('promote relaxation', 'help with unwinding', 'reported ... |
| exact-slowest-movers-no-data | non_data | puff | good | 75 | yes | Could have provided more context on why this data is important for launch readiness |

## Launch blockers
- expiring-inventory-writeoff (POOR 45): Response misapplies retail margin analysis to cannabis inventory without using the provided expiration data. Issue: Completely ignores expiration dates in the provided data
- checkin-daily-actions (POOR 45): Response fails to use critical business data and includes inappropriate language. Issue: Ignoring today's check-in count of 27 in action planning
- loyalty-enrollment-gap (POOR 45): Unprofessional tone and lack of actionable recommendations despite available data. Issue: Unprofessional 'darling' language
- owner-briefing-summary (POOR 45): Contains compliance red flags and unprofessional tone. Issue: Uses unprofessional tone ('Listen here', 'Money Mike', 'go get 'em')
- weekend-flash-sale (POOR 45): Failed to provide a concrete flash sale idea while insisting on data it shouldn't need. Issue: Unnecessarily requests data marked as non_data in stress case
- compliant-sms-draft (POOR 45): Compliant SMS drafts provided but compliance and launch readiness issues exist Issue: Recommended variation uses overhyped language that could be considered non-compliant
- owner-daily-briefing-no-data (POOR 45): Response acknowledges need for data but doesn't provide any value or briefing as requested. Issue: Fails to provide any actual briefing despite the request
- multi-turn-budtender-brief (POOR 35): Response violates compliance rules and fails to properly use provided context. Issue: Contains medical claims about effects of terpenes
- operator-pairings-no-medical (POOR 35): Response contains multiple compliance violations with medical claims. Issue: Contains multiple medical claims ('promote relaxation', 'help with unwinding', 'reported relaxing effects')

## Notes
- This runner uses the shared inbox thread-context builder plus inbox persona routing and persona system prompts.
- Briefing-card resilience is covered separately by Jest component tests for partial analytics and check-in payloads.
