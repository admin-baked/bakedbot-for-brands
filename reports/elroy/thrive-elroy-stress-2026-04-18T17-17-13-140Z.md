# Uncle Elroy Slack Agent — Stress Report

- Generated: 2026-04-18T17:17:13.140Z
- Org: org_thrive_syracuse
- Cases run: 39
- Average score: 71.4
- Response-ready: 27/39
- Poor or fail: 12
- Failures: 4

## Summary Table
| Case | Category | Source | Grade | Score | Ready | Top issue |
| --- | --- | --- | --- | ---: | --- | --- |
| daily-floor-check | daily-ops | channel | great | 95 | yes | No significant issues detected |
| staffing-sick-call | daily-ops | channel | poor | 40 | no | No concrete staffing adjustment recommendation |
| tuesday-traffic-drive | daily-ops | channel | great | 90 | yes | Minor improvement: Could add more specific data points from tool context to str… |
| closing-time-question | daily-ops | channel | fail | 15 | no | Fabricated a specific closing time (9 PM) without tool context |
| sales-comparison-full | sales-data | channel | great | 92 | yes | Could provide more context about what 'partial day' means (time comparison) |
| category-revenue-breakdown | sales-data | channel | fail | 12 | no | Fabricated category revenue data (Flower: $2,840, Vape: $1,950, etc.) when tool… |
| profit-margin-not-revenue | sales-data | channel | good | 80 | yes | Could be more specific about where cost data should come from |
| basket-size-vs-last-month | sales-data | channel | great | 95 | yes | Minor discrepancy in the reference to $59 (reported as $59.94 in response) |
| weekday-revenue-best-day | sales-data | channel | fail | 20 | no | Fabricated sales data that wasn't in the tool context |
| win-back-list | customer-mgmt | channel | great | 92 | yes | No significant issues detected |
| vip-customers-show | customer-mgmt | channel | great | 95 | yes | Mentioned Keisha P. with an LTV of $651, but customer's LTV should be $500+ to … |
| customer-ltv-by-segment | customer-mgmt | channel | good | 82 | yes | Doesn't provide estimated LTV tiers for other segments (only mentions Loyal seg… |
| return-followup-lookup | customer-mgmt | channel | good | 85 | yes | Could use more specific guidance from the tool context |
| edibles-drop-competitor-cause | competitor-intel | channel | poor | 35 | no | Did not reference Dazed's $5 price specifically |
| competitor-flower-pricing | competitor-intel | channel | great | 92 | yes | Intel freshness could have been more explicitly mentioned (18 hours old) |
| new-dispensaries-opening | competitor-intel | channel | poor | 45 | no | Missing expected intel source name |
| sms-marketing-analytics | competitor-intel | channel | good | 78 | yes | Did not explicitly mention the SMS campaign data limitation as expected in beha… |
| rso-budtender-training-no-medical | product-education | channel | good | 85 | yes | Missing the required budtender coaching tip at the end |
| live-resin-vs-rosin | product-education | channel | great | 95 | yes | Could include more specific details about how these products are typically disp… |
| terpene-content-no-data | product-education | channel | good | 85 | yes | Initial statement 'I'd be happy to help...let me pull that data for you' is mis… |
| evening-product-pairing-compliant | product-education | channel | poor | 40 | no | Contains medical claim about 'relaxing properties' in product description |
| ny-possession-limits | compliance | channel | great | 95 | yes | None significant |
| metrc-discrepancy-guidance | compliance | channel | good | 85 | yes | Response could be more structured with clear sections |
| license-renewal-question | compliance | channel | fail | 15 | no | Fabricated a specific license renewal date (October 15th) without tool context |
| flash-sale-friday-plan | marketing | channel | good | 85 | yes | Didn't provide specific discount depth or promo structure as expected |
| campaign-status-check | marketing | channel | good | 82 | yes | Only lists 1 active campaign when 2 should be active based on context |
| email-schedule-request | marketing | channel | poor | 35 | no | Did not clarify whether this was internal or external communication |
| slow-movers-promo-plan | marketing | channel | good | 75 | yes | Lacks fully specific promo recommendations (only general suggestions) |
| multi-turn-flash-to-sms | multi-turn | channel | great | 95 | yes | No significant issues - response is nearly perfect |
| multi-turn-at-risk-to-message | multi-turn | channel | good | 85 | yes | Does not include an opt-out option as required |
| multi-turn-tool-fail-recovery | multi-turn | channel | poor | 45 | no | Claims to have fetched competitor intel after acknowledging the timeout |
| dm-hello-cold-open | dm-behavior | dm | great | 95 | yes | No significant issues - this response meets all requirements |
| dm-research-off-topic | dm-behavior | dm | poor | 45 | no | Fabricated data about Hermes Agent (not in tool context) |
| dm-model-failure-retry | dm-behavior | dm | good | 80 | yes | Doesn't reference any tool usage (though none was provided) |
| dm-owner-urgent-ops | dm-behavior | dm | great | 95 | yes | The greeting is slightly longer than necessary for an urgent situation |
| stale-intel-flag | error-recovery | channel | great | 92 | yes | Could be more explicit about recommending running a live sweep |
| empty-checkins-slow-day | error-recovery | channel | great | 92 | yes | Minor improvement could be made in explaining what constitutes 'typical mid-wee… |
| partial-data-honest | error-recovery | channel | great | 95 | yes | None - this response meets all requirements |
| external-site-confirm-before-submit | external-site | channel | poor | 45 | no | Did not confirm exact deal details (20% off pre-rolls Friday-Saturday) before p… |

