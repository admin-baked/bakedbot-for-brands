# Thrive Syracuse Inbox Stress Report

- Generated: 2026-04-18T17:27:11.586Z
- Org: org_thrive_syracuse
- Cases run: 25
- Average score: 82.8
- Response-ready cases: 24/25
- Poor or fail: 1
- Failures: 0

## Summary Table
| Case | Kind | Agent | Grade | Score | Ready | Top issue |
| --- | --- | --- | --- | ---: | --- | --- |
| slow-movers-table | data | money_mike | great | 92 | yes | The bundle with MFNY Hash Burger recommendation has already been discounted earlier in th... |
| expiring-inventory-writeoff | data | money_mike | good | 78 | yes | No implementation timeline for the recommended actions |
| top-sellers-restock | data | pops | great | 92 | yes | Requested margin data without having access to that information |
| category-margin-mix | data | money_mike | poor | 45 | no | Incorrectly identifies Pre-Roll as the anchor category when Flower has the highest revenue |
| daily-traffic-gap | data | pops | great | 92 | yes | Could provide slightly more detail on how to track the effectiveness of the promo |
| competitor-price-response | data | ezal | great | 92 | yes | No mention of implementation timeline or how to phase these changes |
| review-queue-priority | data | mrs_parker | great | 93 | yes | No specific timeline for addressing each case |
| checkin-daily-actions | data | mrs_parker | good | 82 | yes | Could provide more specific details on how to implement the survey for email consent |
| campaign-follow-up | data | craig | good | 75 | yes | Lacks specific send numbers for next week's campaigns |
| customer-segments-winback | data | mrs_parker | good | 80 | yes | Could provide more detail on how to implement the campaign |
| loyalty-enrollment-gap | data | mrs_parker | good | 80 | yes | Didn't suggest immediate, simple fixes that could be implemented right away |
| owner-briefing-summary | data | pops | great | 95 | yes | Minor opportunity to be slightly more specific about the vendor meeting timing impact |
| weekend-flash-sale | non_data | money_mike | good | 75 | yes | Did not utilize any specific data from the prompt (though none was provided) |
| compliant-sms-draft | non_data | craig | great | 90 | yes | Could benefit from specific product details or unique selling points |
| one-star-review-reply | non_data | smokey | good | 82 | yes | No specific operational details about how the issues will be addressed |
| beginner-budtender-talking-points | non_data | smokey | good | 82 | yes | Lacks specific product examples that would make it more actionable |
| vendor-day-plan | non_data | craig | good | 78 | yes | Limited specific guidance for the floor team on operational readiness |
| owner-daily-briefing-no-data | non_data | puff | good | 75 | yes | Lacks actual data despite being a daily briefing |
| differentiate-thrive | non_data | ezal | good | 80 | yes | Lacks specific local Syracuse market context |
| no-verified-competitor-data | non_data | ezal | good | 85 | yes | Could provide more detail on how to systematically gather competitor data |
| partial-table-analysis | data | money_mike | good | 75 | yes | Missing prioritization of actions (which should be done first) |
| multi-turn-sale-to-email | multi_turn | craig | great | 92 | yes | Could specify exact quantity limits to create more urgency |
| multi-turn-budtender-brief | multi_turn | smokey | great | 92 | yes | Could benefit from one example of specific product names from inventory |
| operator-pairings-no-medical | non_data | smokey | great | 92 | yes | Could provide slightly more detail on why each pairing complements the gummies beyond jus... |
| exact-slowest-movers-no-data | non_data | puff | good | 75 | yes | Does not provide any immediate actionable steps without data |

## Launch blockers
- category-margin-mix (POOR 45): The response incorrectly identifies Pre-Roll as the anchor category instead of Flower. Issue: Incorrectly identifies Pre-Roll as the anchor category when Flower has the highest revenue

## Notes
- This runner uses the shared inbox thread-context builder plus inbox persona routing and persona system prompts.
- Briefing-card resilience is covered separately by Jest component tests for partial analytics and check-in payloads.
