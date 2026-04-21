# Thrive Syracuse Inbox Stress Report

- Generated: 2026-04-18T16:30:40.369Z
- Org: org_thrive_syracuse
- Cases run: 25
- Average score: 76.3
- Response-ready cases: 21/25
- Poor or fail: 4
- Failures: 1

## Summary Table
| Case | Kind | Agent | Grade | Score | Ready | Top issue |
| --- | --- | --- | --- | ---: | --- | --- |
| slow-movers-table | data | money_mike | great | 92 | yes | Expiration dates could be more prominently factored into the action plan |
| expiring-inventory-writeoff | data | money_mike | poor | 45 | no | Incorrect margin calculations: Margins are calculated incorrectly throughout the response |
| top-sellers-restock | data | pops | good | 82 | yes | Unsolicited financial advice about margin checks and pricing adjustments |
| category-margin-mix | data | money_mike | good | 80 | yes | Doesn't specify which specific flower products to bundle |
| daily-traffic-gap | data | pops | good | 82 | yes | Could provide more specific timing recommendations for staff shift changes |
| competitor-price-response | data | ezal | great | 92 | yes | No specific timeline suggested for implementing price matches |
| review-queue-priority | data | mrs_parker | great | 90 | yes | Could provide slightly more detail on what specific solutions to offer for Taylor M. |
| checkin-daily-actions | data | mrs_parker | good | 80 | yes | Could be more specific about exact timing for each action |
| campaign-follow-up | data | craig | good | 86 | yes | none |
| customer-segments-winback | data | mrs_parker | good | 78 | yes | Could provide more specific timing recommendations for the campaign |
| loyalty-enrollment-gap | data | mrs_parker | good | 82 | yes | Lacks specific implementation steps for each recommendation |
| owner-briefing-summary | data | pops | great | 92 | yes | No mention of the high-priority emails that need attention before opening |
| weekend-flash-sale | non_data | money_mike | fail | 20 | no | Contains medical claim about 'immunity boost' which is a prohibited marketing term |
| compliant-sms-draft | non_data | craig | poor | 40 | no | Failed to provide a single SMS draft as explicitly requested |
| one-star-review-reply | non_data | smokey | good | 75 | yes | Lacks specificity about the concrete steps being taken to address wait times |
| beginner-budtender-talking-points | non_data | smokey | good | 82 | yes | More practical examples would improve actionability |
| vendor-day-plan | non_data | craig | poor | 45 | no | Completely ignores the specific operational question about preparing for the floor team |
| owner-daily-briefing-no-data | non_data | puff | good | 75 | yes | Fails to provide any actionable information or value since the prompt specifically asked ... |
| differentiate-thrive | non_data | ezal | good | 80 | yes | Lacks specific examples tailored to Syracuse market |
| no-verified-competitor-data | non_data | ezal | great | 90 | yes | Could have been slightly more specific about what makes data 'verified' |
| partial-table-analysis | data | money_mike | great | 95 | yes | None significant |
| multi-turn-sale-to-email | multi_turn | craig | acceptable | 65 | yes | Doesn't use specific business data from the original prompt |
| multi-turn-budtender-brief | multi_turn | smokey | great | 90 | yes | Could benefit from examples of specific strains that fit the criteria |
| operator-pairings-no-medical | non_data | smokey | great | 95 | yes | None - this response fully meets the requirements |
| exact-slowest-movers-no-data | non_data | puff | good | 75 | yes | Failed to note that this was a stress test case specifically about handling no data |

## Launch blockers
- expiring-inventory-writeoff (POOR 45): The response uses incorrect margin calculations and doesn't properly address the expiring inventory triage. Issue: Incorrect margin calculations: Margins are calculated incorrectly throughout the response
- weekend-flash-sale (FAIL 20): Response contains medical claims and wellness assertions that violate compliance guidelines. Issue: Contains medical claim about 'immunity boost' which is a prohibited marketing term
- compliant-sms-draft (POOR 40): Response provided multiple options but failed to select one as requested. Issue: Failed to provide a single SMS draft as explicitly requested
- vendor-day-plan (POOR 45): The response ignores specific operational focus areas and overgeneralizes with marketing content. Issue: Completely ignores the specific operational question about preparing for the floor team

## Notes
- This runner uses the shared inbox thread-context builder plus inbox persona routing and persona system prompts.
- Briefing-card resilience is covered separately by Jest component tests for partial analytics and check-in payloads.
