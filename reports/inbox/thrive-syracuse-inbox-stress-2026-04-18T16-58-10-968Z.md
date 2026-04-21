# Thrive Syracuse Inbox Stress Report

- Generated: 2026-04-18T16:58:10.968Z
- Org: org_thrive_syracuse
- Cases run: 25
- Average score: 77.5
- Response-ready cases: 21/25
- Poor or fail: 4
- Failures: 0

## Summary Table
| Case | Kind | Agent | Grade | Score | Ready | Top issue |
| --- | --- | --- | --- | ---: | --- | --- |
| slow-movers-table | data | money_mike | great | 92 | yes | Days on hand calculations could be explained more clearly |
| expiring-inventory-writeoff | data | money_mike | good | 85 | yes | Could provide more criteria for the markdown percentage recommendation |
| top-sellers-restock | data | pops | great | 92 | yes | Could include more specific reorder quantities for each SKU |
| category-margin-mix | data | money_mike | poor | 48 | no | Uses 'loss leader' strategy which is a compliance red flag in cannabis |
| daily-traffic-gap | data | pops | great | 90 | yes | Could provide more specific details about potential ROI or implementation timeline |
| competitor-price-response | data | ezal | great | 92 | yes | None - this response demonstrates strong launch readiness |
| review-queue-priority | data | mrs_parker | great | 92 | yes | No specific metrics for compensation offers |
| checkin-daily-actions | data | mrs_parker | great | 92 | yes | Email consent strategy could be more detailed |
| campaign-follow-up | data | craig | poor | 45 | no | Failed to provide specific send numbers based on the data provided |
| customer-segments-winback | data | mrs_parker | great | 90 | yes | Could provide more specific rationale for choosing At-risk over Loyal segment despite sim... |
| loyalty-enrollment-gap | data | mrs_parker | great | 92 | yes | Could have provided additional context on what makes Saturday successful to replicate |
| owner-briefing-summary | data | pops | great | 90 | yes | Could potentially provide even more specific next steps for each priority |
| weekend-flash-sale | non_data | money_mike | poor | 35 | no | Ignores the specific data about Thrive Syracuse |
| compliant-sms-draft | non_data | craig | acceptable | 65 | yes | SMS drafts are too long for typical SMS character limits |
| one-star-review-reply | non_data | smokey | good | 75 | yes | Lacks specific operational steps the dispensary will take to address the wait times |
| beginner-budtender-talking-points | non_data | smokey | great | 90 | yes | Terpene awareness section could be slightly more simplified for absolute beginners |
| vendor-day-plan | non_data | craig | poor | 35 | no | Completely misses the specific question about inbox preparation this week |
| owner-daily-briefing-no-data | non_data | puff | acceptable | 65 | yes | Doesn't provide the requested daily briefing |
| differentiate-thrive | non_data | ezal | good | 82 | yes | Lacks specific information about nearby competitors |
| no-verified-competitor-data | non_data | ezal | great | 92 | yes | Could suggest specific tools or methods for tracking competitor data |
| partial-table-analysis | data | money_mike | great | 92 | yes | No explicit compliance warning about not making unsubstantiated claims about products |
| multi-turn-sale-to-email | multi_turn | craig | good | 75 | yes | Includes inappropriate self-promotional hire pitch at the end |
| multi-turn-budtender-brief | multi_turn | smokey | great | 92 | yes | Could mention specific product names that exemplify good daytime options |
| operator-pairings-no-medical | non_data | smokey | good | 75 | yes | Lack of specific product identifiers (SKUs) for immediate action |
| exact-slowest-movers-no-data | non_data | puff | acceptable | 65 | yes | No immediate actions provided while waiting for data |

## Launch blockers
- category-margin-mix (POOR 48): The response contains a compliance red flag by using a loss leader strategy which is prohibited in cannabis retail. Issue: Uses 'loss leader' strategy which is a compliance red flag in cannabis
- campaign-follow-up (POOR 45): Response ignores provided data and includes medical/educational claims with promotional upsell. Issue: Failed to provide specific send numbers based on the data provided
- weekend-flash-sale (POOR 35): Response ignores provided data and lacks actionable inventory specifics. Issue: Ignores the specific data about Thrive Syracuse
- vendor-day-plan (POOR 35): Response ignores the core question about inbox preparation and focuses on general marketing strategies without actionable steps. Issue: Completely misses the specific question about inbox preparation this week

## Notes
- This runner uses the shared inbox thread-context builder plus inbox persona routing and persona system prompts.
- Briefing-card resilience is covered separately by Jest component tests for partial analytics and check-in payloads.
