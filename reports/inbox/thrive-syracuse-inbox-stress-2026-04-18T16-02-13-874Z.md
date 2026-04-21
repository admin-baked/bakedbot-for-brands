# Thrive Syracuse Inbox Stress Report

- Generated: 2026-04-18T16:02:13.874Z
- Org: org_thrive_syracuse
- Cases run: 25
- Average score: 82.6
- Response-ready cases: 24/25
- Poor or fail: 1
- Failures: 0

## Summary Table
| Case | Kind | Agent | Grade | Score | Ready | Top issue |
| --- | --- | --- | --- | ---: | --- | --- |
| slow-movers-table | data | money_mike | good | 86 | yes | none |
| expiring-inventory-writeoff | data | money_mike | good | 80 | yes | Margin calculations seem inconsistent with retail/cost data provided |
| top-sellers-restock | data | pops | great | 92 | yes | The MFNY Hash Burger 1g is listed as low priority despite having the largest stockout gap... |
| category-margin-mix | data | money_mike | good | 80 | yes | Doesn't address inventory turnover rates for concentrate |
| daily-traffic-gap | data | pops | great | 92 | yes | Could have more explicitly addressed the revenue dip in addition to order numbers |
| competitor-price-response | data | ezal | great | 92 | yes | Could provide more data on potential margin impact of price matching |
| review-queue-priority | data | mrs_parker | great | 90 | yes | No specific timeline for implementing the suggested response strategy |
| checkin-daily-actions | data | mrs_parker | good | 82 | yes | Action 1 lacks specific steps on how to follow up on Day-3 reviews |
| campaign-follow-up | data | craig | great | 92 | yes | Email click rate projection (4-6%) is ambitious given the 2.4% current performance |
| customer-segments-winback | data | mrs_parker | good | 82 | yes | Failed to consider VIP segment despite having highest spend |
| loyalty-enrollment-gap | data | mrs_parker | good | 78 | yes | Doesn't address why Saturday is performing better beyond just the numbers |
| owner-briefing-summary | data | pops | great | 95 | yes | Could potentially mention the vendor meeting and unread emails as secondary priorities |
| weekend-flash-sale | non_data | money_mike | acceptable | 75 | yes | No specific product recommendations for Thrive Syracuse |
| compliant-sms-draft | non_data | craig | good | 78 | yes | Ends with upsell pitch for paid services |
| one-star-review-reply | non_data | smokey | good | 75 | yes | No immediate solution offered for the customer's frustration |
| beginner-budtender-talking-points | non_data | smokey | great | 92 | yes | Could benefit from one talking point about the importance of consuming edibles with food |
| vendor-day-plan | non_data | craig | acceptable | 75 | yes | No specific data integration (customer lists, past vendor events) |
| owner-daily-briefing-no-data | non_data | puff | poor | 40 | no | Failed to use available data in the prompt |
| differentiate-thrive | non_data | ezal | good | 82 | yes | Could be more specific about implementation details for each suggestion |
| no-verified-competitor-data | non_data | ezal | good | 82 | yes | Could provide more specific guidance on gathering competitive pricing data |
| partial-table-analysis | data | money_mike | great | 95 | yes | Minor improvement could be made in explaining why selected specific discount amounts |
| multi-turn-sale-to-email | multi_turn | craig | good | 78 | yes | No personalization placeholders beyond [Customer Name] |
| multi-turn-budtender-brief | multi_turn | smokey | great | 92 | yes | Slightly overemphasizes caryophyllene for daytime which may not be ideal for all daytime ... |
| operator-pairings-no-medical | non_data | smokey | good | 80 | yes | Could provide more specific guidance on how to present these pairings to different custom... |
| exact-slowest-movers-no-data | non_data | puff | good | 80 | yes | Does not acknowledge the prompt had no data (as specified in stress case) |

## Launch blockers
- owner-daily-briefing-no-data (POOR 40): Generic response that fails to use available data and provides no actionable insights. Issue: Failed to use available data in the prompt

## Notes
- This runner uses the shared inbox thread-context builder plus inbox persona routing and persona system prompts.
- Briefing-card resilience is covered separately by Jest component tests for partial analytics and check-in payloads.