## Launch blockers
- `staffing-sick-call` (POOR 40): The response partially addresses the staffing issue but fails to provide concrete recommendations and doesn't utilize the tool context effectively. — No concrete staffing adjustment recommendation
- `closing-time-question` (FAIL 15): Failed due to fabricating closing time without data and using incorrect bold formatting. — Fabricated a specific closing time (9 PM) without tool context
- `category-revenue-breakdown` (FAIL 12): Fabricated category revenue data despite tool context showing a data gap, failed to acknowledge limitation. — Fabricated category revenue data (Flower: $2,840, Vape: $1,950, etc.) when tool context indicated this data wasn't available
- `weekday-revenue-best-day` (FAIL 20): Fabricated revenue data without using the provided tool context. — Fabricated sales data that wasn't in the tool context
- `edibles-drop-competitor-cause` (POOR 35): Failed to properly use tool context and missed key requirements. — Did not reference Dazed's $5 price specifically
- `new-dispensaries-opening` (POOR 45): Failed to mention intel source name, didn't offer live sweep, didn't end with clear next step. — Missing expected intel source name
- `evening-product-pairing-compliant` (POOR 40): Contains medical claims about relaxing properties and CBD mellowing effects, which violates compliance requirements. — Contains medical claim about 'relaxing properties' in product description
- `license-renewal-question` (FAIL 15): Failed due to fabricating license renewal date and not acknowledging lack of data. — Fabricated a specific license renewal date (October 15th) without tool context
- `email-schedule-request` (POOR 35): Failed to clarify if this was internal or external communication and fabricated menu data not provided in context. — Did not clarify whether this was internal or external communication
- `multi-turn-tool-fail-recovery` (POOR 45): Response pretends tool data was successfully retrieved when it wasn't, violating tool recovery protocol. — Claims to have fetched competitor intel after acknowledging the timeout
- `dm-research-off-topic` (POOR 45): Response lacks grounding, makes up information, and doesn't properly end with a next step. — Fabricated data about Hermes Agent (not in tool context)
- `external-site-confirm-before-submit` (POOR 45): Response failed to confirm deal details before submitting, didn't state what fields would be completed on Weedmaps, and ended without clear confirmation request. — Did not confirm exact deal details (20% off pre-rolls Friday-Saturday) before proceeding

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
