# Thrive Syracuse Inbox Stress Report

- Generated: 2026-04-18T17:18:10.904Z
- Org: org_thrive_syracuse
- Cases run: 25
- Average score: 81.0
- Response-ready cases: 23/25
- Poor or fail: 2
- Failures: 1

## Summary Table
| Case | Kind | Agent | Grade | Score | Ready | Top issue |
| --- | --- | --- | --- | ---: | --- | --- |
| slow-movers-table | data | money_mike | great | 92 | yes | Could have provided more specific bundling suggestions for the top priority items |
| expiring-inventory-writeoff | data | money_mike | good | 80 | yes | No timeline for implementing recommendations |
| top-sellers-restock | data | pops | great | 92 | yes | Slightly informal reference to 'MONEY MIKE' might not align with all dispensary brand voi... |
| category-margin-mix | data | money_mike | good | 78 | yes | Did not calculate the expected impact on overall margin |
| daily-traffic-gap | data | pops | great | 92 | yes | Minor opportunity to quantify the 'nearly 50% lower' claim with exact percentages |
| competitor-price-response | data | ezal | great | 92 | yes | No implementation timeline or urgency indicators for the price changes |
| review-queue-priority | data | mrs_parker | great | 92 | yes | No specific template offered despite mentioning the possibility |
| checkin-daily-actions | data | mrs_parker | good | 78 | yes | Lacks specific implementation details for how to address Day-3 reviews |
| campaign-follow-up | data | craig | fail | 25 | no | Contains compliance red flags with medical claims about terpenes and effects |
| customer-segments-winback | data | mrs_parker | great | 92 | yes | Could provide more specific offer examples for the At-risk segment |
| loyalty-enrollment-gap | data | mrs_parker | great | 92 | yes | Could have included specific metrics targets for improvement |
| owner-briefing-summary | data | pops | great | 92 | yes | No mention of vendor meeting or unread emails |
| weekend-flash-sale | non_data | money_mike | good | 78 | yes | Lacks specific product recommendations for Thrive Syracuse |
| compliant-sms-draft | non_data | craig | acceptable | 75 | yes | Pushy upsell pitch at the end detracts from professional service |
| one-star-review-reply | non_data | smokey | good | 83 | yes | Lacks immediate tangible offer to compensate or resolve the customer's frustration |
| beginner-budtender-talking-points | non_data | smokey | great | 92 | yes | Terpene discussion could be simplified even more for absolute beginners |
| vendor-day-plan | non_data | craig | poor | 35 | no | Fails to address operational preparations for the floor team |
| owner-daily-briefing-no-data | non_data | puff | good | 78 | yes | Too generic for an owner's daily briefing |
| differentiate-thrive | non_data | ezal | good | 80 | yes | Lacks specific competitive intelligence about nearby dispensaries |
| no-verified-competitor-data | non_data | ezal | great | 95 | yes | Could potentially offer more specific tools or methods for competitor price tracking |
| partial-table-analysis | data | money_mike | good | 75 | yes | Missed potential seasonal factors affecting inventory |
| multi-turn-sale-to-email | multi_turn | craig | good | 78 | yes | Missing critical implementation details like customer segmentation logic |
| multi-turn-budtender-brief | multi_turn | smokey | great | 92 | yes | Could add specific strain examples to make even more concrete |
| operator-pairings-no-medical | non_data | smokey | great | 92 | yes | Could have provided slightly more variety in pairing types (edible+flower, edible+vape, e... |
| exact-slowest-movers-no-data | non_data | puff | good | 75 | yes | Didn't use any provided data (which was expected as this was a no-data case) |

## Launch blockers
- campaign-follow-up (FAIL 25): Response fails due to compliance issues with medical claims and improper sales pitch. Issue: Contains compliance red flags with medical claims about terpenes and effects
- vendor-day-plan (POOR 35): Response ignores core operational focus and includes promotional language with potential compliance issues. Issue: Fails to address operational preparations for the floor team

## Notes
- This runner uses the shared inbox thread-context builder plus inbox persona routing and persona system prompts.
- Briefing-card resilience is covered separately by Jest component tests for partial analytics and check-in payloads.
