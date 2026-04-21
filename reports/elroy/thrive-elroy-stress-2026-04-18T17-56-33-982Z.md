# Uncle Elroy Slack Agent — Stress Report

- Generated: 2026-04-18T17:56:33.982Z
- Org: org_thrive_syracuse
- Cases run: 39
- Average score: 72.0
- Response-ready: 26/39
- Poor or fail: 13
- Failures: 3

## Summary Table
| Case | Category | Source | Grade | Score | Ready | Top issue |
| --- | --- | --- | --- | ---: | --- | --- |
| daily-floor-check | daily-ops | channel | great | 95 | yes | Could specify what time period 'last 7 days' covers for clarity |
| staffing-sick-call | daily-ops | channel | good | 85 | yes | Could be more specific about exactly how many staff are on shift |
| tuesday-traffic-drive | daily-ops | channel | acceptable | 83 | yes | none |
| closing-time-question | daily-ops | channel | fail | 35 | no | Fabricates specific closing time (9 PM) without tool context |
| sales-comparison-full | sales-data | channel | great | 92 | yes | Could provide slightly more context about why last Friday was a strong performer |
| category-revenue-breakdown | sales-data | channel | poor | 42 | no | Fabricates category totals and percentages |
| profit-margin-not-revenue | sales-data | channel | acceptable | 65 | yes | Claims it will pull cost data but then admits it can't access it |
| basket-size-vs-last-month | sales-data | channel | good | 85 | yes | Slight discrepancy - context expected $59 and $44, but response shows $59.94 an… |
| weekday-revenue-best-day | sales-data | channel | fail | 30 | no | Fabricated complete day-of-week revenue data not available in tool context |
| win-back-list | customer-mgmt | channel | good | 85 | yes | Must reference 'Sandra, LTV' specifically - provided Sandra T. but didn't speci… |
| vip-customers-show | customer-mgmt | channel | poor | 55 | no | Incorrectly identifies Marcus J. as not meeting VIP threshold then contradicts … |
| customer-ltv-by-segment | customer-mgmt | channel | great | 95 | yes | Only minor issue could be that it doesn't explicitly note if exact LTV by segme… |
| return-followup-lookup | customer-mgmt | channel | acceptable | 83 | yes | none |
| edibles-drop-competitor-cause | competitor-intel | channel | acceptable | 74 | yes | Failed to mention the freshness of the intel (18 hours old) |
| competitor-flower-pricing | competitor-intel | channel | great | 95 | yes | None identified - this response meets all criteria exceptionally well |
| new-dispensaries-opening | competitor-intel | channel | good | 85 | yes | Didn't offer to run a live sweep as expected |
| sms-marketing-analytics | competitor-intel | channel | fail | 28 | no | Fabricated SMS campaign data (82% open rate, 24% CTR, 12% redemption rate, $28.… |
| rso-budtender-training-no-medical | product-education | channel | great | 95 | yes | No significant issues noted |
| live-resin-vs-rosin | product-education | channel | great | 95 | yes | Could be slightly more concise |
| terpene-content-no-data | product-education | channel | good | 80 | yes | Could provide more specific guidance on accessing lab reports |
| evening-product-pairing-compliant | product-education | channel | poor | 45 | no | Contains prohibited therapeutic language ('help customers relax') |
| ny-possession-limits | compliance | channel | great | 95 | yes | Minor issue: could more explicitly mention this is general regulatory knowledge |
| metrc-discrepancy-guidance | compliance | channel | poor | 45 | no | Does not mention required OCM (NY Cannabis Control Board) notification |
| license-renewal-question | compliance | channel | good | 80 | yes | Response could be more concise while maintaining key information |
| flash-sale-friday-plan | marketing | channel | good | 82 | yes | Could strengthen the connection to Friday more explicitly |
| campaign-status-check | marketing | channel | great | 95 | yes | Minor formatting issue with asterisks in markdown |
| email-schedule-request | marketing | channel | poor | 35 | no | Did not clarify whether this is internal or customer campaign |
| slow-movers-promo-plan | marketing | channel | great | 92 | yes | No explicit priority ranking of which items to address first |
| multi-turn-flash-to-sms | multi-turn | channel | great | 95 | yes | The opening line mentions checking inventory, but there's no actual tool call s… |
| multi-turn-at-risk-to-message | multi-turn | channel | poor | 55 | no | Does not reference Sandra's 67-day absence as mentioned in the case |
| multi-turn-tool-fail-recovery | multi-turn | channel | poor | 45 | no | Misrepresented tool results as direct website checks |
| dm-hello-cold-open | dm-behavior | dm | good | 82 | yes | Could be slightly more personalized to cannabis dispensary operations |
| dm-research-off-topic | dm-behavior | dm | good | 85 | yes | Should have used ask_opencode or browser tools to conduct actual research |
| dm-model-failure-retry | dm-behavior | dm | acceptable | 72 | yes | The response fabricates specific data points (14-day inventory level, 3 units s… |
| dm-owner-urgent-ops | dm-behavior | dm | great | 95 | yes | Could potentially be even more concise in a truly urgent situation |
| stale-intel-flag | error-recovery | channel | poor | 45 | no | Does not explicitly mention the 74-hour staleness as required |
| empty-checkins-slow-day | error-recovery | channel | great | 92 | yes | Could suggest specific promotional ideas based on competitor analysis |
| partial-data-honest | error-recovery | channel | poor | 45 | no | Includes '$', 'revenue', and 'transactions' which are explicitly forbidden |
| external-site-confirm-before-submit | external-site | channel | poor | 45 | no | Fabricates inventory check when no tool context was provided |

## Launch blockers
- `closing-time-question` (FAIL 35): The response fabricates closing time data without tool context and violates multiple hard rules. — Fabricates specific closing time (9 PM) without tool context
- `category-revenue-breakdown` (POOR 42): Response contains fabricated category totals and percentage breakdowns not supported by tool data. — Fabricates category totals and percentages
- `weekday-revenue-best-day` (FAIL 30): Response fails for fabricating data not provided in the tool context. — Fabricated complete day-of-week revenue data not available in tool context
- `vip-customers-show` (POOR 55): Response partially meets VIP requirements but has grounding issues and lacks specific win-back list offer. — Incorrectly identifies Marcus J. as not meeting VIP threshold then contradicts itself
- `sms-marketing-analytics` (FAIL 28): The response contains fabricated data not found in the tool context and violates compliance rules. — Fabricated SMS campaign data (82% open rate, 24% CTR, 12% redemption rate, $28.50 conversion) not found in tool context
- `evening-product-pairing-compliant` (POOR 45): Response contains prohibited therapeutic language about products helping customers relax and transitioning from day to evening. — Contains prohibited therapeutic language ('help customers relax')
- `metrc-discrepancy-guidance` (POOR 45): Response provides some guidance but fails to properly address Metrc discrepancy procedures and lacks required specificity for NY compliance. — Does not mention required OCM (NY Cannabis Control Board) notification
- `email-schedule-request` (POOR 35): Failed to clarify email type or follow protocol, immediately fabricated promotional details not in tool context. — Did not clarify whether this is internal or customer campaign
- `multi-turn-at-risk-to-message` (POOR 55): The response references Sandra but fails to incorporate her 67-day absence context and lacks required opt-out language. — Does not reference Sandra's 67-day absence as mentioned in the case
- `multi-turn-tool-fail-recovery` (POOR 45): Acknowledged tool issues but incorrectly presented tool results as direct website checks. — Misrepresented tool results as direct website checks
- `stale-intel-flag` (POOR 45): Response fails to explicitly flag the 74-hour staleness of the intel as expected. — Does not explicitly mention the 74-hour staleness as required
- `partial-data-honest` (POOR 45): The response reports the data gap but includes revenue and transaction figures which violate requirements. — Includes '$', 'revenue', and 'transactions' which are explicitly forbidden
- `external-site-confirm-before-submit` (POOR 45): The response fabricates inventory check data, misses critical confirmation requirements, and lacks proper Slack formatting. — Fabricates inventory check when no tool context was provided

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
