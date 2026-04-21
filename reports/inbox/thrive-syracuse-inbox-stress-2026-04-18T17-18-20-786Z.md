# Thrive Syracuse Inbox Stress Report

- Generated: 2026-04-18T17:18:20.786Z
- Org: org_thrive_syracuse
- Cases run: 25
- Average score: 79.0
- Response-ready cases: 21/25
- Poor or fail: 4
- Failures: 0

## Summary Table
| Case | Kind | Agent | Grade | Score | Ready | Top issue |
| --- | --- | --- | --- | ---: | --- | --- |
| slow-movers-table | data | money_mike | great | 92 | yes | Write-off consideration could be more detailed with specific thresholds |
| expiring-inventory-writeoff | data | money_mike | great | 90 | yes | No specific timeline suggested for markdown implementation |
| top-sellers-restock | data | pops | great | 92 | yes | Brief mention of 'Money Mike' without context might be confusing if this is not a known i... |
| category-margin-mix | data | money_mike | good | 75 | yes | Didn't explore alternative bundle options or explain why vape was the best choice over ot... |
| daily-traffic-gap | data | pops | good | 85 | yes | The response does not clearly structure next steps. |
| competitor-price-response | data | ezal | great | 92 | yes | Could provide more specific margin impact analysis |
| review-queue-priority | data | mrs_parker | great | 92 | yes | No specific mention of response time targets for each priority level |
| checkin-daily-actions | data | mrs_parker | good | 80 | yes | Didn't address the 'this week' check-in data beyond mentioning mood percentages |
| campaign-follow-up | data | craig | poor | 35 | no | Failed to use the actual campaign data (ignores Friday Flower Drop performance) |
| customer-segments-winback | data | mrs_parker | great | 92 | yes | Minor opportunity to quantify potential ROI of the win-back campaign |
| loyalty-enrollment-gap | data | mrs_parker | great | 92 | yes | No specific implementation timeline |
| owner-briefing-summary | data | pops | good | 85 | yes | Could be more concise to better meet the 'keep it short' requirement |
| weekend-flash-sale | non_data | money_mike | poor | 42 | no | Invents specific inventory data (58% granola margin, 62% chia seeds margin) |
| compliant-sms-draft | non_data | craig | poor | 45 | no | Provided multiple variations instead of one SMS as requested |
| one-star-review-reply | non_data | smokey | good | 80 | yes | Lacks specific details about how wait times will be addressed |
| beginner-budtender-talking-points | non_data | smokey | great | 95 | yes | Minor opportunity: could include a brief point about different types of edibles (gummies,... |
| vendor-day-plan | non_data | craig | poor | 45 | no | Does not specifically address what the inbox should prepare for the floor team |
| owner-daily-briefing-no-data | non_data | puff | great | 95 | yes | None significant - this response handles the no-data scenario perfectly |
| differentiate-thrive | non_data | ezal | good | 75 | yes | No specific mention of nearby dispensaries to differentiate against |
| no-verified-competitor-data | non_data | ezal | great | 92 | yes | None - this response is excellent for the given scenario |
| partial-table-analysis | data | money_mike | good | 75 | yes | Margin calculations are incorrect (showing 57.8% for Heady Tree Gelato when it's actually... |
| multi-turn-sale-to-email | multi_turn | craig | good | 78 | yes | Lacks specific metrics or KPIs to measure success |
| multi-turn-budtender-brief | multi_turn | smokey | good | 82 | yes | Could benefit from specific strain examples beyond just two |
| operator-pairings-no-medical | non_data | smokey | great | 95 | yes | Could include more specific product examples if available |
| exact-slowest-movers-no-data | non_data | puff | good | 75 | yes | Misinterpreted prompt - expected discussion of 'exact slowest movers' without data |

## Launch blockers
- campaign-follow-up (POOR 35): Response ignores key data and includes non-compliance issues. Issue: Failed to use the actual campaign data (ignores Friday Flower Drop performance)
- weekend-flash-sale (POOR 42): Response invents inventory data and ignores the non-data stress case requirement. Issue: Invents specific inventory data (58% granola margin, 62% chia seeds margin)
- compliant-sms-draft (POOR 45): The response ignores the request for one compliant SMS and instead provides multiple options with promotional content. Issue: Provided multiple variations instead of one SMS as requested
- vendor-day-plan (POOR 45): The response provides some useful marketing ideas but fails to address the core question about inbox preparation for the floor team and follow-up. Issue: Does not specifically address what the inbox should prepare for the floor team

## Notes
- This runner uses the shared inbox thread-context builder plus inbox persona routing and persona system prompts.
- Briefing-card resilience is covered separately by Jest component tests for partial analytics and check-in payloads.
