# Thrive Syracuse Inbox Stress Report

- Generated: 2026-04-18T17:03:09.986Z
- Org: org_thrive_syracuse
- Cases run: 25
- Average score: 81.3
- Response-ready cases: 24/25
- Poor or fail: 1
- Failures: 0

## Summary Table
| Case | Kind | Agent | Grade | Score | Ready | Top issue |
| --- | --- | --- | --- | ---: | --- | --- |
| slow-movers-table | data | money_mike | good | 85 | yes | Minor inconsistency in description of Jaunty Lime recommendation (says 'small 5% price re... |
| expiring-inventory-writeoff | data | money_mike | great | 92 | yes | No specific timeline for markdown implementation |
| top-sellers-restock | data | pops | great | 92 | yes | The 'Money Mike Alert' reference might be too informal for some operators |
| category-margin-mix | data | money_mike | good | 78 | yes | Could provide more specific margin calculations for the bundle |
| daily-traffic-gap | data | pops | good | 82 | yes | Could provide more specific data comparisons to strengthen the analysis |
| competitor-price-response | data | ezal | great | 92 | yes | Could provide more data on expected margin impact of price changes |
| review-queue-priority | data | mrs_parker | great | 95 | yes | Could add slightly more detail on tracking or follow-up processes |
| checkin-daily-actions | data | mrs_parker | good | 78 | yes | Could provide more specific tactics for how to implement the suggested actions |
| campaign-follow-up | data | craig | poor | 45 | no | Does not address list fatigue - the key concern in the prompt |
| customer-segments-winback | data | mrs_parker | great | 92 | yes | Minor opportunity to quantify potential ROI estimates based on historical spend |
| loyalty-enrollment-gap | data | mrs_parker | good | 78 | yes | No specific numeric targets for improvement |
| owner-briefing-summary | data | pops | great | 95 | yes | None significant - response is concise but complete |
| weekend-flash-sale | non_data | money_mike | good | 75 | yes | Limited to one idea when the prompt asks for 'one strong' idea (though this is acceptable) |
| compliant-sms-draft | non_data | craig | good | 78 | yes | Contains upsell attempt for paid services at the end |
| one-star-review-reply | non_data | smokey | good | 80 | yes | No specific resolution offered to compensate for the poor experience |
| beginner-budtender-talking-points | non_data | smokey | great | 90 | yes | Emoji usage might be inconsistent with some dispensary branding |
| vendor-day-plan | non_data | craig | acceptable | 75 | yes | Contains marketing red flags with hype language and promotional claims |
| owner-daily-briefing-no-data | non_data | puff | acceptable | 70 | yes | Could have provided more actionable suggestions for what owner can do immediately |
| differentiate-thrive | non_data | ezal | good | 82 | yes | Acknowledges lack of data but proceeds without addressing available information |
| no-verified-competitor-data | non_data | ezal | great | 92 | yes | No mention of how often to check competitor prices for ongoing monitoring |
| partial-table-analysis | data | money_mike | good | 78 | yes | Recommendations somewhat generic without knowing other SKUs |
| multi-turn-sale-to-email | multi_turn | craig | good | 78 | yes | Email lacks personalized product recommendations |
| multi-turn-budtender-brief | multi_turn | smokey | good | 80 | yes | [insert specific strains from your inventory] placeholder not filled with actual inventor... |
| operator-pairings-no-medical | non_data | smokey | good | 80 | yes | Talking points could be more detailed about consumption experience |
| exact-slowest-movers-no-data | non_data | puff | acceptable | 70 | yes | Misses opportunity to discuss what slow movers generally are and common approaches |

## Launch blockers
- campaign-follow-up (POOR 45): Response ignores key data points and includes an inappropriate sales pitch. Issue: Does not address list fatigue - the key concern in the prompt

## Notes
- This runner uses the shared inbox thread-context builder plus inbox persona routing and persona system prompts.
- Briefing-card resilience is covered separately by Jest component tests for partial analytics and check-in payloads.
