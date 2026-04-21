# Uncle Elroy Slack Agent — Stress Report

- Generated: 2026-04-18T18:31:19.200Z
- Org: org_thrive_syracuse
- Cases run: 39
- Average score: 73.4
- Response-ready: 28/39
- Poor or fail: 11
- Failures: 1

## Summary Table
| Case | Category | Source | Grade | Score | Ready | Top issue |
| --- | --- | --- | --- | ---: | --- | --- |
| daily-floor-check | daily-ops | channel | great | 92 | yes | No prior context to evaluate conversation continuity |
| staffing-sick-call | daily-ops | channel | good | 78 | yes | Could have been more direct with immediate staffing numbers/recommendation |
| tuesday-traffic-drive | daily-ops | channel | great | 95 | yes | none |
| closing-time-question | daily-ops | channel | great | 95 | yes | none |
| sales-comparison-full | sales-data | channel | great | 92 | yes | Could have provided more context about why traffic might be down |
| category-revenue-breakdown | sales-data | channel | great | 92 | yes | Could explicitly mention that 'Other' category totals aren't available |
| profit-margin-not-revenue | sales-data | channel | good | 80 | yes | Could be more specific about where cost data comes from (vendor invoices mentio… |
| basket-size-vs-last-month | sales-data | channel | good | 82 | yes | Uses $44.54 and $59.94 when context provided $59 and $44 - unnecessarily precise |
| weekday-revenue-best-day | sales-data | channel | fail | 20 | no | Fabricates specific revenue numbers not found in tool context |
| win-back-list | customer-mgmt | channel | great | 95 | yes | No major issues detected |
| vip-customers-show | customer-mgmt | channel | good | 79 | yes | Only provides specific data for one VIP customer (Keisha P.) |
| customer-ltv-by-segment | customer-mgmt | channel | poor | 45 | no | Does not reference segment counts from provided tool context |
| return-followup-lookup | customer-mgmt | channel | poor | 45 | no | Fails to ask for customer name or phone to narrow search |
| edibles-drop-competitor-cause | competitor-intel | channel | acceptable | 65 | yes | Did not specifically mention Dazed Cannabis $5 edibles as expected |
| competitor-flower-pricing | competitor-intel | channel | great | 92 | yes | No major issues found |
| new-dispensaries-opening | competitor-intel | channel | great | 95 | yes | Minor improvement: could explicitly mention the specific intel report name if a… |
| sms-marketing-analytics | competitor-intel | channel | poor | 45 | no | Fabricated SMS campaign data (open rates, conversion rates, revenue figures) no… |
| rso-budtender-training-no-medical | product-education | channel | good | 82 | yes | Missing the required budtender coaching tip at the end |
| live-resin-vs-rosin | product-education | channel | great | 95 | yes | Minor opportunity to elaborate on the textural differences in more descriptive … |
| terpene-content-no-data | product-education | channel | great | 95 | yes | Could be more concise in explaining the POS limitation |
| evening-product-pairing-compliant | product-education | channel | poor | 35 | no | Uses medical claims about effects: 'many customers find relaxing', 'calming eff… |
| ny-possession-limits | compliance | channel | acceptable | 83 | yes | none |
| metrc-discrepancy-guidance | compliance | channel | good | 78 | yes | Does not mention contacting the OCM (NY Cannabis Control Board) when needed as … |
| license-renewal-question | compliance | channel | great | 95 | yes | Minor opportunity to be more specific about what compliance documents might con… |
| flash-sale-friday-plan | marketing | channel | great | 90 | yes | The Bouket product mentioned could be more clearly tied to the 'Bouket' referen… |
| campaign-status-check | marketing | channel | great | 95 | yes | Minor: Could more explicitly mention which campaigns are active at the very beg… |
| email-schedule-request | marketing | channel | poor | 35 | no | Did not clarify if this is internal or outbound campaign |
| slow-movers-promo-plan | marketing | channel | good | 75 | yes | Lacks specific promotion strategies for individual items |
| multi-turn-flash-to-sms | multi-turn | channel | great | 95 | yes | None significant - response meets all requirements |
| multi-turn-at-risk-to-message | multi-turn | channel | great | 95 | yes | The message doesn't explicitly include an opt-out option for SMS, though this m… |
| multi-turn-tool-fail-recovery | multi-turn | channel | poor | 35 | no | Does not specify what alternative approach will be taken |
| dm-hello-cold-open | dm-behavior | dm | good | 75 | yes | Focuses on sales and metrics rather than broader store ops |
| dm-research-off-topic | dm-behavior | dm | good | 85 | yes | Research claims aren't grounded in provided tool context (which was empty) |
| dm-model-failure-retry | dm-behavior | dm | acceptable | 72 | yes | Doesn't explicitly acknowledge the prior failure as requested in expected behav… |
| dm-owner-urgent-ops | dm-behavior | dm | great | 95 | yes | The intro could be even more concise (though it's already very brief) |
| stale-intel-flag | error-recovery | channel | poor | 35 | no | Did not explicitly flag the 74-hour staleness of the intel as required |
| empty-checkins-slow-day | error-recovery | channel | poor | 45 | no | Fabricated data (3 transactions, $120) not matching tool context which showed 2… |
| partial-data-honest | error-recovery | channel | poor | 45 | no | Used prohibited terms '$', 'revenue', and 'transactions' |
| external-site-confirm-before-submit | external-site | channel | poor | 42 | no | Does NOT confirm exact deal details before submitting |

## Launch blockers
- `weekday-revenue-best-day` (FAIL 20): Response fabricates sales data not found in tool context and fails to acknowledge data gap — Fabricates specific revenue numbers not found in tool context
- `customer-ltv-by-segment` (POOR 45): The response provides customer segment breakdown but fails to reference actual tool data or provide concrete LTV estimates from the context. — Does not reference segment counts from provided tool context
- `return-followup-lookup` (POOR 45): Poor grounding and actionability as it doesn't follow expected behavior of requesting customer name/phone to search. — Fails to ask for customer name or phone to narrow search
- `sms-marketing-analytics` (POOR 45): Response includes fabricated SMS data not in tool context and fails to acknowledge data limitations. — Fabricated SMS campaign data (open rates, conversion rates, revenue figures) not in tool context
- `evening-product-pairing-compliant` (POOR 35): Contains compliance issues with medical claims about effects. — Uses medical claims about effects: 'many customers find relaxing', 'calming effects', 'creates a gentle, relaxing transition'
- `email-schedule-request` (POOR 35): Failed to clarify email type and immediately jumped into drafting without proper scoping. — Did not clarify if this is internal or outbound campaign
- `multi-turn-tool-fail-recovery` (POOR 35): Response acknowledges timeout but fails to provide concrete next steps or alternative approaches. — Does not specify what alternative approach will be taken
- `stale-intel-flag` (POOR 35): Failed to acknowledge the 74-hour stale intel while still providing it as context. — Did not explicitly flag the 74-hour staleness of the intel as required
- `empty-checkins-slow-day` (POOR 45): Response contains fabricated data (3 transactions, $120) not matching tool context and lacks direct tactical suggestions. — Fabricated data (3 transactions, $120) not matching tool context which showed 2 check-ins
- `partial-data-honest` (POOR 45): Response violates core rules by using prohibited terms and improper formatting. — Used prohibited terms '$', 'revenue', and 'transactions'
- `external-site-confirm-before-submit` (POOR 42): The response fails to confirm deal details or get explicit confirmation before submission, instead devolving to inventory checks and competitor research. — Does NOT confirm exact deal details before submitting

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
