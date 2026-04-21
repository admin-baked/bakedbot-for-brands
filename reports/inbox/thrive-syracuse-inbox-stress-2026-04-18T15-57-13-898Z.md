# Thrive Syracuse Inbox Stress Report

- Generated: 2026-04-18T15:57:13.898Z
- Org: org_thrive_syracuse
- Cases run: 25
- Average score: 77.9
- Response-ready cases: 22/25
- Poor or fail: 3
- Failures: 0

## Summary Table
| Case | Kind | Agent | Grade | Score | Ready | Top issue |
| --- | --- | --- | --- | ---: | --- | --- |
| slow-movers-table | data | money_mike | great | 92 | yes | Could provide more specific guidance on timeline for implementation |
| expiring-inventory-writeoff | data | money_mike | good | 78 | yes | Failed to use the expiration dates in the analysis - expiration is the core concern in th... |
| top-sellers-restock | data | pops | great | 92 | yes | Minor formatting inconsistency in the priority list (some all caps, some title case) |
| category-margin-mix | data | money_mike | good | 75 | yes | Failed to analyze all categories thoroughly (edibles has higher margin than pre-roll) |
| daily-traffic-gap | data | pops | great | 90 | yes | Limited analysis of why this dip occurs (could it be post-lunch slump, shift changes, etc... |
| competitor-price-response | data | ezal | good | 82 | yes | Could benefit from more specific implementation steps for executing the price matching |
| review-queue-priority | data | mrs_parker | great | 93 | yes | Could provide more specific language examples for each reply |
| checkin-daily-actions | data | mrs_parker | good | 75 | yes | Actions don't explicitly mention 'before noon' timing |
| campaign-follow-up | data | craig | poor | 45 | no | Fails to use the actual campaign data from the prompt |
| customer-segments-winback | data | mrs_parker | good | 78 | yes | No comparison to other segments to justify why At-risk should be prioritized over Loyal (... |
| loyalty-enrollment-gap | data | mrs_parker | good | 78 | yes | Didn't acknowledge the average of 7 budtenders per day in the analysis |
| owner-briefing-summary | data | pops | great | 90 | yes | The vendor meeting and high-priority emails aren't mentioned despite being time-sensitive |
| weekend-flash-sale | non_data | money_mike | good | 78 | yes | Could provide more specific implementation guidance |
| compliant-sms-draft | non_data | craig | good | 75 | yes | Unnecessary upsell at the end (Hire me...) |
| one-star-review-reply | non_data | smokey | good | 80 | yes | No concrete operational steps to address the wait time issue |
| beginner-budtender-talking-points | non_data | smokey | great | 92 | yes | Could potentially include more information about different product strengths available |
| vendor-day-plan | non_data | craig | good | 78 | yes | Lacks specific mention of inventory management for vendor day |
| owner-daily-briefing-no-data | non_data | puff | good | 80 | yes | Does not attempt to provide any specific guidance without data |
| differentiate-thrive | non_data | ezal | good | 78 | yes | Lacks specific local competitive intelligence despite asking about Syracuse |
| no-verified-competitor-data | non_data | ezal | great | 95 | yes | none |
| partial-table-analysis | data | money_mike | good | 78 | yes | Didn't address the slow-moving Ayrloom Blood Orange Gummies (94 days on hand) |
| multi-turn-sale-to-email | multi_turn | craig | poor | 45 | no | Included prohibited medical claim about microdosing in email |
| multi-turn-budtender-brief | multi_turn | smokey | good | 78 | yes | Missing specific product names from the dispensary inventory |
| operator-pairings-no-medical | non_data | smokey | great | 92 | yes | Could be more specific about how the products complement each other |
| exact-slowest-movers-no-data | non_data | puff | poor | 30 | no | Ignored the explicit prompt requirement to discuss slowest movers without new data |

## Launch blockers
- campaign-follow-up (POOR 45): Response ignores the provided campaign data and makes unsubstantiated claims. Issue: Fails to use the actual campaign data from the prompt
- multi-turn-sale-to-email (POOR 45): Failed compliance with medical claims in email and SMS drafts. Issue: Included prohibited medical claim about microdosing in email
- exact-slowest-movers-no-data (POOR 30): Failed to address the prompt's expectation of discussing slowest movers without data request. Issue: Ignored the explicit prompt requirement to discuss slowest movers without new data

## Notes
- This runner uses the shared inbox thread-context builder plus inbox persona routing and persona system prompts.
- Briefing-card resilience is covered separately by Jest component tests for partial analytics and check-in payloads.
