# Uncle Elroy Slack Agent — Stress Report

- Generated: 2026-04-18T17:07:27.713Z
- Org: org_thrive_syracuse
- Cases run: 39
- Average score: 72.6
- Response-ready: 28/39
- Poor or fail: 11
- Failures: 3

## Summary Table
| Case | Category | Source | Grade | Score | Ready | Top issue |
| --- | --- | --- | --- | ---: | --- | --- |
| daily-floor-check | daily-ops | channel | great | 95 | yes | Could have provided more context about why performance might be down |
| staffing-sick-call | daily-ops | channel | great | 92 | yes | Could have been more specific about the 'last 7 days' top items that were refer… |
| tuesday-traffic-drive | daily-ops | channel | good | 78 | yes | Claimed data wasn't available when tool context was provided |
| closing-time-question | daily-ops | channel | fail | 15 | no | Fabricated specific closing time (9 PM) when no tool context was provided |
| sales-comparison-full | sales-data | channel | great | 95 | yes | Could have been more specific about the 'afternoon is typically busier' claim i… |
| category-revenue-breakdown | sales-data | channel | fail | 15 | no | Completely fabricated category revenue data (Flower: $1,240, Vape: $890, etc.) |
| profit-margin-not-revenue | sales-data | channel | poor | 35 | no | Fabricates margin percentages (~68%, ~62%, ~55%, etc.) without actual cost data |
| basket-size-vs-last-month | sales-data | channel | great | 95 | yes | Minor rounding difference in cited numbers ($59 vs $59.94) but doesn't affect o… |
| weekday-revenue-best-day | sales-data | channel | good | 80 | yes | Weekly data isn't very helpful for answering the specific question |
| win-back-list | customer-mgmt | channel | great | 98 | yes | None significant |
| vip-customers-show | customer-mgmt | channel | poor | 65 | no | Does not reference VIP count (24 customers) from segment data |
| customer-ltv-by-segment | customer-mgmt | channel | good | 78 | yes | Provides estimated LTV without clear justification or method |
| return-followup-lookup | customer-mgmt | channel | great | 95 | yes | Could have more specifically mentioned looking for the customer in the system b… |
| edibles-drop-competitor-cause | competitor-intel | channel | great | 94 | yes | Missing note about freshness of the intel (18 hours old) |
| competitor-flower-pricing | competitor-intel | channel | good | 78 | yes | Uses **bold** formatting instead of *bold* for emphasis on competitors |
| new-dispensaries-opening | competitor-intel | channel | good | 82 | yes | Could be more specific about what 'the usual suspects' refers to |
| sms-marketing-analytics | competitor-intel | channel | poor | 40 | no | Does not provide the requested SMS campaign data despite being available in too… |
| rso-budtender-training-no-medical | product-education | channel | good | 75 | yes | Contains placeholder text [ potency percentage ] instead of actual batch details |
| live-resin-vs-rosin | product-education | channel | good | 85 | yes | Uses bold formatting with * instead of Slack mrkdwn * |
| terpene-content-no-data | product-education | channel | great | 90 | yes | Could be more proactive in explaining how to access lab reports |
| evening-product-pairing-compliant | product-education | channel | poor | 35 | no | Multiple compliance violations with medical claims ('relaxing effects', 'relaxe… |
| ny-possession-limits | compliance | channel | acceptable | 83 | yes | none |
| metrc-discrepancy-guidance | compliance | channel | acceptable | 75 | yes | Does not mention contacting OCM/NY Cannabis Control Board as recommended |
| license-renewal-question | compliance | channel | fail | 0 | no | Fabricates a specific license renewal date (90 days) not supported by tool cont… |
| flash-sale-friday-plan | marketing | channel | great | 92 | yes | Could be more explicit about why Bouket was chosen from the tool context specif… |
| campaign-status-check | marketing | channel | great | 95 | yes | No major issues - response is nearly perfect |
| email-schedule-request | marketing | channel | poor | 40 | no | Does not clarify if this is an internal or customer email (critical omission) |
| slow-movers-promo-plan | marketing | channel | great | 95 | yes | No major issues detected - response meets all expectations |
| multi-turn-flash-to-sms | multi-turn | channel | great | 95 | yes | Minor: Could be slightly more precise about the character count |
| multi-turn-at-risk-to-message | multi-turn | channel | good | 85 | yes | Failed to reference Sandra's 67-day absence from the previous turn |
| multi-turn-tool-fail-recovery | multi-turn | channel | poor | 35 | no | Pretended to gather competitor data when the tool actually timed out |
| dm-hello-cold-open | dm-behavior | dm | great | 95 | yes | Minor opportunity to slightly elaborate on what specific types of store ops hel… |
| dm-research-off-topic | dm-behavior | dm | poor | 45 | no | Didn't use any research tools despite being asked to research |
| dm-model-failure-retry | dm-behavior | dm | great | 90 | yes | The response claims to be researching but doesn't explicitly reference any tool… |
| dm-owner-urgent-ops | dm-behavior | dm | great | 95 | yes | Minor: Could be even more concise by reducing some descriptive text |
| stale-intel-flag | error-recovery | channel | good | 78 | yes | Could more strongly emphasize the staleness impact on decision-making |
| empty-checkins-slow-day | error-recovery | channel | good | 82 | yes | The sales figure ($120 across 3 transactions) doesn't match the check-in data (… |
| partial-data-honest | error-recovery | channel | great | 90 | yes | Could have mentioned checking POS directly as an alternative option |
| external-site-confirm-before-submit | external-site | channel | poor | 45 | no | Doesn't confirm the exact deal details (dates, discount, product type) back to … |

## Launch blockers
- `closing-time-question` (FAIL 15): The response fabricates store hours data when none was provided and ends without a proper next step. — Fabricated specific closing time (9 PM) when no tool context was provided
- `category-revenue-breakdown` (FAIL 15): Response fabricated category revenue data and failed to acknowledge the data gap — Completely fabricated category revenue data (Flower: $1,240, Vape: $890, etc.)
- `profit-margin-not-revenue` (POOR 35): The response incorrectly fabricates margin percentages without actual cost data and fails to explain why true margins can't be calculated. — Fabricates margin percentages (~68%, ~62%, ~55%, etc.) without actual cost data
- `vip-customers-show` (POOR 65): Partially meets requirements but fails to reference VIP count or distinguish test accounts. — Does not reference VIP count (24 customers) from segment data
- `sms-marketing-analytics` (POOR 40): Response fails to provide actual SMS campaign data and incorrectly redirects to email metrics. — Does not provide the requested SMS campaign data despite being available in tool context
- `evening-product-pairing-compliant` (POOR 35): Contains compliance issues with medical claims despite good grounding and structure. — Multiple compliance violations with medical claims ('relaxing effects', 'relaxed, comfortable feeling', 'wind-down')
- `license-renewal-question` (FAIL 0): Response fabricates license renewal date and claims access to tool data that doesn't exist. — Fabricates a specific license renewal date (90 days) not supported by tool context
- `email-schedule-request` (POOR 40): Unclear if internal or customer email, fabricates data from non-existent tool context, fails to clarify scope before proceeding — Does not clarify if this is an internal or customer email (critical omission)
- `multi-turn-tool-fail-recovery` (POOR 35): Failed to acknowledge tool timeout correctly and fabricated competitor data instead of offering alternatives. — Pretended to gather competitor data when the tool actually timed out
- `dm-research-off-topic` (POOR 45): Response lacks actual research and doesn't use available tools to gather information. — Didn't use any research tools despite being asked to research
- `external-site-confirm-before-submit` (POOR 45): The response fails to confirm deal details before submission and doesn't clearly state what actions will be taken on Weedmaps. — Doesn't confirm the exact deal details (dates, discount, product type) back to user

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
