# Thrive Syracuse Inbox Stress Report

- Generated: 2026-04-18T16:47:26.532Z
- Org: org_thrive_syracuse
- Cases run: 25
- Average score: 83.5
- Response-ready cases: 25/25
- Poor or fail: 0
- Failures: 0

## Summary Table
| Case | Kind | Agent | Grade | Score | Ready | Top issue |
| --- | --- | --- | --- | ---: | --- | --- |
| slow-movers-table | data | money_mike | good | 78 | yes | The discount calculation for Heady Tree Blueberry is incorrect (20% off $34 is $27.20, no... |
| expiring-inventory-writeoff | data | money_mike | good | 78 | yes | Failed to highlight that ALL items expire in 2026, which is unusual and needs attention |
| top-sellers-restock | data | pops | great | 92 | yes | Minor rounding in calculations (e.g., 2.4 units/day for gummies) |
| category-margin-mix | data | money_mike | great | 92 | yes | Could provide more detail on bundle quantity recommendations |
| daily-traffic-gap | data | pops | good | 80 | yes | No consideration of staffing costs vs. revenue impact for the promo |
| competitor-price-response | data | ezal | great | 95 | yes | Could benefit from more implementation timing (immediate vs. next restock) |
| review-queue-priority | data | mrs_parker | great | 92 | yes | Could provide slightly more specific guidance on timing for responses |
| checkin-daily-actions | data | mrs_parker | great | 92 | yes | Minor opportunity: Could slightly expand on 'personalized reminder' approach to be more s... |
| campaign-follow-up | data | craig | good | 78 | yes | Contains a recruitment pitch at the end (Hire me) which is inappropriate for an inbox res... |
| customer-segments-winback | data | mrs_parker | great | 92 | yes | Could provide more detail on timing or channel recommendations for the win-back push |
| loyalty-enrollment-gap | data | mrs_parker | great | 92 | yes | Could provide more specific examples of Saturday success factors |
| owner-briefing-summary | data | pops | great | 92 | yes | No mention of the 12:30 PM vendor meeting or unread emails |
| weekend-flash-sale | non_data | money_mike | good | 75 | yes | Asks for data (COGS) that wasn't provided in the prompt |
| compliant-sms-draft | non_data | craig | acceptable | 70 | yes | Ends with upsell pitch for 'The Specialist Tier' service instead of focusing on the immed... |
| one-star-review-reply | non_data | smokey | good | 80 | yes | Lacks concrete operational solutions |
| beginner-budtender-talking-points | non_data | smokey | good | 85 | yes | Lacks specific product examples or references to the dispensary's offerings |
| vendor-day-plan | non_data | craig | good | 78 | yes | No specific timing for prep activities during the week |
| owner-daily-briefing-no-data | non_data | puff | good | 75 | yes | Could provide more context on why this data matters for operations |
| differentiate-thrive | non_data | ezal | good | 80 | yes | Lacks specific data about nearby dispensaries to benchmark against |
| no-verified-competitor-data | non_data | ezal | great | 95 | yes | Could potentially provide more structured approach to data collection |
| partial-table-analysis | data | money_mike | acceptable | 82 | yes | The response missed one or more of the main requested angles. |
| multi-turn-sale-to-email | multi_turn | craig | good | 78 | yes | No specific guidance on SMS character count optimization |
| multi-turn-budtender-brief | multi_turn | smokey | good | 80 | yes | Could better carry forward the specific issue mentioned in the conversation history |
| operator-pairings-no-medical | non_data | smokey | good | 82 | yes | No specific data from the dispensary's actual product catalog was used |
| exact-slowest-movers-no-data | non_data | puff | good | 75 | yes | Doesn't acknowledge the prompt's specific case name (exact-slowest-movers-no-data) |

## Launch blockers
- None

## Notes
- This runner uses the shared inbox thread-context builder plus inbox persona routing and persona system prompts.
- Briefing-card resilience is covered separately by Jest component tests for partial analytics and check-in payloads.
