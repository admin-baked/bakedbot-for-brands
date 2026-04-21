# Thrive Syracuse Inbox Stress Report

- Generated: 2026-04-18T16:40:53.166Z
- Org: org_thrive_syracuse
- Cases run: 25
- Average score: 79.3
- Response-ready cases: 22/25
- Poor or fail: 3
- Failures: 0

## Summary Table
| Case | Kind | Agent | Grade | Score | Ready | Top issue |
| --- | --- | --- | --- | ---: | --- | --- |
| slow-movers-table | data | money_mike | great | 92 | yes | Bundle suggestion combines two different product categories (flower and edible) |
| expiring-inventory-writeoff | data | money_mike | good | 78 | yes | Markdown calculations don't account for the 14-day sales rate properly |
| top-sellers-restock | data | pops | great | 95 | yes | Minor formatting inconsistency in priority labels (CRITICAL vs HIGH/MEDIUM/LOW) |
| category-margin-mix | data | money_mike | good | 78 | yes | Does not consider other anchor categories that could work equally well |
| daily-traffic-gap | data | pops | good | 82 | yes | Informal tone with phrases like 'Pops is keeping it real' doesn't match professional expe... |
| competitor-price-response | data | ezal | great | 88 | yes | Asked for margin data without having it, which could delay decision-making |
| review-queue-priority | data | mrs_parker | great | 90 | yes | Could provide more specific timeframes for responses (e.g., 'respond within 2 hours') |
| checkin-daily-actions | data | mrs_parker | great | 92 | yes | The 22% claim about expanding digital marketing reach is an unsupported assertion |
| campaign-follow-up | data | craig | poor | 45 | no | Ignored numeric business data from provided table in analysis and recommendations |
| customer-segments-winback | data | mrs_parker | great | 92 | yes | Could provide more data on expected conversion rates or potential ROI |
| loyalty-enrollment-gap | data | mrs_parker | good | 78 | yes | Lacks concrete implementation details for the suggested fixes |
| owner-briefing-summary | data | pops | great | 92 | yes | Slightly more detailed than 'short' might imply, but still very appropriate for operation... |
| weekend-flash-sale | non_data | money_mike | good | 75 | yes | No specific product examples for Thrive Syracuse |
| compliant-sms-draft | non_data | craig | good | 80 | yes | Could be more specific about what makes pre-rolls special |
| one-star-review-reply | non_data | smokey | good | 75 | yes | Could be more specific about concrete steps being taken to address wait times |
| beginner-budtender-talking-points | non_data | smokey | great | 92 | yes | Could potentially mention product-specific options available at their dispensary |
| vendor-day-plan | non_data | craig | poor | 30 | no | Not actionable for operational staff - lacks concrete preparation tasks |
| owner-daily-briefing-no-data | non_data | puff | poor | 40 | no | Provides no actual briefing content despite prompt |
| differentiate-thrive | non_data | ezal | good | 78 | yes | No use of Syracuse-specific market data |
| no-verified-competitor-data | non_data | ezal | great | 90 | yes | Could potentially suggest specific tools or methods for price tracking if those were part... |
| partial-table-analysis | data | money_mike | good | 82 | yes | Promotion strategy lacks specific implementation details |
| multi-turn-sale-to-email | multi_turn | craig | good | 78 | yes | Missing personalization beyond [Customer Name] placeholder |
| multi-turn-budtender-brief | multi_turn | smokey | great | 90 | yes | Slightly generic opening could be more specific to the dispensary's actual products |
| operator-pairings-no-medical | non_data | smokey | great | 95 | yes | None significant for this stress case |
| exact-slowest-movers-no-data | non_data | puff | good | 75 | yes | Didn't address the prompt which stated there was no data |

## Launch blockers
- campaign-follow-up (POOR 45): Failed to use campaign data to create a concrete send plan, included promotional language, and made unsupported claims. Issue: Ignored numeric business data from provided table in analysis and recommendations
- vendor-day-plan (POOR 30): The response lacks specific operational preparation details and includes sales pitches. Issue: Not actionable for operational staff - lacks concrete preparation tasks
- owner-daily-briefing-no-data (POOR 40): Lacks any substantive data while promising more if provided. Issue: Provides no actual briefing content despite prompt

## Notes
- This runner uses the shared inbox thread-context builder plus inbox persona routing and persona system prompts.
- Briefing-card resilience is covered separately by Jest component tests for partial analytics and check-in payloads.
