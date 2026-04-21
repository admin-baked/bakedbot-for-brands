# Uncle Elroy Slack Agent — Stress Report

- Generated: 2026-04-18T16:58:41.783Z
- Org: org_thrive_syracuse
- Cases run: 39
- Average score: 74.9
- Response-ready: 29/39
- Poor or fail: 10
- Failures: 3

## Summary Table
| Case | Category | Source | Grade | Score | Ready | Top issue |
| --- | --- | --- | --- | ---: | --- | --- |
| daily-floor-check | daily-ops | channel | great | 92 | yes | None - this response meets all expectations |
| staffing-sick-call | daily-ops | channel | great | 92 | yes | Minor opportunity to be even more specific about how to consolidate stations |
| tuesday-traffic-drive | daily-ops | channel | acceptable | 83 | yes | none |
| closing-time-question | daily-ops | channel | fail | 20 | no | Fabricated specific closing time (9:00 PM) without tool context |
| sales-comparison-full | sales-data | channel | great | 95 | yes | None found - this response meets all criteria |
| category-revenue-breakdown | sales-data | channel | fail | 18 | no | Fabricated category revenue data not provided in tool context |
| profit-margin-not-revenue | sales-data | channel | fail | 25 | no | Claimed to be getting cost data when tool can't provide it |
| basket-size-vs-last-month | sales-data | channel | great | 98 | yes | Minor rounding difference in expected reference points ($44, $59) vs reported v… |
| weekday-revenue-best-day | sales-data | channel | good | 82 | yes | Could have offered to run the custom report more proactively |
| win-back-list | customer-mgmt | channel | great | 92 | yes | Minor compliance concern: Keisha is referred to as 'our VIP' which could be int… |
| vip-customers-show | customer-mgmt | channel | good | 85 | yes | Does not explicitly mention excluding test accounts |
| customer-ltv-by-segment | customer-mgmt | channel | great | 95 | yes | Minor gap in that it doesn't explicitly mention if exact LTV by segment is in t… |
| return-followup-lookup | customer-mgmt | channel | good | 82 | yes | Invents a time range 'last 20 orders' not in tool context |
| edibles-drop-competitor-cause | competitor-intel | channel | good | 85 | yes | Could be more specific about Dazed's $5 pricing (only mentioned $5-$8 range) |
| competitor-flower-pricing | competitor-intel | channel | good | 78 | yes | Used wrong markdown format (should be *bold* not any bold) |
| new-dispensaries-opening | competitor-intel | channel | great | 95 | yes | None significant - this response is nearly perfect for the task |
| sms-marketing-analytics | competitor-intel | channel | acceptable | 83 | yes | none |
| rso-budtender-training-no-medical | product-education | channel | great | 92 | yes | Uses **bold** instead of *bold* for emphasis on 'Important to emphasize potency' |
| live-resin-vs-rosin | product-education | channel | great | 95 | yes | Minor clarification needed on live rosin production - it can be made directly f… |
| terpene-content-no-data | product-education | channel | good | 85 | yes | States 'pulling up inventory data' when terpene content isn't in POS data |
| evening-product-pairing-compliant | product-education | channel | great | 90 | yes | Minor opportunity to provide more specific product characteristics (flavor prof… |
| ny-possession-limits | compliance | channel | poor | 35 | no | Fabricates specific possession limits (3 oz, 24g) without tool context |
| metrc-discrepancy-guidance | compliance | channel | good | 75 | yes | Fabricates data by mentioning 'Sarah in compliance' without tool context |
| license-renewal-question | compliance | channel | poor | 45 | no | Fabricates specific license renewal date (June 15th, 2024) without tool context |
| flash-sale-friday-plan | marketing | channel | good | 82 | yes | Could provide more concrete discount depth suggestions rather than just asking … |
| campaign-status-check | marketing | channel | great | 90 | yes | Could potentially include more specific performance metrics for paused campaign… |
| email-schedule-request | marketing | channel | poor | 45 | no | Does not clarify whether this is internal or external communication |
| slow-movers-promo-plan | marketing | channel | poor | 45 | no | Does not include specific promo strategy per item or category as required |
| multi-turn-flash-to-sms | multi-turn | channel | good | 85 | yes | Draft exceeds 160 character limit (SMS message constraint) |
| multi-turn-at-risk-to-message | multi-turn | channel | poor | 45 | no | Didn't reference Sandra's 67-day absence from previous turn |
| multi-turn-tool-fail-recovery | multi-turn | channel | good | 80 | yes | Did not mention offering cached data as an alternative approach |
| dm-hello-cold-open | dm-behavior | dm | great | 95 | yes | None - exceeds expectations for cold open |
| dm-research-off-topic | dm-behavior | dm | good | 85 | yes | Could have provided immediate value based on known information before promising… |
| dm-model-failure-retry | dm-behavior | dm | good | 85 | yes | No tool context was available, but Elroy proceeded with product information any… |
| dm-owner-urgent-ops | dm-behavior | dm | great | 95 | yes | None - this response meets all criteria perfectly |
| stale-intel-flag | error-recovery | channel | poor | 42 | no | Does not explicitly mention the 74-hour staleness flag |
| empty-checkins-slow-day | error-recovery | channel | great | 95 | yes | No mention of whether Wednesday traffic patterns are typically different |
| partial-data-honest | error-recovery | channel | great | 95 | yes | Minor opportunity to explicitly mention checking the POS system directly as an … |
| external-site-confirm-before-submit | external-site | channel | poor | 40 | no | Does NOT confirm exact deal details back to the user before proceeding |

## Launch blockers
- `closing-time-question` (FAIL 20): Fabricated closing time despite having no tool context to verify store hours. — Fabricated specific closing time (9:00 PM) without tool context
- `category-revenue-breakdown` (FAIL 18): Failed to acknowledge data gap and fabricated category totals not in tool context. — Fabricated category revenue data not provided in tool context
- `profit-margin-not-revenue` (FAIL 25): Failed to provide actual margin analysis, fabricated getting cost data, and didn't address the core question. — Claimed to be getting cost data when tool can't provide it
- `ny-possession-limits` (POOR 35): Response fabricates data not in tool context and fails on multiple dimensions. — Fabricates specific possession limits (3 oz, 24g) without tool context
- `license-renewal-question` (POOR 45): Response fabricates license renewal date despite having no tool context and fails to acknowledge this limitation. — Fabricates specific license renewal date (June 15th, 2024) without tool context
- `email-schedule-request` (POOR 45): The response fails to clarify the nature of the email request and immediately promises to send without proper scope clarification. — Does not clarify whether this is internal or external communication
- `slow-movers-promo-plan` (POOR 45): Response identifies slow-moving inventory but lacks actionable strategy recommendations required by the case. — Does not include specific promo strategy per item or category as required
- `multi-turn-at-risk-to-message` (POOR 45): Fails to reference prior context about Sandra's 67-day absence and includes unnecessary tool checking. — Didn't reference Sandra's 67-day absence from previous turn
- `stale-intel-flag` (POOR 42): Response fails to clearly indicate 74-hour staleness and presents stale data as current without proper qualification. — Does not explicitly mention the 74-hour staleness flag
- `external-site-confirm-before-submit` (POOR 40): Response fails to confirm deal details before submission and doesn't clearly state what it's about to do. — Does NOT confirm exact deal details back to the user before proceeding

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
