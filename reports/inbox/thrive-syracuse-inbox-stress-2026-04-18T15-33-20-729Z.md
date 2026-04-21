# Thrive Syracuse Inbox Stress Report

- Generated: 2026-04-18T15:33:20.729Z
- Org: org_thrive_syracuse
- Cases run: 25
- Average score: 81.9
- Response-ready cases: 23/25
- Poor or fail: 2
- Failures: 0

## Summary Table
| Case | Kind | Agent | Grade | Score | Ready | Top issue |
| --- | --- | --- | --- | ---: | --- | --- |
| slow-movers-table | data | money_mike | good | 78 | yes | Minor calculation errors (e.g., Ayrloom Blackberry margin calculation is incorrect) |
| expiring-inventory-writeoff | data | money_mike | great | 88 | yes | No consideration for potential regulatory constraints on bundling different product categ... |
| top-sellers-restock | data | pops | great | 95 | yes | Minor formatting inconsistency with the 'ON TRACK' section (lacks bold formatting like ot... |
| category-margin-mix | data | money_mike | good | 75 | yes | No concrete steps for implementation (how to create the bundle, how to promote it) |
| daily-traffic-gap | data | pops | great | 92 | yes | Could benefit from more specific details on implementation timing or expected impact metr... |
| competitor-price-response | data | ezal | great | 90 | yes | Price recommendations ($33, $40, $17) seem arbitrary without supporting data on price ela... |
| review-queue-priority | data | mrs_parker | great | 92 | yes | Could have better explained the rationale for why Alina's 4-day 2-star ranked higher than... |
| checkin-daily-actions | data | mrs_parker | great | 90 | yes | Could provide slightly more specific implementation details for each action |
| campaign-follow-up | data | craig | good | 80 | yes | Didn't address list fatigue concerns beyond just mentioning SMS frequency |
| customer-segments-winback | data | mrs_parker | great | 92 | yes | No specific timing recommendations for the win-back campaign |
| loyalty-enrollment-gap | data | mrs_parker | good | 78 | yes | Failed to calculate and discuss the overall 15.9% capture rate against industry benchmarks |
| owner-briefing-summary | data | pops | good | 83 | yes | Could be more specific about what actions to take regarding the Day-3 review sequence |
| weekend-flash-sale | non_data | money_mike | poor | 35 | no | Used food examples (quinoa, honey, almond flour, olive oil) instead of cannabis products |
| compliant-sms-draft | non_data | craig | good | 75 | yes | Includes upsell pitch for paid services which breaks immersion |
| one-star-review-reply | non_data | smokey | good | 82 | yes | Could be more specific about what improvements are being made to the order system |
| beginner-budtender-talking-points | non_data | smokey | great | 95 | yes | No major issues - the response is very solid |
| vendor-day-plan | non_data | craig | poor | 45 | no | Ignores the core question about inbox preparation for teams |
| owner-daily-briefing-no-data | non_data | puff | good | 80 | yes | Lacks specific context for a dispensary operation (could be more cannabis-retail specific) |
| differentiate-thrive | non_data | ezal | great | 92 | yes | Could provide more specific implementation timelines or priorities |
| no-verified-competitor-data | non_data | ezal | great | 92 | yes | Could potentially suggest more specific competitive intelligence gathering techniques |
| partial-table-analysis | data | money_mike | great | 92 | yes | Could provide more specific margin calculations for suggested promotions |
| multi-turn-sale-to-email | multi_turn | craig | good | 82 | yes | No explicit mention of multi-turn context carryover |
| multi-turn-budtender-brief | multi_turn | smokey | great | 95 | yes | Could benefit from slightly more specific guidance on how to identify terpene profiles in... |
| operator-pairings-no-medical | non_data | smokey | good | 85 | yes | No information on which pairing might be most popular or why |
| exact-slowest-movers-no-data | non_data | puff | acceptable | 65 | yes | Doesn't acknowledge the prompt clue about having no data |

## Launch blockers
- weekend-flash-sale (POOR 35): The response suggests a bundle strategy but uses hypothetical food items instead of cannabis products, showing poor grounding for a dispensary context. Issue: Used food examples (quinoa, honey, almond flour, olive oil) instead of cannabis products
- vendor-day-plan (POOR 45): Response focuses on marketing but lacks operational readiness details. Issue: Ignores the core question about inbox preparation for teams

## Notes
- This runner uses the shared inbox thread-context builder plus inbox persona routing and persona system prompts.
- Briefing-card resilience is covered separately by Jest component tests for partial analytics and check-in payloads.
