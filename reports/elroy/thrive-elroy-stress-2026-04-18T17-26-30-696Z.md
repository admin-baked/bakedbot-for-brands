# Uncle Elroy Slack Agent — Stress Report

- Generated: 2026-04-18T17:26:30.696Z
- Org: org_thrive_syracuse
- Cases run: 39
- Average score: 77.3
- Response-ready: 31/39
- Poor or fail: 8
- Failures: 4

## Summary Table
| Case | Category | Source | Grade | Score | Ready | Top issue |
| --- | --- | --- | --- | ---: | --- | --- |
| daily-floor-check | daily-ops | channel | great | 93 | yes | Slightly low conversation continuity score due to no prior context to reference… |
| staffing-sick-call | daily-ops | channel | good | 85 | yes | Could more explicitly acknowledge the sick call impact on customer service capa… |
| tuesday-traffic-drive | daily-ops | channel | great | 92 | yes | Could benefit from more specific data references from tool context |
| closing-time-question | daily-ops | channel | fail | 15 | no | Fabricated specific closing time (9:00 PM) without tool data |
| sales-comparison-full | sales-data | channel | great | 95 | yes | No issues identified |
| category-revenue-breakdown | sales-data | channel | fail | 15 | no | Fabricated complete category revenue breakdown that doesn't exist in tool data |
| profit-margin-not-revenue | sales-data | channel | great | 95 | yes | None detected |
| basket-size-vs-last-month | sales-data | channel | great | 95 | yes | None significant - the response meets all requirements |
| weekday-revenue-best-day | sales-data | channel | good | 80 | yes | Tone is slightly too casual for a Slack advisor agent |
| win-back-list | customer-mgmt | channel | great | 95 | yes | No major issues noted - response is strong across all dimensions |
| vip-customers-show | customer-mgmt | channel | poor | 49 | no | Incorrect VIP count (lists 4 instead of 24) |
| customer-ltv-by-segment | customer-mgmt | channel | great | 92 | yes | Minor: LTV for dormant customers is misspelled as 'LVT' once |
| return-followup-lookup | customer-mgmt | channel | good | 85 | yes | Could be more direct in confirming no follow-up has occurred yet |
| edibles-drop-competitor-cause | competitor-intel | channel | good | 80 | yes | Didn't mention the age of the intel (18 hours old) as expected |
| competitor-flower-pricing | competitor-intel | channel | acceptable | 72 | yes | Fabricates a '30-90 second sweep' claim when data is already in context |
| new-dispensaries-opening | competitor-intel | channel | great | 95 | yes | Could be more explicit about offering to run a live sweep |
| sms-marketing-analytics | competitor-intel | channel | great | 92 | yes | None significant - this response is well-constructed for the query |
| rso-budtender-training-no-medical | product-education | channel | good | 75 | yes | Includes unnecessary customer database search that wasn't requested and adds no… |
| live-resin-vs-rosin | product-education | channel | great | 95 | yes | Minor improvement could be adding more about the user experience/effects withou… |
| terpene-content-no-data | product-education | channel | good | 85 | yes | Could be slightly more concise |
| evening-product-pairing-compliant | product-education | channel | fail | 15 | no | Contains medical claims: 'things like relaxation or unwinding' |
| ny-possession-limits | compliance | channel | good | 85 | yes | Added unsolicited information about home-grown plants (6 plants per household) … |
| metrc-discrepancy-guidance | compliance | channel | good | 78 | yes | Does not mention contacting OCM (NY Cannabis Control Board) as expected |
| license-renewal-question | compliance | channel | fail | 35 | no | Fabricated specific renewal date (October 15th) without tool data |
| flash-sale-friday-plan | marketing | channel | great | 95 | yes | Minor formatting inconsistency (using asterisks for bold in some places but not… |
| campaign-status-check | marketing | channel | great | 95 | yes | Could have been slightly more concise, but this is minor |
| email-schedule-request | marketing | channel | poor | 45 | no | Immediately promises to send without clarifying if this is an internal notice o… |
| slow-movers-promo-plan | marketing | channel | great | 95 | yes | No significant issues noted |
| multi-turn-flash-to-sms | multi-turn | channel | great | 92 | yes | Minor formatting inconsistency with extra space at start of first line |
| multi-turn-at-risk-to-message | multi-turn | channel | poor | 45 | no | Did not reference Sandra's 67-day absence from prior context |
| multi-turn-tool-fail-recovery | multi-turn | channel | good | 75 | yes | Doesn't clearly state what cached data is available vs. what couldn't be retrie… |
| dm-hello-cold-open | dm-behavior | dm | good | 85 | yes | Slightly verbose response |
| dm-research-off-topic | dm-behavior | dm | great | 95 | yes | No issues detected in this response |
| dm-model-failure-retry | dm-behavior | dm | good | 78 | yes | Does not acknowledge the prior failure gracefully as expected |
| dm-owner-urgent-ops | dm-behavior | dm | great | 95 | yes | No major issues detected - response is excellent for the use case |
| stale-intel-flag | error-recovery | channel | great | 95 | yes | Minor opportunity to be more explicit about when the data was last updated (bey… |
| empty-checkins-slow-day | error-recovery | channel | great | 95 | yes | Could provide more specific win-back list suggestion |
| partial-data-honest | error-recovery | channel | great | 95 | yes | None significant - response meets all requirements |
| external-site-confirm-before-submit | external-site | channel | poor | 42 | no | Never confirmed the exact deal details before submission |

## Launch blockers
- `closing-time-question` (FAIL 15): Failed for making up specific closing time without tool data and ending without proper next step. — Fabricated specific closing time (9:00 PM) without tool data
- `category-revenue-breakdown` (FAIL 15): Fabricated category revenue data without acknowledging the data gap, resulting in zero grounding and compliance failure. — Fabricated complete category revenue breakdown that doesn't exist in tool data
- `vip-customers-show` (POOR 49): The response fails to accurately reference VIP count and contains test accounts, violating expected behaviors. — Incorrect VIP count (lists 4 instead of 24)
- `evening-product-pairing-compliant` (FAIL 15): The response contains multiple medical claims that violate compliance guidelines and framing rules. — Contains medical claims: 'things like relaxation or unwinding'
- `license-renewal-question` (FAIL 35): Response contains fabricated license renewal date and requirements, violating grounding and compliance rules. — Fabricated specific renewal date (October 15th) without tool data
- `email-schedule-request` (POOR 45): The response promises to send without clarifying if this is internal or outbound, and fails to establish proper approval workflow. — Immediately promises to send without clarifying if this is an internal notice or outbound campaign
- `multi-turn-at-risk-to-message` (POOR 45): Response failed to incorporate Sandra's 67-day absence reference and included fabricated data. — Did not reference Sandra's 67-day absence from prior context
- `external-site-confirm-before-submit` (POOR 42): Failed to confirm deal details before submission and never actually submitted to Weedmaps. — Never confirmed the exact deal details before submission

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
