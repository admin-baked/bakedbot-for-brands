# Thrive Syracuse Inbox Stress Report

- Generated: 2026-04-18T16:47:09.440Z
- Org: org_thrive_syracuse
- Cases run: 25
- Average score: 78.4
- Response-ready cases: 21/25
- Poor or fail: 4
- Failures: 1

## Summary Table
| Case | Kind | Agent | Grade | Score | Ready | Top issue |
| --- | --- | --- | --- | ---: | --- | --- |
| slow-movers-table | data | money_mike | great | 92 | yes | Could include more expiration date considerations in ranking |
| expiring-inventory-writeoff | data | money_mike | great | 90 | yes | Could provide more specific guidance on bundle composition |
| top-sellers-restock | data | pops | great | 95 | yes | No specific recommendations for expediting or alternative sourcing |
| category-margin-mix | data | money_mike | good | 82 | yes | Bundle discount (27.6%) seems quite aggressive for a cannabis bundle |
| daily-traffic-gap | data | pops | great | 92 | yes | Could have provided more specific details about implementation timeline for the promo move |
| competitor-price-response | data | ezal | great | 92 | yes | Could benefit from margin analysis to show profit impact of recommendations |
| review-queue-priority | data | mrs_parker | great | 92 | yes | Could have included specific timing recommendations for responses |
| checkin-daily-actions | data | mrs_parker | good | 82 | yes | Could provide more specific implementation details for each action |
| campaign-follow-up | data | craig | poor | 45 | no | Failed to use the provided revenue numbers or calculate actual ROI |
| customer-segments-winback | data | mrs_parker | great | 92 | yes | Could provide more specific timeline or metrics for measuring campaign success |
| loyalty-enrollment-gap | data | mrs_parker | great | 92 | yes | No specific timeline for implementing changes |
| owner-briefing-summary | data | pops | great | 92 | yes | Minor opportunity: could briefly mention the vendor meeting and emails as time-sensitive ... |
| weekend-flash-sale | non_data | money_mike | poor | 42 | no | Uses prohibited medical terminology ('wellness products', 'wellness bundle') |
| compliant-sms-draft | non_data | craig | fail | 30 | no | Included non-compliant language ('Let's smoke!' in Hype Variation) |
| one-star-review-reply | non_data | smokey | good | 85 | yes | Could be more specific about what caused the missing online order update |
| beginner-budtender-talking-points | non_data | smokey | great | 90 | yes | Could include more details about specific product types or strains |
| vendor-day-plan | non_data | craig | poor | 35 | no | Failed to provide specific actionable tasks for the inbox team |
| owner-daily-briefing-no-data | non_data | puff | acceptable | 65 | yes | No value added without data |
| differentiate-thrive | non_data | ezal | good | 80 | yes | Lacks specific data about nearby competitors to tailor recommendations |
| no-verified-competitor-data | non_data | ezal | great | 95 | yes | Could potentially be more specific about how to obtain competitor pricing legally and eth... |
| partial-table-analysis | data | money_mike | good | 75 | yes | Doesn't acknowledge the partial nature of the data upfront |
| multi-turn-sale-to-email | multi_turn | craig | good | 78 | yes | No personalization based on customer purchase history |
| multi-turn-budtender-brief | multi_turn | smokey | great | 92 | yes | None significant - this response hits all the requirements effectively |
| operator-pairings-no-medical | non_data | smokey | good | 78 | yes | No specific next steps for implementing these pairings |
| exact-slowest-movers-no-data | non_data | puff | good | 78 | yes | Could be more specific about what data is needed |

## Launch blockers
- campaign-follow-up (POOR 45): The response ignores critical data and contains compliance issues. Issue: Failed to use the provided revenue numbers or calculate actual ROI
- weekend-flash-sale (POOR 42): Response ignores the explicit non_data nature of the case and includes inappropriate medical terminology. Issue: Uses prohibited medical terminology ('wellness products', 'wellness bundle')
- compliant-sms-draft (FAIL 30): Response contains compliance issues and doesn't provide a single compliant SMS as requested Issue: Included non-compliant language ('Let's smoke!' in Hype Variation)
- vendor-day-plan (POOR 35): Response provides generic marketing framework without specific vendor day preparation details. Issue: Failed to provide specific actionable tasks for the inbox team

## Notes
- This runner uses the shared inbox thread-context builder plus inbox persona routing and persona system prompts.
- Briefing-card resilience is covered separately by Jest component tests for partial analytics and check-in payloads.
