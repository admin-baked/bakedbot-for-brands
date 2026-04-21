# Thrive Syracuse Inbox Stress Report

- Generated: 2026-04-18T16:57:16.531Z
- Org: org_thrive_syracuse
- Cases run: 25
- Average score: 77.4
- Response-ready cases: 21/25
- Poor or fail: 4
- Failures: 2

## Summary Table
| Case | Kind | Agent | Grade | Score | Ready | Top issue |
| --- | --- | --- | --- | ---: | --- | --- |
| slow-movers-table | data | money_mike | great | 92 | yes | Could have included more specific discount percentages where appropriate |
| expiring-inventory-writeoff | data | money_mike | good | 78 | yes | Incorrect margin calculations (showed 48% margin for MFNY when actual is ~49%) |
| top-sellers-restock | data | pops | great | 92 | yes | The 'Alert for Money Mike' section seems out of place and unnecessary |
| category-margin-mix | data | money_mike | good | 75 | yes | Lacks detailed margin analysis of the proposed bundle |
| daily-traffic-gap | data | pops | great | 92 | yes | The 3 PM hour (8 orders) is actually lower than 2 PM (9 orders), so the softest window is... |
| competitor-price-response | data | ezal | great | 92 | yes | No explicit mention of how to measure success post-adjustments |
| review-queue-priority | data | mrs_parker | great | 95 | yes | Minor opportunity to specify concrete timeframes for responses beyond just 'within 24 hou... |
| checkin-daily-actions | data | mrs_parker | good | 78 | yes | Includes unsupported assertion about mood-enhancing products |
| campaign-follow-up | data | craig | poor | 42 | no | Contains compliance red flag with unsubstantiated performance claims (60% boost in open r... |
| customer-segments-winback | data | mrs_parker | great | 92 | yes | No specific timeline for the win-back push |
| loyalty-enrollment-gap | data | mrs_parker | good | 82 | yes | Could better explain why Saturday's rate was higher |
| owner-briefing-summary | data | pops | great | 92 | yes | Doesn't mention the 12:30 PM vendor meeting or unread high-priority emails |
| weekend-flash-sale | non_data | money_mike | fail | 20 | no | Completely ignores the stress case requirement to provide a weekend flash sale idea |
| compliant-sms-draft | non_data | craig | poor | 45 | no | SMS drafts are too long for SMS format |
| one-star-review-reply | non_data | smokey | good | 80 | yes | Doesn't offer specific compensation or resolution steps |
| beginner-budtender-talking-points | non_data | smokey | great | 92 | yes | Terpene section could be simplified further for absolute beginners |
| vendor-day-plan | non_data | craig | great | 95 | yes | No mention of vendor communication timeline or requirements |
| owner-daily-briefing-no-data | non_data | puff | good | 75 | yes | Could have been more specific about why this data matters for business decisions |
| differentiate-thrive | non_data | ezal | great | 85 | yes | No specific data about nearby competitors mentioned (though this was acceptable per promp... |
| no-verified-competitor-data | non_data | ezal | great | 92 | yes | Could be slightly more concise in the explanation |
| partial-table-analysis | data | money_mike | good | 78 | yes | Could have been more specific about implementing the promotions |
| multi-turn-sale-to-email | multi_turn | craig | good | 82 | yes | Lacks personalization beyond [Customer Name] placeholder |
| multi-turn-budtender-brief | multi_turn | smokey | good | 82 | yes | No specific product examples or strain names could make it more actionable |
| operator-pairings-no-medical | non_data | smokey | good | 82 | yes | Could include more specific timing recommendations for when to suggest each pairing |
| exact-slowest-movers-no-data | non_data | puff | fail | 25 | no | Invented specific inventory data that wasn't provided |

## Launch blockers
- campaign-follow-up (POOR 42): Response provides some analysis but includes compliance issues, uses projections without data support, and makes unsubstantiated performance claims. Issue: Contains compliance red flag with unsubstantiated performance claims (60% boost in open rates, 30% increase in repeat purchases)
- weekend-flash-sale (FAIL 20): Response fails to provide a flash sale idea despite the stress case specifically requesting one. Issue: Completely ignores the stress case requirement to provide a weekend flash sale idea
- compliant-sms-draft (POOR 45): SMS drafts are compliant but too lengthy and include an inappropriate upsell. Issue: SMS drafts are too long for SMS format
- exact-slowest-movers-no-data (FAIL 25): Response invented inventory data that wasn't provided in the prompt. Issue: Invented specific inventory data that wasn't provided

## Notes
- This runner uses the shared inbox thread-context builder plus inbox persona routing and persona system prompts.
- Briefing-card resilience is covered separately by Jest component tests for partial analytics and check-in payloads.
