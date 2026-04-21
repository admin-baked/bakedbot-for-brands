# Thrive Syracuse Inbox Stress Report

- Generated: 2026-04-18T16:48:34.041Z
- Org: org_thrive_syracuse
- Cases run: 25
- Average score: 82.8
- Response-ready cases: 24/25
- Poor or fail: 1
- Failures: 0

## Summary Table
| Case | Kind | Agent | Grade | Score | Ready | Top issue |
| --- | --- | --- | --- | ---: | --- | --- |
| slow-movers-table | data | money_mike | good | 82 | yes | Some actions seem contradictory (e.g., holding items with very high days on hand) |
| expiring-inventory-writeoff | data | money_mike | good | 82 | yes | No specific markdown percentage or price for the gummies |
| top-sellers-restock | data | pops | great | 92 | yes | Minor mathematical rounding in daily velocity calculations (e.g., 24/7 = 3.428... not exa... |
| category-margin-mix | data | money_mike | good | 75 | yes | Bundle pricing strategy not clearly explained |
| daily-traffic-gap | data | pops | great | 92 | yes | Could have suggested additional metrics to track the effectiveness of the promo |
| competitor-price-response | data | ezal | great | 92 | yes | No mention of margin impact analysis |
| review-queue-priority | data | mrs_parker | great | 92 | yes | No specific timeline recommendations for responses |
| checkin-daily-actions | data | mrs_parker | good | 78 | yes | Action items could be more specific with concrete steps |
| campaign-follow-up | data | craig | good | 75 | yes | Didn't provide specific list fatigue prevention strategies despite mentioning frequency c... |
| customer-segments-winback | data | mrs_parker | great | 92 | yes | Could provide more specific details about how to calculate tiered discount |
| loyalty-enrollment-gap | data | mrs_parker | good | 82 | yes | Could provide more specific examples of effective loyalty enrollment scripts |
| owner-briefing-summary | data | pops | great | 92 | yes | Very minor opportunity - could briefly mention the vendor meeting as a fourth considerati... |
| weekend-flash-sale | non_data | money_mike | good | 78 | yes | No specific data about Thrive Syracuse's actual inventory or margins |
| compliant-sms-draft | non_data | craig | good | 80 | yes | Could be more concise - the campaign strategy and target segment sections are unnecessary... |
| one-star-review-reply | non_data | smokey | good | 80 | yes | Could provide more specific next steps for the customer |
| beginner-budtender-talking-points | non_data | smokey | great | 92 | yes | Terpene explanation could be slightly more simplified for absolute beginners |
| vendor-day-plan | non_data | craig | good | 78 | yes | Contains a sales pitch at the end which is inappropriate for an inbox response |
| owner-daily-briefing-no-data | non_data | puff | good | 78 | yes | Very generic response without any dispensary-specific insights |
| differentiate-thrive | non_data | ezal | good | 85 | yes | Lacks concrete examples or case studies |
| no-verified-competitor-data | non_data | ezal | great | 95 | yes | Could potentially suggest one more specific method for gathering current competitor data |
| partial-table-analysis | data | money_mike | good | 75 | yes | Failed to mention any immediate markdowns for the severely slow Heady Tree Gelato |
| multi-turn-sale-to-email | multi_turn | craig | good | 80 | yes | Missing specific product details that were requested in the prompt |
| multi-turn-budtender-brief | multi_turn | smokey | great | 92 | yes | None significant - exceeds requirements for this stress case |
| operator-pairings-no-medical | non_data | smokey | great | 92 | yes | Minor opportunity to provide even more specific terpene profiles for each pairing |
| exact-slowest-movers-no-data | non_data | puff | poor | 40 | no | Completely ignored the specific stress case scenario where no data is available |

## Launch blockers
- exact-slowest-movers-no-data (POOR 40): Response completely missed the prompt's specific scenario of no data available. Issue: Completely ignored the specific stress case scenario where no data is available

## Notes
- This runner uses the shared inbox thread-context builder plus inbox persona routing and persona system prompts.
- Briefing-card resilience is covered separately by Jest component tests for partial analytics and check-in payloads.
