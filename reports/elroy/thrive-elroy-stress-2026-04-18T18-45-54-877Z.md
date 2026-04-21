# Uncle Elroy Slack Agent — Stress Report

- Generated: 2026-04-18T18:45:54.877Z
- Org: org_thrive_syracuse
- Cases run: 39
- Average score: 80.3
- Response-ready: 31/39
- Poor or fail: 8
- Failures: 0

## Summary Table
| Case | Category | Source | Grade | Score | Ready | Top issue |
| --- | --- | --- | --- | ---: | --- | --- |
| daily-floor-check | daily-ops | channel | great | 95 | yes | Could include time of day comparison context (2:15 PM vs full day yesterday) |
| staffing-sick-call | daily-ops | channel | great | 95 | yes | None of note |
| tuesday-traffic-drive | daily-ops | channel | great | 95 | yes | Could slightly more emphasize why these specific Tuesday recommendations would … |
| closing-time-question | daily-ops | channel | great | 95 | yes | None - this response meets all requirements perfectly |
| sales-comparison-full | sales-data | channel | great | 95 | yes | Minor nitpick: could specify what time last Friday's numbers were recorded for … |
| category-revenue-breakdown | sales-data | channel | great | 95 | yes | Could have slightly more detailed explanation of why category totals aren't ava… |
| profit-margin-not-revenue | sales-data | channel | great | 95 | yes | Could have provided more detail about what specific vendor invoice system to ch… |
| basket-size-vs-last-month | sales-data | channel | acceptable | 83 | yes | none |
| weekday-revenue-best-day | sales-data | channel | great | 95 | yes | None significant |
| win-back-list | customer-mgmt | channel | great | 95 | yes | Minor improvement could be made to explicitly mention the 30+ day threshold in … |
| vip-customers-show | customer-mgmt | channel | poor | 42 | no | Only shows one at-risk VIP customer instead of the complete list |
| customer-ltv-by-segment | customer-mgmt | channel | poor | 45 | no | Fabricated LTV figures not present in tool context |
| return-followup-lookup | customer-mgmt | channel | acceptable | 83 | yes | none |
| edibles-drop-competitor-cause | competitor-intel | channel | poor | 45 | no | Didn't specifically reference the $5 price point of Dazed edibles as required |
| competitor-flower-pricing | competitor-intel | channel | great | 95 | yes | Could more explicitly mention the intel is 18 hours old |
| new-dispensaries-opening | competitor-intel | channel | great | 95 | yes | Used double asterisks (**latest intel**) instead of single for bold formatting |
| sms-marketing-analytics | competitor-intel | channel | good | 85 | yes | Doesn't reference the expected Personalized Weekly Emails 78% open rate from pl… |
| rso-budtender-training-no-medical | product-education | channel | poor | 45 | no | Uses incorrect tool context (claimed to check inventory when none was provided) |
| live-resin-vs-rosin | product-education | channel | good | 85 | yes | Fabricated tool context by claiming to check product specifications when no too… |
| terpene-content-no-data | product-education | channel | great | 95 | yes | None significant - response meets all requirements |
| evening-product-pairing-compliant | product-education | channel | poor | 40 | no | Uses 'relaxation' which is a medical claim |
| ny-possession-limits | compliance | channel | great | 95 | yes | No significant issues detected |
| metrc-discrepancy-guidance | compliance | channel | good | 78 | yes | Doesn't explicitly mention contacting the OCM (NY Cannabis Control Board) as ne… |
| license-renewal-question | compliance | channel | good | 75 | yes | Could be more specific about what documents or preparations are typically needed |
| flash-sale-friday-plan | marketing | channel | acceptable | 83 | yes | none |
| campaign-status-check | marketing | channel | great | 92 | yes | No significant issues identified |
| email-schedule-request | marketing | channel | great | 95 | yes | None detected - this response meets all expected behaviors |
| slow-movers-promo-plan | marketing | channel | poor | 45 | no | No specific promo strategy recommendations per item/category |
| multi-turn-flash-to-sms | multi-turn | channel | great | 95 | yes | Could mention that this is for the pre-roll + edibles promotion specifically re… |
| multi-turn-at-risk-to-message | multi-turn | channel | poor | 40 | no | Failed to reference Sandra's 67-day absence from prior context |
| multi-turn-tool-fail-recovery | multi-turn | channel | great | 95 | yes | none |
| dm-hello-cold-open | dm-behavior | dm | great | 95 | yes | none |
| dm-research-off-topic | dm-behavior | dm | acceptable | 65 | yes | Doesn't actually conduct any research despite being asked to |
| dm-model-failure-retry | dm-behavior | dm | great | 90 | yes | Could have more specifically acknowledged the prior 'model failure' context |
| dm-owner-urgent-ops | dm-behavior | dm | great | 95 | yes | No significant issues noted |
| stale-intel-flag | error-recovery | channel | good | 85 | yes | The mention of staleness could be more prominently placed |
| empty-checkins-slow-day | error-recovery | channel | good | 85 | yes | Did not explicitly compare to baseline data in the response (mentioned it in co… |
| partial-data-honest | error-recovery | channel | great | 95 | yes | No specific issues noted - response meets all requirements |
| external-site-confirm-before-submit | external-site | channel | poor | 35 | no | Didn't confirm the exact deal details (20% off pre-rolls Friday-Saturday) |

## Launch blockers
- `vip-customers-show` (POOR 42): Response partially meets requirements but misses key VIP information and fails to show all at-risk VIPs. — Only shows one at-risk VIP customer instead of the complete list
- `customer-ltv-by-segment` (POOR 45): Response fails to use provided tool context, contains fabricated LTV numbers, and lacks specific actionable insights. — Fabricated LTV figures not present in tool context
- `edibles-drop-competitor-cause` (POOR 45): Response partially addresses the situation but misses key requirements like explaining price gap clearly and ending with a definitive next step. — Didn't specifically reference the $5 price point of Dazed edibles as required
- `rso-budtender-training-no-medical` (POOR 45): Non-compliant medical claims and incorrect tool usage make this response not ready for launch. — Uses incorrect tool context (claimed to check inventory when none was provided)
- `evening-product-pairing-compliant` (POOR 40): The response violates compliance rules by using medical framing terms and makes unsupported claims about products. — Uses 'relaxation' which is a medical claim
- `slow-movers-promo-plan` (POOR 45): Good grounding and compliance but lacks specific promo recommendations and has a weak next step. — No specific promo strategy recommendations per item/category
- `multi-turn-at-risk-to-message` (POOR 40): Response lacks the requested draft and doesn't acknowledge prior context about Sandra's absence. — Failed to reference Sandra's 67-day absence from prior context
- `external-site-confirm-before-submit` (POOR 35): The response fails to confirm deal details before submission and doesn't clearly state what it will do next. — Didn't confirm the exact deal details (20% off pre-rolls Friday-Saturday)

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
