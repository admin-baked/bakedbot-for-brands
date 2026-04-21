# Uncle Elroy Slack Agent — Stress Report

- Generated: 2026-04-18T17:35:53.113Z
- Org: org_thrive_syracuse
- Cases run: 39
- Average score: 72.1
- Response-ready: 28/39
- Poor or fail: 11
- Failures: 4

## Summary Table
| Case | Category | Source | Grade | Score | Ready | Top issue |
| --- | --- | --- | --- | ---: | --- | --- |
| daily-floor-check | daily-ops | channel | great | 95 | yes | Minor improvement could be mentioning the dollar gap amount ($857 difference) |
| staffing-sick-call | daily-ops | channel | great | 95 | yes | No significant issues - response is comprehensive and helpful |
| tuesday-traffic-drive | daily-ops | channel | great | 92 | yes | Could have more explicitly framed the recommendations as a cohesive strategy ra… |
| closing-time-question | daily-ops | channel | fail | 20 | no | Fabricated closing time (10 PM) without tool context |
| sales-comparison-full | sales-data | channel | great | 95 | yes | No explicit mention of being below or above target (not applicable in this case) |
| category-revenue-breakdown | sales-data | channel | fail | 20 | no | Fabricated category revenue data (get_category_revenue tool was not provided in… |
| profit-margin-not-revenue | sales-data | channel | poor | 45 | no | Fabricated data by mentioning checking vendor invoices which wasn't in tool con… |
| basket-size-vs-last-month | sales-data | channel | great | 96 | yes | Current day revenue number seems incorrect (28 transactions × $44.54 should be … |
| weekday-revenue-best-day | sales-data | channel | fail | 25 | no | Fabricated complete sales data not present in tool context |
| win-back-list | customer-mgmt | channel | great | 95 | yes | No explicit mention of the tool context usage |
| vip-customers-show | customer-mgmt | channel | good | 78 | yes | Doesn't exclude test accounts from VIP list |
| customer-ltv-by-segment | customer-mgmt | channel | great | 95 | yes | Minor improvement could be made to clarify if exact LTV by segment is in tool r… |
| return-followup-lookup | customer-mgmt | channel | good | 85 | yes | Could be more specific about what tool data was checked |
| edibles-drop-competitor-cause | competitor-intel | channel | acceptable | 75 | yes | Did not mention the freshness of the competitor intel (18 hours old) |
| competitor-flower-pricing | competitor-intel | channel | good | 85 | yes | Doesn't mention BOGO pre-roll deals specifically for Thursday at Vibe |
| new-dispensaries-opening | competitor-intel | channel | poor | 45 | no | Incorrectly used **bold** instead of *bold* formatting |
| sms-marketing-analytics | competitor-intel | channel | poor | 45 | no | Does not reference the 'Personalized Weekly Emails 78% open rate' from playbook… |
| rso-budtender-training-no-medical | product-education | channel | acceptable | 73 | yes | Fabricates specific THC testing percentages (75-80%) not mentioned in tool cont… |
| live-resin-vs-rosin | product-education | channel | good | 82 | yes | No tool context was provided, but response was still informative and accurate |
| terpene-content-no-data | product-education | channel | good | 75 | yes | Includes unrelated top-selling strains data which wasn't requested |
| evening-product-pairing-compliant | product-education | channel | good | 85 | yes | Might be slightly too conservative by not mentioning any effect terms at all |
| ny-possession-limits | compliance | channel | acceptable | 70 | yes | Incorrectly states 25mg THC limit for concentrates instead of correct 24g |
| metrc-discrepancy-guidance | compliance | channel | good | 84 | yes | Claims to check internal compliance docs when no tool context was provided |
| license-renewal-question | compliance | channel | fail | 15 | no | Fabricated license renewal date (November 15th, 2023) and requirements |
| flash-sale-friday-plan | marketing | channel | great | 90 | yes | Could provide more specific competitor context if available in tool data |
| campaign-status-check | marketing | channel | good | 82 | yes | Could be more explicit about '1 active' campaign when tool context shows 3 play… |
| email-schedule-request | marketing | channel | acceptable | 65 | yes | Failed to clarify if this is internal or outbound customer campaign |
| slow-movers-promo-plan | marketing | channel | great | 92 | yes | Could be more specific about the exact discount amounts for the promotion strat… |
| multi-turn-flash-to-sms | multi-turn | channel | great | 95 | yes | No specific issues - response meets all requirements |
| multi-turn-at-risk-to-message | multi-turn | channel | poor | 42 | no | Missing SMS opt-out language which is required by regulations |
| multi-turn-tool-fail-recovery | multi-turn | channel | great | 95 | yes | Minor issue: The phrase 'get you the scoop' is slightly informal but acceptable… |
| dm-hello-cold-open | dm-behavior | dm | great | 95 | yes | none |
| dm-research-off-topic | dm-behavior | dm | good | 75 | yes | No tools were used despite needing to research Hermes Agent |
| dm-model-failure-retry | dm-behavior | dm | poor | 35 | no | Does not acknowledge the prior failure gracefully |
| dm-owner-urgent-ops | dm-behavior | dm | great | 95 | yes | Could be slightly more concise by trimming introductory sentence |
| stale-intel-flag | error-recovery | channel | great | 95 | yes | Minor opportunity to slightly emphasize the staleness impact on pricing analysis |
| empty-checkins-slow-day | error-recovery | channel | poor | 55 | no | Claims to pull more data but doesn't actually present any findings from tools |
| partial-data-honest | error-recovery | channel | good | 85 | yes | Could be more specific about what POS sync gaps mean |
| external-site-confirm-before-submit | external-site | channel | poor | 45 | no | Does not confirm exact deal details back to the user |

## Launch blockers
- `closing-time-question` (FAIL 20): The response fabricates store closing time without tool context and violates multiple hard rules. — Fabricated closing time (10 PM) without tool context
- `category-revenue-breakdown` (FAIL 20): Major fabricating of category revenue data where no tool context was provided. — Fabricated category revenue data (get_category_revenue tool was not provided in context)
- `profit-margin-not-revenue` (POOR 45): Failed to explain why true margin ranking isn't possible without cost data, suggested fabricating data by checking vendor invoices that weren't in tool context, and didn't end with a clear next step. — Fabricated data by mentioning checking vendor invoices which wasn't in tool context
- `weekday-revenue-best-day` (FAIL 25): Fabricated complete day-of-week revenue data instead of acknowledging data gap. — Fabricated complete sales data not present in tool context
- `new-dispensaries-opening` (POOR 45): Response is poorly formatted with incorrect bolding and lacks the required next step about running a live sweep. — Incorrectly used **bold** instead of *bold* formatting
- `sms-marketing-analytics` (POOR 45): The response fails to reference the provided playbook data and fabricates SMS metrics not found in the tool context. — Does not reference the 'Personalized Weekly Emails 78% open rate' from playbook data
- `license-renewal-question` (FAIL 15): Failed due to fabricated license date and refusal to acknowledge tool limitations. — Fabricated license renewal date (November 15th, 2023) and requirements
- `multi-turn-at-risk-to-message` (POOR 42): Missing SMS opt-out, references Sandra but no clear opt-out instruction, lacks action steps for manager. — Missing SMS opt-out language which is required by regulations
- `dm-model-failure-retry` (POOR 35): The response fails to acknowledge the prior failure and makes up information about Hermes Agent not supported by tool context. — Does not acknowledge the prior failure gracefully
- `empty-checkins-slow-day` (POOR 55): Response correctly identifies the traffic decrease but fails to provide actionable suggestions or utilize tool data effectively. — Claims to pull more data but doesn't actually present any findings from tools
- `external-site-confirm-before-submit` (POOR 45): The response fails to confirm deal details, explain submission process, or get explicit confirmation before creating the deal. — Does not confirm exact deal details back to the user

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
