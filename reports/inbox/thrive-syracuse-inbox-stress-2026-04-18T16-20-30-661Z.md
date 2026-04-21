# Thrive Syracuse Inbox Stress Report

- Generated: 2026-04-18T16:20:30.661Z
- Org: org_thrive_syracuse
- Cases run: 25
- Average score: 81.4
- Response-ready cases: 23/25
- Poor or fail: 2
- Failures: 0

## Summary Table
| Case | Kind | Agent | Grade | Score | Ready | Top issue |
| --- | --- | --- | --- | ---: | --- | --- |
| slow-movers-table | data | money_mike | great | 92 | yes | No explicit write-off recommendations despite the question asking for it |
| expiring-inventory-writeoff | data | money_mike | great | 85 | yes | No explicit time frames for when to implement these actions |
| top-sellers-restock | data | pops | great | 92 | yes | The lead time calculation for Matter. Blue Dream shows a 1-day stockout risk, but the tex... |
| category-margin-mix | data | money_mike | good | 78 | yes | No analysis of how the bundle might affect the anchor category (Flower) sales |
| daily-traffic-gap | data | pops | good | 85 | yes | Could provide more specific staff reallocation strategy |
| competitor-price-response | data | ezal | good | 80 | yes | No analysis of potential margin impact or profitability of price matching |
| review-queue-priority | data | mrs_parker | great | 92 | yes | None significant - this response meets all criteria effectively |
| checkin-daily-actions | data | mrs_parker | good | 82 | yes | Lacks specific implementation details for consent rate optimization |
| campaign-follow-up | data | craig | great | 92 | yes | Revenue projections (15-20% click rate increase, 25-30% revenue increase) seem optimistic... |
| customer-segments-winback | data | mrs_parker | great | 92 | yes | No specific mention of compliance considerations for offers |
| loyalty-enrollment-gap | data | mrs_parker | great | 92 | yes | No mention of how to track improvement after implementing fixes |
| owner-briefing-summary | data | pops | great | 92 | yes | No major issues - this is a high-quality response |
| weekend-flash-sale | non_data | money_mike | good | 80 | yes | Asks for margin data without acknowledging it wasn't provided |
| compliant-sms-draft | non_data | craig | poor | 40 | no | Didn't provide a single SMS draft as requested in the prompt |
| one-star-review-reply | non_data | smokey | good | 75 | yes | Lacks concrete steps being taken to address the wait time and notification issues |
| beginner-budtender-talking-points | non_data | smokey | great | 95 | yes | No specific examples of products to reference |
| vendor-day-plan | non_data | craig | good | 78 | yes | No specific timeline or priority breakdown for the week's preparations |
| owner-daily-briefing-no-data | non_data | puff | acceptable | 70 | yes | Could have provided more generic insights without data |
| differentiate-thrive | non_data | ezal | great | 92 | yes | Slightly overconfident tone about competitors' capabilities |
| no-verified-competitor-data | non_data | ezal | great | 95 | yes | Could potentially emphasize the importance of regular competitor monitoring |
| partial-table-analysis | data | money_mike | good | 78 | yes | Failed to properly identify what data is still needed for complete analysis |
| multi-turn-sale-to-email | multi_turn | craig | poor | 45 | no | Completely ignores the 20% discount limit mentioned in previous turn |
| multi-turn-budtender-brief | multi_turn | smokey | great | 92 | yes | Could benefit from specific product examples beyond strain names |
| operator-pairings-no-medical | non_data | smokey | good | 80 | yes | Doesn't reference the user's specific evening gummy product |
| exact-slowest-movers-no-data | non_data | puff | acceptable | 60 | yes | No actionable next steps beyond collecting data |

## Launch blockers
- compliant-sms-draft (POOR 40): The response provides multiple SMS options but fails to select one as requested. Issue: Didn't provide a single SMS draft as requested in the prompt
- multi-turn-sale-to-email (POOR 45): Response ignores key business data and lacks actionable operational details. Issue: Completely ignores the 20% discount limit mentioned in previous turn

## Notes
- This runner uses the shared inbox thread-context builder plus inbox persona routing and persona system prompts.
- Briefing-card resilience is covered separately by Jest component tests for partial analytics and check-in payloads.
