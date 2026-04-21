# Thrive Syracuse Inbox Stress Report

- Generated: 2026-04-18T17:08:07.646Z
- Org: org_thrive_syracuse
- Cases run: 25
- Average score: 79.8
- Response-ready cases: 22/25
- Poor or fail: 3
- Failures: 0

## Summary Table
| Case | Kind | Agent | Grade | Score | Ready | Top issue |
| --- | --- | --- | --- | ---: | --- | --- |
| slow-movers-table | data | money_mike | great | 92 | yes | The calculated margin for Ayrloom Blackberry (58.3%) appears incorrect - should be 58.3% ... |
| expiring-inventory-writeoff | data | money_mike | good | 82 | yes | Did not explicitly acknowledge the expiration dates in the analysis |
| top-sellers-restock | data | pops | great | 92 | yes | Unnecessary reference to 'Money Mike' without context of who this person is |
| category-margin-mix | data | money_mike | good | 82 | yes | Didn't explicitly address the 'anchor category' focus mentioned in expectedFocus |
| daily-traffic-gap | data | pops | great | 95 | yes | Could potentially suggest multiple operational moves to cover different scenarios |
| competitor-price-response | data | ezal | good | 85 | yes | The response does not clearly structure next steps. |
| review-queue-priority | data | mrs_parker | great | 92 | yes | Slightly more detailed explanation for why positive reviews are deprioritized would be he... |
| checkin-daily-actions | data | mrs_parker | great | 92 | yes | Could potentially add more detail on how to identify the 'happy' mood segment |
| campaign-follow-up | data | craig | poor | 38 | no | Ignores specific revenue targets mentioned in the prompt |
| customer-segments-winback | data | mrs_parker | good | 82 | yes | Could provide more specific timeline for win-back push |
| loyalty-enrollment-gap | data | mrs_parker | good | 80 | yes | No specific numeric targets for improvement beyond 'raise capture rate' |
| owner-briefing-summary | data | pops | good | 78 | yes | Response is slightly longer than requested 'three things' format |
| weekend-flash-sale | non_data | money_mike | poor | 45 | no | Fails to provide one concrete flash sale idea as requested |
| compliant-sms-draft | non_data | craig | poor | 45 | no | Did not provide a single SMS as explicitly requested |
| one-star-review-reply | non_data | smokey | good | 85 | yes | Could provide more immediate actionable steps to address the customer's concerns |
| beginner-budtender-talking-points | non_data | smokey | great | 95 | yes | Minor opportunity: could briefly mention how to help first-timers identify their starting... |
| vendor-day-plan | non_data | craig | good | 82 | yes | No specific business data integrated (could reference current inventory levels, customer ... |
| owner-daily-briefing-no-data | non_data | puff | good | 78 | yes | Does not leverage any existing data (though none was provided) |
| differentiate-thrive | non_data | ezal | good | 85 | yes | Lacks specific data about nearby dispensaries' offerings |
| no-verified-competitor-data | non_data | ezal | good | 87 | yes | none |
| partial-table-analysis | data | money_mike | good | 78 | yes | Didn't consider Days On Hand thresholds that might trigger automatic actions |
| multi-turn-sale-to-email | multi_turn | craig | good | 78 | yes | No personalization based on purchase history |
| multi-turn-budtender-brief | multi_turn | smokey | good | 85 | yes | Could benefit from brief rationale for why terpene profiles matter |
| operator-pairings-no-medical | non_data | smokey | great | 92 | yes | Could benefit from more specific guidance on timing of consumption |
| exact-slowest-movers-no-data | non_data | puff | acceptable | 70 | yes | Didn't leverage the 'exact-slowest-movers-no-data' case information |

## Launch blockers
- campaign-follow-up (POOR 38): The response ignores specific revenue targets and list fatigue concerns, contains unsupported medical claims, and lacks concrete implementation details. Issue: Ignores specific revenue targets mentioned in the prompt
- weekend-flash-sale (POOR 45): The response provides a general bundle concept but fails to deliver a concrete flash sale idea without using requested data. Issue: Fails to provide one concrete flash sale idea as requested
- compliant-sms-draft (POOR 45): The response provided multiple options but failed to deliver a single compliant SMS as requested. Issue: Did not provide a single SMS as explicitly requested

## Notes
- This runner uses the shared inbox thread-context builder plus inbox persona routing and persona system prompts.
- Briefing-card resilience is covered separately by Jest component tests for partial analytics and check-in payloads.
