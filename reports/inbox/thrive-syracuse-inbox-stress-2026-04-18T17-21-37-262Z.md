# Thrive Syracuse Inbox Stress Report

- Generated: 2026-04-18T17:21:37.262Z
- Org: org_thrive_syracuse
- Cases run: 25
- Average score: 77.1
- Response-ready cases: 22/25
- Poor or fail: 3
- Failures: 1

## Summary Table
| Case | Kind | Agent | Grade | Score | Ready | Top issue |
| --- | --- | --- | --- | ---: | --- | --- |
| slow-movers-table | data | money_mike | great | 92 | yes | No consideration of expiration dates in the action plan |
| expiring-inventory-writeoff | data | money_mike | great | 90 | yes | Could have included more markdown alternatives for the high-risk Rainbow Beltz |
| top-sellers-restock | data | pops | great | 92 | yes | Could have provided more specific reorder quantity recommendations |
| category-margin-mix | data | money_mike | good | 75 | yes | Does not explicitly address how to calculate the final bundle price |
| daily-traffic-gap | data | pops | great | 92 | yes | No mention of customer counts vs. orders (which might be useful if available) |
| competitor-price-response | data | ezal | good | 82 | yes | Could provide more reasoning on margin thresholds for when to match vs beat |
| review-queue-priority | data | mrs_parker | great | 92 | yes | Could include more specific metrics for resolution timeline |
| checkin-daily-actions | data | mrs_parker | good | 80 | yes | No specific timing recommendations within the 'before noon' window |
| campaign-follow-up | data | craig | poor | 42 | no | Contains medical claims ('perfect for creative focus') |
| customer-segments-winback | data | mrs_parker | good | 82 | yes | Could better justify why at-risk is prioritized over casual despite smaller size |
| loyalty-enrollment-gap | data | mrs_parker | good | 78 | yes | Could provide more specific tactical recommendations for each identified issue |
| owner-briefing-summary | data | pops | good | 82 | yes | Could provide more specific action steps for addressing the pricing discrepancy |
| weekend-flash-sale | non_data | money_mike | good | 78 | yes | No specific product recommendations since no inventory data was provided |
| compliant-sms-draft | non_data | craig | acceptable | 75 | yes | Includes unnecessary self-promotion of the Specialist Tier service |
| one-star-review-reply | non_data | smokey | good | 75 | yes | Lacks concrete operational steps being taken to fix the issues |
| beginner-budtender-talking-points | non_data | smokey | good | 82 | yes | Terpene profile section makes subtle effect suggestions that could be compliance concerns |
| vendor-day-plan | non_data | craig | good | 78 | yes | Lacks specific details about which vendors will be present |
| owner-daily-briefing-no-data | non_data | puff | good | 82 | yes | Could have provided more context on why certain metrics are important |
| differentiate-thrive | non_data | ezal | good | 78 | yes | Didn't analyze any provided competitor data (though none was given) |
| no-verified-competitor-data | non_data | ezal | great | 92 | yes | Could potentially provide more specific guidance on legality aspects of competitor price ... |
| partial-table-analysis | data | money_mike | great | 92 | yes | The margin calculations appear to be incorrect (57.8%, 64.5%, 53.3% don't match the provi... |
| multi-turn-sale-to-email | multi_turn | craig | poor | 42 | no | Contains compliance red flags: cannabis symbols (🌿🔥) and unverified medical claims ('Yo... |
| multi-turn-budtender-brief | multi_turn | smokey | fail | 0 | no | Contains effects claims (energizing, focus-enhancing) which are not allowed |
| operator-pairings-no-medical | non_data | smokey | good | 82 | yes | Could provide more specific details about why each pairing works |
| exact-slowest-movers-no-data | non_data | puff | great | 92 | yes | None significant - this is a strong response |

## Launch blockers
- campaign-follow-up (POOR 42): Response contains compliance red flags and lacks proper grounding in the provided data. Issue: Contains medical claims ('perfect for creative focus')
- multi-turn-sale-to-email (POOR 42): Response contains marketing red flags and poor compliance with no actionable next steps. Issue: Contains compliance red flags: cannabis symbols (🌿🔥) and unverified medical claims ('Your weekend upgrade')
- multi-turn-budtender-brief (FAIL 0): Response contains multiple compliance red flags with medical claims and unsupported assertions. Issue: Contains effects claims (energizing, focus-enhancing) which are not allowed

## Notes
- This runner uses the shared inbox thread-context builder plus inbox persona routing and persona system prompts.
- Briefing-card resilience is covered separately by Jest component tests for partial analytics and check-in payloads.
