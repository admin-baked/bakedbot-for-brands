# Thrive Syracuse Inbox Stress Report

- Generated: 2026-04-18T15:46:55.356Z
- Org: org_thrive_syracuse
- Cases run: 25
- Average score: 79.6
- Response-ready cases: 23/25
- Poor or fail: 2
- Failures: 0

## Summary Table
| Case | Kind | Agent | Grade | Score | Ready | Top issue |
| --- | --- | --- | --- | ---: | --- | --- |
| slow-movers-table | data | money_mike | great | 95 | yes | Very minor formatting inconsistency in margin analysis section |
| expiring-inventory-writeoff | data | money_mike | good | 82 | yes | No specific timeline for the 30-day re-evaluation of the tincture |
| top-sellers-restock | data | pops | great | 92 | yes | Minor typo 'SKIs' instead of 'SKUs' in the operational recommendation |
| category-margin-mix | data | money_mike | good | 78 | yes | Could have compared multiple anchor options more explicitly |
| daily-traffic-gap | data | pops | great | 95 | yes | Minor opportunity to suggest how to communicate the shift change to staff |
| competitor-price-response | data | ezal | great | 92 | yes | No consideration of margin impact of price matching |
| review-queue-priority | data | mrs_parker | great | 92 | yes | Could have included more specific timing recommendations for responses |
| checkin-daily-actions | data | mrs_parker | good | 80 | yes | Doesn't explicitly mention the review sequence rate/percentage |
| campaign-follow-up | data | craig | good | 78 | yes | Specific send numbers lack justification based on current performance data |
| customer-segments-winback | data | mrs_parker | good | 78 | yes | Could provide more specific justification for choosing At-risk over other segments |
| loyalty-enrollment-gap | data | mrs_parker | good | 80 | yes | Doesn't explore potential reasons for the Tuesday drop-off |
| owner-briefing-summary | data | pops | great | 92 | yes | None significant - response is concise but could potentially include more detail on the D... |
| weekend-flash-sale | non_data | money_mike | poor | 45 | no | Invents specific inventory data (costs, item names) when prompt explicitly states no sour... |
| compliant-sms-draft | non_data | craig | good | 75 | yes | No specific product details (strains, prices, discounts) included |
| one-star-review-reply | non_data | smokey | good | 82 | yes | Vague about operational changes (no specific timelines or actions) |
| beginner-budtender-talking-points | non_data | smokey | good | 80 | yes | Lacks specific product recommendations |
| vendor-day-plan | non_data | craig | good | 78 | yes | No specific mention of inventory management for vendor products |
| owner-daily-briefing-no-data | non_data | puff | poor | 45 | no | Completely ignored the provided business data in the prompt |
| differentiate-thrive | non_data | ezal | acceptable | 83 | yes | The response missed one or more of the main requested angles. |
| no-verified-competitor-data | non_data | ezal | good | 85 | yes | Could be more structured in the response format |
| partial-table-analysis | data | money_mike | good | 78 | yes | Could have provided more specific implementation details for the bundle deal |
| multi-turn-sale-to-email | multi_turn | craig | good | 78 | yes | Lacks implementation details like send time recommendations |
| multi-turn-budtender-brief | multi_turn | smokey | good | 82 | yes | Could use more specific examples of actual products |
| operator-pairings-no-medical | non_data | smokey | acceptable | 70 | yes | No specific product details used (prompt contained no data so acceptable) |
| exact-slowest-movers-no-data | non_data | puff | good | 75 | yes | Very generic - could provide immediate next steps beyond just requesting data |

## Launch blockers
- weekend-flash-sale (POOR 45): Response invents inventory data and ignores the non-data nature of the prompt. Issue: Invents specific inventory data (costs, item names) when prompt explicitly states no source data
- owner-daily-briefing-no-data (POOR 45): Response failed to use provided data and lacked substantive briefing content. Issue: Completely ignored the provided business data in the prompt

## Notes
- This runner uses the shared inbox thread-context builder plus inbox persona routing and persona system prompts.
- Briefing-card resilience is covered separately by Jest component tests for partial analytics and check-in payloads.
