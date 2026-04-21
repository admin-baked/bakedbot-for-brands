# Thrive Syracuse Inbox Stress Report

- Generated: 2026-04-18T16:36:28.096Z
- Org: org_thrive_syracuse
- Cases run: 25
- Average score: 77.0
- Response-ready cases: 21/25
- Poor or fail: 4
- Failures: 1

## Summary Table
| Case | Kind | Agent | Grade | Score | Ready | Top issue |
| --- | --- | --- | --- | ---: | --- | --- |
| slow-movers-table | data | money_mike | good | 80 | yes | Bundle pricing calculations weren't shown explicitly |
| expiring-inventory-writeoff | data | money_mike | poor | 42 | no | Failed to use the actual 14-day sales data provided in the table |
| top-sellers-restock | data | pops | great | 92 | yes | Days of cover calculations could be rounded for better clarity (e.g., 0.33 days → ~8 hour... |
| category-margin-mix | data | money_mike | poor | 45 | no | Incorrectly states concentrate has the lowest GM (actually flower at 43%) |
| daily-traffic-gap | data | pops | great | 90 | yes | No mention of how to measure the effectiveness of these interventions |
| competitor-price-response | data | ezal | good | 85 | yes | Could provide more rationale for specific price points (e.g., $36-$37 range for flower) |
| review-queue-priority | data | mrs_parker | great | 92 | yes | No mention of response timing targets beyond Taylor and Alina |
| checkin-daily-actions | data | mrs_parker | good | 75 | yes | Claims about online reputation impact without support |
| campaign-follow-up | data | craig | good | 78 | yes | Contains a compliance red flag with drug effect claims |
| customer-segments-winback | data | mrs_parker | great | 90 | yes | No specific timeline implementation plan |
| loyalty-enrollment-gap | data | mrs_parker | good | 82 | yes | Could provide more specific training standardization strategies |
| owner-briefing-summary | data | pops | good | 82 | yes | Missing mention of the 3 unread high-priority emails and 12:30 PM vendor meeting |
| weekend-flash-sale | non_data | money_mike | fail | 0 | no | Major compliance violation: Discussing food products (steaks, chicken, salmon) in a dispe... |
| compliant-sms-draft | non_data | craig | good | 75 | yes | Very brief response for a paid service ($30) |
| one-star-review-reply | non_data | smokey | great | 92 | yes | Slightly generic - could be more specific to the dispensary experience |
| beginner-budtender-talking-points | non_data | smokey | great | 92 | yes | Could include more specific guidance on how to explain the difference between THC types |
| vendor-day-plan | non_data | craig | poor | 42 | no | Contains medical claims like 'Learn, Taste, Discover' which implies health benefits |
| owner-daily-briefing-no-data | non_data | puff | good | 80 | yes | Could have provided more guidance on accessing typical dispensary data |
| differentiate-thrive | non_data | ezal | great | 92 | yes | Response asks follow-up questions that might delay getting to solutions |
| no-verified-competitor-data | non_data | ezal | great | 92 | yes | Could potentially add more specificity on what metrics to track beyond price |
| partial-table-analysis | data | money_mike | acceptable | 75 | yes | Margin calculation for Heady Tree Gelato appears incorrect ($36 - $15.20 = $20.80, which ... |
| multi-turn-sale-to-email | multi_turn | craig | great | 92 | yes | Minor opportunity - could provide slightly more context on how these integrate with exist... |
| multi-turn-budtender-brief | multi_turn | smokey | great | 92 | yes | No specific product examples mentioned |
| operator-pairings-no-medical | non_data | smokey | great | 92 | yes | The match confidence percentages seem arbitrary without supporting data |
| exact-slowest-movers-no-data | non_data | puff | good | 75 | yes | Could be more concise given the simple prompt |

## Launch blockers
- expiring-inventory-writeoff (POOR 42): Response failed to use the provided inventory data effectively and lacked concrete actionable steps. Issue: Failed to use the actual 14-day sales data provided in the table
- category-margin-mix (POOR 45): The response incorrectly identifies concentrate as having the lowest gross margin and provides flawed bundle math. Issue: Incorrectly states concentrate has the lowest GM (actually flower at 43%)
- weekend-flash-sale (FAIL 0): Response contains major compliance violations by discussing food products in a dispensary context. Issue: Major compliance violation: Discussing food products (steaks, chicken, salmon) in a dispensary context
- vendor-day-plan (POOR 42): The response contains medical claims and cannabis marketing hype that violates compliance standards. Issue: Contains medical claims like 'Learn, Taste, Discover' which implies health benefits

## Notes
- This runner uses the shared inbox thread-context builder plus inbox persona routing and persona system prompts.
- Briefing-card resilience is covered separately by Jest component tests for partial analytics and check-in payloads.
