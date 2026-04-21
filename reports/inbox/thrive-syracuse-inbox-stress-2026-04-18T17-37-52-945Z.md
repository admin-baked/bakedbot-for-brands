# Thrive Syracuse Inbox Stress Report

- Generated: 2026-04-18T17:37:52.945Z
- Org: org_thrive_syracuse
- Cases run: 25
- Average score: 80.1
- Response-ready cases: 23/25
- Poor or fail: 2
- Failures: 1

## Summary Table
| Case | Kind | Agent | Grade | Score | Ready | Top issue |
| --- | --- | --- | --- | ---: | --- | --- |
| slow-movers-table | data | money_mike | good | 85 | yes | The discount recommendation for MFNY Hash Burger lacks a specific discount amount or perc... |
| expiring-inventory-writeoff | data | money_mike | good | 78 | yes | Incorrectly calculated negative margin for MFNY Rainbow Beltz (retail $48 vs cost $24.50,... |
| top-sellers-restock | data | pops | great | 92 | yes | Could provide slightly more detail on how to adjust order quantities |
| category-margin-mix | data | money_mike | good | 75 | yes | Does not calculate the actual margin impact of the bundle |
| daily-traffic-gap | data | pops | great | 92 | yes | Could provide more specific product suggestions for the bundle |
| competitor-price-response | data | ezal | great | 92 | yes | No mention of potential profit margin impact of price matching |
| review-queue-priority | data | mrs_parker | great | 92 | yes | No specific compensation types mentioned |
| checkin-daily-actions | data | mrs_parker | good | 82 | yes | No mention of the 41% email consent rate which could be leveraged |
| campaign-follow-up | data | craig | fail | 23 | no | Contains unsupported medical/functionality claims about terpenes |
| customer-segments-winback | data | mrs_parker | good | 78 | yes | Failed to consider other segments despite having clear data on all segments |
| loyalty-enrollment-gap | data | mrs_parker | good | 82 | yes | No specific next steps or timeline implementation |
| owner-briefing-summary | data | pops | great | 90 | yes | Could have included a brief suggestion on how to address the Day-3 review sequence bottle... |
| weekend-flash-sale | non_data | money_mike | good | 75 | yes | No specific product examples for Thrive Syracuse |
| compliant-sms-draft | non_data | craig | good | 75 | yes | Subject line with 'roll call' is a bit vague |
| one-star-review-reply | non_data | smokey | good | 82 | yes | Lacks specific timeframe for when improvements will be implemented |
| beginner-budtender-talking-points | non_data | smokey | great | 92 | yes | Terpene section could be slightly more simplified for absolute beginners |
| vendor-day-plan | non_data | craig | poor | 45 | no | Ignores core operational preparation needed for vendor day |
| owner-daily-briefing-no-data | non_data | puff | acceptable | 75 | yes | Doesn't provide any actionable insights without data |
| differentiate-thrive | non_data | ezal | good | 78 | yes | No specific Syracuse market data incorporated |
| no-verified-competitor-data | non_data | ezal | great | 95 | yes | None - this response perfectly handles the stress case |
| partial-table-analysis | data | money_mike | great | 92 | yes | No specific mention of compliance considerations for promotions |
| multi-turn-sale-to-email | multi_turn | craig | great | 90 | yes | SMS could benefit from slightly more structured compliance messaging |
| multi-turn-budtender-brief | multi_turn | smokey | good | 83 | yes | Missing specific strain examples for budtenders to reference |
| operator-pairings-no-medical | non_data | smokey | great | 90 | yes | No specific data was provided to ground the response, but this was expected for this non_... |
| exact-slowest-movers-no-data | non_data | puff | acceptable | 70 | yes | Did not address the 'exact-slowest-movers-no-data' scenario explicitly |

## Launch blockers
- campaign-follow-up (FAIL 23): Response fails compliance requirements with unsupported terpene claims and cannot be used for launch. Issue: Contains unsupported medical/functionality claims about terpenes
- vendor-day-plan (POOR 45): Response focuses on marketing while ignoring operational preparation needs. Issue: Ignores core operational preparation needed for vendor day

## Notes
- This runner uses the shared inbox thread-context builder plus inbox persona routing and persona system prompts.
- Briefing-card resilience is covered separately by Jest component tests for partial analytics and check-in payloads.
