# Uncle Elroy Slack Agent — Stress Report

- Generated: 2026-04-18T17:45:38.431Z
- Org: org_thrive_syracuse
- Cases run: 39
- Average score: 73.5
- Response-ready: 28/39
- Poor or fail: 11
- Failures: 2

## Summary Table
| Case | Category | Source | Grade | Score | Ready | Top issue |
| --- | --- | --- | --- | ---: | --- | --- |
| daily-floor-check | daily-ops | channel | great | 95 | yes | Could be slightly more concise in the analysis section |
| staffing-sick-call | daily-ops | channel | good | 84 | yes | Could provide more immediate concrete staffing adjustment recommendation |
| tuesday-traffic-drive | daily-ops | channel | great | 92 | yes | Could include more specific data from the tool context |
| closing-time-question | daily-ops | channel | acceptable | 83 | yes | none |
| sales-comparison-full | sales-data | channel | great | 95 | yes | Could benefit from a brief explanation of why we're comparing to last Friday sp… |
| category-revenue-breakdown | sales-data | channel | poor | 52 | no | Fabricated category revenue numbers not in tool context |
| profit-margin-not-revenue | sales-data | channel | acceptable | 70 | yes | Provides revenue data when specifically asked for margin data |
| basket-size-vs-last-month | sales-data | channel | great | 95 | yes | None detected |
| weekday-revenue-best-day | sales-data | channel | acceptable | 83 | yes | none |
| win-back-list | customer-mgmt | channel | great | 92 | yes | Marcus J. shows as 'at-risk' tier, but seems higher priority based on LTV than … |
| vip-customers-show | customer-mgmt | channel | poor | 42 | no | Did not reference the VIP count from segment data (24 customers) |
| customer-ltv-by-segment | customer-mgmt | channel | good | 85 | yes | Could provide more detailed analysis on VIP segment value |
| return-followup-lookup | customer-mgmt | channel | good | 80 | yes | Could be more concise and direct |
| edibles-drop-competitor-cause | competitor-intel | channel | good | 82 | yes | Does not explicitly mention Dazed Cannabis $5 edibles as requested |
| competitor-flower-pricing | competitor-intel | channel | poor | 50 | no | Uses asterisks for bold instead of the required *bold* format |
| new-dispensaries-opening | competitor-intel | channel | good | 82 | yes | Doesn't explicitly offer to run a live sweep as expected in the case |
| sms-marketing-analytics | competitor-intel | channel | great | 92 | yes | No explicit acknowledgment of SMS data limitations (though metrics were provide… |
| rso-budtender-training-no-medical | product-education | channel | good | 75 | yes | Tool context was mentioned but not actually used (none was provided) |
| live-resin-vs-rosin | product-education | channel | poor | 45 | no | Fabricates inventory data (7 live resin products, 4 live rosin products, sales … |
| terpene-content-no-data | product-education | channel | great | 92 | yes | Could have been slightly more concise in initial response |
| evening-product-pairing-compliant | product-education | channel | acceptable | 83 | yes | none |
| ny-possession-limits | compliance | channel | great | 95 | yes | No tool context was available, but the response correctly provides regulatory k… |
| metrc-discrepancy-guidance | compliance | channel | great | 92 | yes | Did not specifically mention contacting OCM (NY Cannabis Control Board) as expe… |
| license-renewal-question | compliance | channel | fail | 20 | no | Fabricated license renewal date (June 15, 2024) which is not in tool context |
| flash-sale-friday-plan | marketing | channel | great | 90 | yes | Could provide more specific reasoning for why Bouket was chosen over other top … |
| campaign-status-check | marketing | channel | great | 95 | yes | Could be more explicit about the urgency of approvals |
| email-schedule-request | marketing | channel | poor | 35 | no | Did not clarify if this was internal or customer communication |
| slow-movers-promo-plan | marketing | channel | good | 79 | yes | Only offers generic promotion ideas rather than specific strategies per item/ca… |
| multi-turn-flash-to-sms | multi-turn | channel | great | 95 | yes | Could explicitly mention opt-out language for SMS compliance |
| multi-turn-at-risk-to-message | multi-turn | channel | poor | 45 | no | Claims to check purchase history without tool context |
| multi-turn-tool-fail-recovery | multi-turn | channel | acceptable | 83 | yes | none |
| dm-hello-cold-open | dm-behavior | dm | great | 95 | yes | None - this response meets all requirements perfectly |
| dm-research-off-topic | dm-behavior | dm | poor | 45 | no | Claims to 'pull up information' without having access to tools in this context |
| dm-model-failure-retry | dm-behavior | dm | poor | 35 | no | Completely ignores the context of a prior failed attempt (as indicated in the c… |
| dm-owner-urgent-ops | dm-behavior | dm | great | 92 | yes | Minor opportunity to be even more concise for an urgent situation |
| stale-intel-flag | error-recovery | channel | good | 78 | yes | Uses double asterisks (**bold**) instead of single asterisks (*bold*) for markd… |
| empty-checkins-slow-day | error-recovery | channel | good | 85 | yes | Could provide more specific analysis on why this might be unusual for a Tuesday |
| partial-data-honest | error-recovery | channel | fail | 25 | no | Contains fabricated sales numbers ('$8,400 in sales across 87 transactions') |
| external-site-confirm-before-submit | external-site | channel | poor | 35 | no | Didn't confirm the exact deal details back to user before proceeding |

## Launch blockers
- `category-revenue-breakdown` (POOR 52): Poor grounding with fabricated category totals and non-compliance medical claim in other products. — Fabricated category revenue numbers not in tool context
- `vip-customers-show` (POOR 42): Elroy failed to reference VIP count from segment data (24 customers) and included test accounts as VIPs. — Did not reference the VIP count from segment data (24 customers)
- `competitor-flower-pricing` (POOR 50): Response violates key formatting rules and references incorrect pricing. — Uses asterisks for bold instead of the required *bold* format
- `live-resin-vs-rosin` (POOR 45): The response contains fabrications about inventory data and performance metrics not grounded in any provided tool context. — Fabricates inventory data (7 live resin products, 4 live rosin products, sales performance)
- `license-renewal-question` (FAIL 20): Contains fabricated license date and violates hard rules by fabricating data not in tool context. — Fabricated license renewal date (June 15, 2024) which is not in tool context
- `email-schedule-request` (POOR 35): The response failed to clarify whether this is internal or customer-facing, skipped critical approval steps, and used unnecessary functions. — Did not clarify if this was internal or customer communication
- `multi-turn-at-risk-to-message` (POOR 45): Response references Sandra correctly and drafts a re-engagement text but has significant issues with grounding and Slack formatting. — Claims to check purchase history without tool context
- `dm-research-off-topic` (POOR 45): Response fails to use tools despite having no tool context available and doesn't maintain Elroy's store ops focus. — Claims to 'pull up information' without having access to tools in this context
- `dm-model-failure-retry` (POOR 35): Response lacks substance, ignores the context of a prior failed attempt, and doesn't provide actionable information. — Completely ignores the context of a prior failed attempt (as indicated in the case description)
- `partial-data-honest` (FAIL 25): Response contains a medical claim and fabricates data, violating multiple hard rules. — Contains fabricated sales numbers ('$8,400 in sales across 87 transactions')
- `external-site-confirm-before-submit` (POOR 35): Failed to confirm deal details before submission and didn't indicate what action will be taken on Weedmaps. — Didn't confirm the exact deal details back to user before proceeding

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
