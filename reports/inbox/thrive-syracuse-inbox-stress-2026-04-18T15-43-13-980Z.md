# Thrive Syracuse Inbox Stress Report

- Generated: 2026-04-18T15:43:13.980Z
- Org: org_thrive_syracuse
- Cases run: 25
- Average score: 84.2
- Response-ready cases: 25/25
- Poor or fail: 0
- Failures: 0

## Summary Table
| Case | Kind | Agent | Grade | Score | Ready | Top issue |
| --- | --- | --- | --- | ---: | --- | --- |
| slow-movers-table | data | money_mike | good | 78 | yes | Ranked the items in a somewhat arbitrary order without a clear decision framework |
| expiring-inventory-writeoff | data | money_mike | great | 92 | yes | No specific mention of compliance considerations for promotions or bundles |
| top-sellers-restock | data | pops | great | 92 | yes | Minor redundancy in stating replacement arrival timing for Matter. Blue Dream |
| category-margin-mix | data | money_mike | good | 75 | yes | Doesn't address potential inventory quantities for each product in the bundle |
| daily-traffic-gap | data | pops | great | 92 | yes | Minor opportunity to quantify the traffic gap more precisely (e.g., percentage difference... |
| competitor-price-response | data | ezal | great | 95 | yes | No mention of potential profit margin impact on price changes |
| review-queue-priority | data | mrs_parker | great | 92 | yes | No specific metrics for what constitutes 'VIP treatment' for the 5-star review |
| checkin-daily-actions | data | mrs_parker | good | 78 | yes | No specific implementation details for SMS consent optimization strategy |
| campaign-follow-up | data | craig | good | 75 | yes | Included an unsolicited sales pitch at the end |
| customer-segments-winback | data | mrs_parker | good | 80 | yes | Could provide more specific rationale for VIP as second priority |
| loyalty-enrollment-gap | data | mrs_parker | great | 92 | yes | Could suggest specific tactics for improving sign-up rates |
| owner-briefing-summary | data | pops | great | 92 | yes | Slightly exceeds the 'keep it short' instruction |
| weekend-flash-sale | non_data | money_mike | good | 75 | yes | No specific implementation steps or timeline |
| compliant-sms-draft | non_data | craig | good | 78 | yes | Unsolicited upsell pitch at the end undermines the focused response |
| one-star-review-reply | non_data | smokey | good | 78 | yes | Generic response template without personalization beyond placeholders |
| beginner-budtender-talking-points | non_data | smokey | great | 92 | yes | Minor formatting inconsistency with some brackets [Emoji] not properly rendered |
| vendor-day-plan | non_data | craig | good | 78 | yes | Contains marketing hype language that could be problematic in regulated cannabis markets |
| owner-daily-briefing-no-data | non_data | puff | good | 80 | yes | No proactive suggestions for alternative data sources |
| differentiate-thrive | non_data | ezal | good | 78 | yes | Lacks specific Syracuse market data about competitors |
| no-verified-competitor-data | non_data | ezal | great | 90 | yes | Could have emphasized importance of having verified data before making pricing decisions |
| partial-table-analysis | data | money_mike | good | 78 | yes | Didn't acknowledge that we're working with partial/incomplete data |
| multi-turn-sale-to-email | multi_turn | craig | good | 82 | yes | Missing personalization tokens beyond first name |
| multi-turn-budtender-brief | multi_turn | smokey | good | 80 | yes | Could include specific strain examples or product IDs |
| operator-pairings-no-medical | non_data | smokey | great | 92 | yes | Could benefit from slightly more variety in pairing options |
| exact-slowest-movers-no-data | non_data | puff | great | 92 | yes | Could have slightly more emphasis on why this data is needed |

## Launch blockers
- None

## Notes
- This runner uses the shared inbox thread-context builder plus inbox persona routing and persona system prompts.
- Briefing-card resilience is covered separately by Jest component tests for partial analytics and check-in payloads.
