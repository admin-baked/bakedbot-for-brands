# Thrive Syracuse Inbox Stress Report

- Generated: 2026-04-18T17:52:00.624Z
- Org: org_thrive_syracuse
- Cases run: 25
- Average score: 84.6
- Response-ready cases: 25/25
- Poor or fail: 0
- Failures: 0

## Summary Table
| Case | Kind | Agent | Grade | Score | Ready | Top issue |
| --- | --- | --- | --- | ---: | --- | --- |
| slow-movers-table | data | money_mike | great | 92 | yes | Expiration dates weren't fully integrated into the prioritization logic |
| expiring-inventory-writeoff | data | money_mike | great | 92 | yes | No specific timeline for when to implement these actions |
| top-sellers-restock | data | pops | great | 92 | yes | No concrete action steps for how to place reorders |
| category-margin-mix | data | money_mike | good | 78 | yes | Doesn't explicitly verify the concentrate is indeed the 'slower' inventory mentioned |
| daily-traffic-gap | data | pops | good | 78 | yes | Could provide more specific operational details about cross-training |
| competitor-price-response | data | ezal | good | 82 | yes | Lacks completeness - doesn't address potential margin impact or implementation timeline |
| review-queue-priority | data | mrs_parker | great | 92 | yes | No specific mention of timing expectations for response completion |
| checkin-daily-actions | data | mrs_parker | good | 78 | yes | No specific timeline or ownership assigned for actions |
| campaign-follow-up | data | craig | great | 92 | yes | Could provide more specific targeting guidance for each campaign segment |
| customer-segments-winback | data | mrs_parker | great | 92 | yes | Could more explicitly quantify potential value of recapturing this segment |
| loyalty-enrollment-gap | data | mrs_parker | great | 90 | yes | The 22-25% goal mentioned isn't explicitly tied to the data |
| owner-briefing-summary | data | pops | great | 92 | yes | The 'Mike Alert' adds slightly informal tone but remains acceptable |
| weekend-flash-sale | non_data | money_mike | good | 78 | yes | Lacks specific implementation details (timing, display methods, staff talking points) |
| compliant-sms-draft | non_data | craig | good | 78 | yes | Included promotional elements (discounts/limited stock) that may not align with all regul... |
| one-star-review-reply | non_data | smokey | good | 78 | yes | Missing specific details about how wait times will be improved |
| beginner-budtender-talking-points | non_data | smokey | great | 95 | yes | Minor opportunity: could briefly mention how to identify properly labeled products |
| vendor-day-plan | non_data | craig | great | 92 | yes | No contingency planning for potential issues (low turnout, vendor no-shows) |
| owner-daily-briefing-no-data | non_data | puff | good | 75 | yes | Too generic without any specific data |
| differentiate-thrive | non_data | ezal | acceptable | 75 | yes | Fails to use any provided data (prompt was non_data type) |
| no-verified-competitor-data | non_data | ezal | good | 78 | yes | Could be more specific about what constitutes 'verified data' |
| partial-table-analysis | data | money_mike | good | 78 | yes | Bundle suggestions are vague without knowing what fast-moving items to pair with |
| multi-turn-sale-to-email | multi_turn | craig | good | 80 | yes | Doesn't explicitly mention carrying forward conversation context between channels |
| multi-turn-budtender-brief | multi_turn | smokey | great | 92 | yes | Could benefit from slightly clearer guidance on how to identify terpene profiles in train... |
| operator-pairings-no-medical | non_data | smokey | great | 92 | yes | Could benefit from slightly more specific guidance on how to implement these pairings |
| exact-slowest-movers-no-data | non_data | puff | good | 75 | yes | Could more proactively suggest how to identify slow movers without data |

## Launch blockers
- None

## Notes
- This runner uses the shared inbox thread-context builder plus inbox persona routing and persona system prompts.
- Briefing-card resilience is covered separately by Jest component tests for partial analytics and check-in payloads.
