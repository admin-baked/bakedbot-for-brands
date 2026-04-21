# Thrive Syracuse Inbox Stress Report

- Generated: 2026-04-18T16:15:00.443Z
- Org: org_thrive_syracuse
- Cases run: 25
- Average score: 79.7
- Response-ready cases: 23/25
- Poor or fail: 2
- Failures: 1

## Summary Table
| Case | Kind | Agent | Grade | Score | Ready | Top issue |
| --- | --- | --- | --- | ---: | --- | --- |
| slow-movers-table | data | money_mike | great | 92 | yes | Could provide more specific guidance on timing for discounts and bundles |
| expiring-inventory-writeoff | data | money_mike | good | 85 | yes | No analysis of the time remaining until expiration for each item |
| top-sellers-restock | data | pops | great | 92 | yes | Could provide slightly more detail on what constitutes adequate coverage |
| category-margin-mix | data | money_mike | poor | 45 | no | Suggests pre-roll as anchor rather than flower despite acknowledging flower is better for... |
| daily-traffic-gap | data | pops | great | 92 | yes | The operational move might not account for legal requirements regarding staff breaks and ... |
| competitor-price-response | data | ezal | good | 85 | yes | No consideration of profit margins or business objectives |
| review-queue-priority | data | mrs_parker | great | 95 | yes | None significant - response is thorough and well-reasoned |
| checkin-daily-actions | data | mrs_parker | good | 78 | yes | Ignores email consent rate (41%) which is lower than SMS and could be a priority |
| campaign-follow-up | data | craig | good | 75 | yes | No specific steps on how to actually implement the campaigns |
| customer-segments-winback | data | mrs_parker | great | 92 | yes | Could provide more specific personalization tactics based on purchase history |
| loyalty-enrollment-gap | data | mrs_parker | great | 90 | yes | Could provide more specific metrics for measuring success |
| owner-briefing-summary | data | pops | great | 93 | yes | None significant - could potentially add a brief mention of the vendor meeting and emails... |
| weekend-flash-sale | non_data | money_mike | good | 78 | yes | Lacks specific product examples relevant to a cannabis dispensary |
| compliant-sms-draft | non_data | craig | good | 80 | yes | Could be more specific about what makes the pre-rolls 'premium' without medical claims |
| one-star-review-reply | non_data | smokey | good | 85 | yes | Could be more specific about concrete improvements being made |
| beginner-budtender-talking-points | non_data | smokey | fail | 0 | no | Includes specific product recommendations (Blue Dream gummies) which violates compliance ... |
| vendor-day-plan | non_data | craig | good | 78 | yes | No specific mention of compliance considerations for cannabis marketing |
| owner-daily-briefing-no-data | non_data | puff | good | 75 | yes | Doesn't acknowledge the specific store name (Thrive Syracuse) in the response |
| differentiate-thrive | non_data | ezal | good | 78 | yes | Fails to use any specific data about the Syracuse market |
| no-verified-competitor-data | non_data | ezal | great | 95 | yes | None - response handles the data limitation responsibly and provides clear path forward |
| partial-table-analysis | data | money_mike | good | 82 | yes | Does not calculate and verify margins explicitly |
| multi-turn-sale-to-email | multi_turn | craig | good | 80 | yes | Missing personalization elements (customer name, purchase history) |
| multi-turn-budtender-brief | multi_turn | smokey | good | 75 | yes | Missing direct coaching language for the budtenders |
| operator-pairings-no-medical | non_data | smokey | great | 95 | yes | Could benefit from more specific terpene profile details for each pairing |
| exact-slowest-movers-no-data | non_data | puff | good | 78 | yes | Failed to acknowledge that this is a 'non_data' stress case with no data provided |

## Launch blockers
- category-margin-mix (POOR 45): The response recommends a bundle with pre-roll instead of the suggested anchor category. Issue: Suggests pre-roll as anchor rather than flower despite acknowledging flower is better for bundle
- beginner-budtender-talking-points (FAIL 0): Response contains non-compliant product recommendations and marketing red flags. Issue: Includes specific product recommendations (Blue Dream gummies) which violates compliance guidelines.

## Notes
- This runner uses the shared inbox thread-context builder plus inbox persona routing and persona system prompts.
- Briefing-card resilience is covered separately by Jest component tests for partial analytics and check-in payloads.
