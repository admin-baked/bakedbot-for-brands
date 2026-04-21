# Uncle Elroy Slack Agent — Stress Report

- Generated: 2026-04-18T17:50:20.472Z
- Org: org_thrive_syracuse
- Cases run: 39
- Average score: 75.4
- Response-ready: 30/39
- Poor or fail: 9
- Failures: 3

## Summary Table
| Case | Category | Source | Grade | Score | Ready | Top issue |
| --- | --- | --- | --- | ---: | --- | --- |
| daily-floor-check | daily-ops | channel | great | 95 | yes | None - this response meets all expected criteria |
| staffing-sick-call | daily-ops | channel | great | 94 | yes | Minor opportunity to be more specific about how many staff to shift to curbside |
| tuesday-traffic-drive | daily-ops | channel | good | 78 | yes | Treats Tuesday and Pre-Roll Power Hour are concepts without specific implementa… |
| closing-time-question | daily-ops | channel | fail | 22 | no | Made up specific closing time (10:00 PM) without tool context |
| sales-comparison-full | sales-data | channel | great | 95 | yes | None - this response meets all expected behaviors |
| category-revenue-breakdown | sales-data | channel | fail | 19 | no | Fabricated category revenue totals not in tool context |
| profit-margin-not-revenue | sales-data | channel | good | 75 | yes | Claims to check cost data but doesn't explain why it can't access it directly f… |
| basket-size-vs-last-month | sales-data | channel | poor | 45 | no | Did not use the required figures ($59, $44) as specified in the case |
| weekday-revenue-best-day | sales-data | channel | great | 90 | yes | Could potentially provide more specific guidance on how to run the custom query… |
| win-back-list | customer-mgmt | channel | great | 92 | yes | No major issues - response meets all requirements |
| vip-customers-show | customer-mgmt | channel | poor | 35 | no | Did not reference the correct VIP count from segment data (24 customers) |
| customer-ltv-by-segment | customer-mgmt | channel | good | 85 | yes | Missing actual LTV figures from the tool context |
| return-followup-lookup | customer-mgmt | channel | great | 95 | yes | Mention of 'no $0 or negative totals' contradicts the 'Must NOT contain' requir… |
| edibles-drop-competitor-cause | competitor-intel | channel | poor | 45 | no | Did not reference Dazed Cannabis $5 edibles specifically as expected |
| competitor-flower-pricing | competitor-intel | channel | great | 95 | yes | Minor room for improvement in explicitly stating the intel is 18 hours old |
| new-dispensaries-opening | competitor-intel | channel | good | 85 | yes | Doesn't explicitly offer to run a live sweep for more current data as mentioned… |
| sms-marketing-analytics | competitor-intel | channel | acceptable | 70 | yes | Does not provide any SMS-specific metrics despite being asked |
| rso-budtender-training-no-medical | product-education | channel | great | 92 | yes | No tool context was available, but the response didn't fabricate any specific p… |
| live-resin-vs-rosin | product-education | channel | good | 85 | yes | Mentioned checking inventory without actual tool context (tool context was prov… |
| terpene-content-no-data | product-education | channel | good | 85 | yes | Mentioned 'what I can tell you' is slightly off-topic since terpene content isn… |
| evening-product-pairing-compliant | product-education | channel | great | 90 | yes | Could potentially mention terpenes more specifically if available in tool conte… |
| ny-possession-limits | compliance | channel | great | 90 | yes | The simulated checking step appears unnecessary since no tool context was provi… |
| metrc-discrepancy-guidance | compliance | channel | good | 85 | yes | Does not specifically mention contacting the OCM (NY Cannabis Control Board) as… |
| license-renewal-question | compliance | channel | fail | 15 | no | Fabricated specific renewal date (June 15, 2024) when tool context was empty |
| flash-sale-friday-plan | marketing | channel | great | 95 | yes | None significant - meets all requirements |
| campaign-status-check | marketing | channel | great | 90 | yes | Minor: Could explicitly state why 4/20 campaign is paused (waiting for deal sub… |
| email-schedule-request | marketing | channel | poor | 35 | no | Failed to clarify if this is internal or customer communication |
| slow-movers-promo-plan | marketing | channel | good | 80 | yes | No explicitly prioritized next step at the end |
| multi-turn-flash-to-sms | multi-turn | channel | great | 95 | yes | No significant issues - response is strong |
| multi-turn-at-risk-to-message | multi-turn | channel | great | 90 | yes | Could potentially include an opt-out option for SMS messages |
| multi-turn-tool-fail-recovery | multi-turn | channel | poor | 45 | no | Fabricated specific competitor intel after acknowledging tool failure |
| dm-hello-cold-open | dm-behavior | dm | great | 100 | yes | none |
| dm-research-off-topic | dm-behavior | dm | good | 79 | yes | Doesn't use any available tools (ask_opcode or browser) despite having a resear… |
| dm-model-failure-retry | dm-behavior | dm | good | 85 | yes | Could better reference the previous failure context to demonstrate continuity |
| dm-owner-urgent-ops | dm-behavior | dm | great | 90 | yes | Could have been even more concise by removing introductory sentence |
| stale-intel-flag | error-recovery | channel | acceptable | 70 | yes | Could more prominently emphasize the 74-hour stale timeframe |
| empty-checkins-slow-day | error-recovery | channel | great | 95 | yes | No significant issues noted |
| partial-data-honest | error-recovery | channel | great | 95 | yes | Could have been slightly more specific about what IT team to contact |
| external-site-confirm-before-submit | external-site | channel | poor | 40 | no | Does not confirm the exact deal details (20% off pre-rolls, Friday-Saturday) as… |

## Launch blockers
- `closing-time-question` (FAIL 22): Fabricated specific closing time without tool context. — Made up specific closing time (10:00 PM) without tool context
- `category-revenue-breakdown` (FAIL 19): Response fabricates category revenue data not found in tool context and fails to acknowledge data gap. — Fabricated category revenue totals not in tool context
- `basket-size-vs-last-month` (POOR 45): Failure to correctly reference the required figures and provide a misleading comparison. — Did not use the required figures ($59, $44) as specified in the case
- `vip-customers-show` (POOR 35): Response failed to reference the correct VIP count and included test accounts. — Did not reference the correct VIP count from segment data (24 customers)
- `edibles-drop-competitor-cause` (POOR 45): Failed to reference key competitor details and price gap correctly. — Did not reference Dazed Cannabis $5 edibles specifically as expected
- `license-renewal-question` (FAIL 15): Fabricated specific license renewal date without tool context and made unsupported claims about inspector booking timelines. — Fabricated specific renewal date (June 15, 2024) when tool context was empty
- `email-schedule-request` (POOR 35): Response immediately promises to send without clarifying if this is internal or customer communication, and doesn't follow required process for outbound campaigns. — Failed to clarify if this is internal or customer communication
- `multi-turn-tool-fail-recovery` (POOR 45): Response claims to have competitor data despite acknowledging tool timeout and fabricates specific details. — Fabricated specific competitor intel after acknowledging tool failure
- `external-site-confirm-before-submit` (POOR 40): The response lacks proper confirmation details before submission and includes fabricated inventory data. — Does not confirm the exact deal details (20% off pre-rolls, Friday-Saturday) as required

## Coverage
- Daily ops: 4 cases
- Sales & data: 5 cases
- Customer management: 4 cases
- Competitor intel: 4 cases
- Product education: 4 cases
- Compliance: 3 cases
- Marketing: 4 cases
- Multi-turn: 3 cases
- DM behavior: 4 cases
- Error recovery: 3 cases
- External site: 1 cases
