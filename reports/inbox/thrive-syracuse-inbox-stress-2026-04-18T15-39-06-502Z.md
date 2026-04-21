# Thrive Syracuse Inbox Stress Report

- Generated: 2026-04-18T15:39:06.502Z
- Org: org_thrive_syracuse
- Cases run: 25
- Average score: 78.0
- Response-ready cases: 21/25
- Poor or fail: 4
- Failures: 0

## Summary Table
| Case | Kind | Agent | Grade | Score | Ready | Top issue |
| --- | --- | --- | --- | ---: | --- | --- |
| slow-movers-table | data | money_mike | good | 82 | yes | Pricing calculations for discounted items don't match the original data |
| expiring-inventory-writeoff | data | money_mike | good | 82 | yes | Lack of clear timeline implementation plan for the recommendations |
| top-sellers-restock | data | pops | great | 92 | yes | Minor calculation inconsistency (showed 1.67 days for MFNY Hash Burger but rounded to 1.6... |
| category-margin-mix | data | money_mike | good | 78 | yes | Doesn't address the 'slower concentrate inventory' aspect directly |
| daily-traffic-gap | data | pops | great | 92 | yes | No explicit mention of tracking metrics to measure the effectiveness of these moves |
| competitor-price-response | data | ezal | great | 90 | yes | No mention of potential margin impact calculations |
| review-queue-priority | data | mrs_parker | great | 92 | yes | Could provide more specific examples of concrete solutions for Taylor M. |
| checkin-daily-actions | data | mrs_parker | great | 92 | yes | Could have quantified potential impact of each action more specifically |
| campaign-follow-up | data | craig | poor | 45 | no | Ignores the loyalty SMS click rate and revenue data |
| customer-segments-winback | data | mrs_parker | great | 90 | yes | Could benefit from more specific timing recommendations for the campaign |
| loyalty-enrollment-gap | data | mrs_parker | good | 86 | yes | none |
| owner-briefing-summary | data | pops | great | 92 | yes | Could be slightly more specific on what actions to take for each item |
| weekend-flash-sale | non_data | money_mike | acceptable | 75 | yes | Doesn't use any specific inventory data as requested in prompt |
| compliant-sms-draft | non_data | craig | poor | 35 | no | Did not provide a single SMS draft as specifically requested |
| one-star-review-reply | non_data | smokey | great | 90 | yes | Slightly generic explanation about 'higher than usual order volumes' without specific ope... |
| beginner-budtender-talking-points | non_data | smokey | great | 92 | yes | Could add a brief point about potency labeling and product selection |
| vendor-day-plan | non_data | craig | poor | 35 | no | Did not address the specific question about inbox preparation |
| owner-daily-briefing-no-data | non_data | puff | good | 75 | yes | Template format might be too time-consuming for a quick daily briefing |
| differentiate-thrive | non_data | ezal | good | 78 | yes | Lacks specific Syracuse market knowledge or competitor data |
| no-verified-competitor-data | non_data | ezal | great | 90 | yes | Could have slightly more emphasis on the importance of verified data |
| partial-table-analysis | data | money_mike | good | 78 | yes | Bundle suggestions are somewhat vague without knowing what other products are available |
| multi-turn-sale-to-email | multi_turn | craig | good | 75 | yes | Generic closing language 'Stay lifted' may not be appropriate depending on local regulati... |
| multi-turn-budtender-brief | multi_turn | smokey | good | 82 | yes | Overgeneralized strain examples (some are hybrids with varying effects) |
| operator-pairings-no-medical | non_data | smokey | good | 87 | yes | none |
| exact-slowest-movers-no-data | non_data | puff | poor | 45 | no | Ignores the prompt's information that no data is available |

## Launch blockers
- campaign-follow-up (POOR 45): The response provides useful campaign analysis but fails to fully utilize the provided data and contains compliance issues. Issue: Ignores the loyalty SMS click rate and revenue data
- compliant-sms-draft (POOR 35): Response provided multiple creative options but failed to provide a single, compliant SMS draft as requested. Issue: Did not provide a single SMS draft as specifically requested
- vendor-day-plan (POOR 35): The response ignores the specific prompt about inbox preparation and focuses on marketing strategy with a sales pitch. Issue: Did not address the specific question about inbox preparation
- exact-slowest-movers-no-data (POOR 45): The response completely ignores that no data was provided and asks for more data instead. Issue: Ignores the prompt's information that no data is available

## Notes
- This runner uses the shared inbox thread-context builder plus inbox persona routing and persona system prompts.
- Briefing-card resilience is covered separately by Jest component tests for partial analytics and check-in payloads.
