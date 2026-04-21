# Uncle Elroy Slack Agent — Stress Report

- Generated: 2026-04-18T18:07:47.629Z
- Org: org_thrive_syracuse
- Cases run: 39
- Average score: 81.9
- Response-ready: 34/39
- Poor or fail: 5
- Failures: 0

## Summary Table
| Case | Category | Source | Grade | Score | Ready | Top issue |
| --- | --- | --- | --- | ---: | --- | --- |
| daily-floor-check | daily-ops | channel | great | 95 | yes | Minor formatting inconsistency (mix of * and ** for emphasis) |
| staffing-sick-call | daily-ops | channel | good | 83 | yes | Ends with a question rather than a definitive next step as required by Elroy's … |
| tuesday-traffic-drive | daily-ops | channel | acceptable | 83 | yes | none |
| closing-time-question | daily-ops | channel | acceptable | 78 | yes | Response is slightly wordy and could be more concise |
| sales-comparison-full | sales-data | channel | great | 95 | yes | Minor: Could provide more specific suggestions for addressing the sales gap |
| category-revenue-breakdown | sales-data | channel | great | 95 | yes | Minor opportunity to explicitly mention the 'Other' category limitation |
| profit-margin-not-revenue | sales-data | channel | good | 78 | yes | Initially claims it will pull cost data despite not having access |
| basket-size-vs-last-month | sales-data | channel | good | 82 | yes | Used decimals (.54, .94) instead of rounding to whole numbers as referenced in … |
| weekday-revenue-best-day | sales-data | channel | acceptable | 75 | yes | Slightly wordy response could be more concise |
| win-back-list | customer-mgmt | channel | great | 92 | yes | Minor opportunity to add more specific outreach suggestions beyond SMS/call |
| vip-customers-show | customer-mgmt | channel | poor | 45 | no | Missing VIP count (should mention 24 customers) |
| customer-ltv-by-segment | customer-mgmt | channel | acceptable | 75 | yes | Fabricates LTV figures not present in tool context |
| return-followup-lookup | customer-mgmt | channel | good | 85 | yes | Doesn't explicitly ask for customer name or phone to narrow search |
| edibles-drop-competitor-cause | competitor-intel | channel | good | 75 | yes | Doesn't mention the freshness of the intel (18 hours old) |
| competitor-flower-pricing | competitor-intel | channel | great | 95 | yes | Minor typo: '$34/3.3.5g' should likely be '$34/3.5g' |
| new-dispensaries-opening | competitor-intel | channel | good | 85 | yes | Missing the expected offer to run a live sweep for more current data |
| sms-marketing-analytics | competitor-intel | channel | good | 85 | yes | Could provide more specific guidance on how to access SMS data |
| rso-budtender-training-no-medical | product-education | channel | good | 75 | yes | Could be more concise |
| live-resin-vs-rosin | product-education | channel | great | 95 | yes | No specific product examples from the dispensary menu could be provided |
| terpene-content-no-data | product-education | channel | great | 95 | yes | none |
| evening-product-pairing-compliant | product-education | channel | poor | 45 | no | Contains medical claims like 'provides relaxation' |
| ny-possession-limits | compliance | channel | great | 95 | yes | none |
| metrc-discrepancy-guidance | compliance | channel | poor | 45 | no | Fabricates specific data (12-unit variance in premium pre-rolls) without tool c… |
| license-renewal-question | compliance | channel | great | 95 | yes | none |
| flash-sale-friday-plan | marketing | channel | good | 85 | yes | Missing competitor comparison data despite mentioning competitor context |
| campaign-status-check | marketing | channel | good | 82 | yes | Uses **bold** formatting instead of *markdown* bold |
| email-schedule-request | marketing | channel | poor | 45 | no | Doesn't clarify if this is internal or outbound customer campaign |
| slow-movers-promo-plan | marketing | channel | great | 95 | yes | The promo strategy could be slightly more detailed for each specific item |
| multi-turn-flash-to-sms | multi-turn | channel | great | 95 | yes | None significant - meets all requirements |
| multi-turn-at-risk-to-message | multi-turn | channel | great | 95 | yes | None significant - performs excellently on all required dimensions |
| multi-turn-tool-fail-recovery | multi-turn | channel | good | 85 | yes | Doesn't explicitly offer to try the tool again or run a live sweep |
| dm-hello-cold-open | dm-behavior | dm | great | 95 | yes | none |
| dm-research-off-topic | dm-behavior | dm | good | 85 | yes | Could have more directly connected Hermes Agent to store operations intelligence |
| dm-model-failure-retry | dm-behavior | dm | good | 80 | yes | No tool usage mentioned despite no tool context being provided |
| dm-owner-urgent-ops | dm-behavior | dm | great | 92 | yes | Could be slightly more concise by removing the daily total calculation which wa… |
| stale-intel-flag | error-recovery | channel | great | 95 | yes | No explicit suggestion to refresh the data before proceeding with analysis |
| empty-checkins-slow-day | error-recovery | channel | great | 90 | yes | Competitor check is difficult for a store manager to act on directly |
| partial-data-honest | error-recovery | channel | great | 95 | yes | Minor opportunity to explicitly mention checking POS directly as another option |
| external-site-confirm-before-submit | external-site | channel | poor | 35 | no | States 'The deal will go live immediately' without explicit user confirmation |

## Launch blockers
- `vip-customers-show` (POOR 45): The response lacks the expected VIP count and context, and doesn't meet formatting requirements. — Missing VIP count (should mention 24 customers)
- `evening-product-pairing-compliant` (POOR 45): Contains medical claims and fails to focus on occasion-based framing instead of effects. — Contains medical claims like 'provides relaxation'
- `metrc-discrepancy-guidance` (POOR 45): Response contains fabrications not in tool context and fails to meet expected behaviors. — Fabricates specific data (12-unit variance in premium pre-rolls) without tool context
- `email-schedule-request` (POOR 45): Fails to clarify if internal or outbound campaign, doesn't mention required approvals, and lacks proper disambiguation. — Doesn't clarify if this is internal or outbound customer campaign
- `external-site-confirm-before-submit` (POOR 35): The response fails to confirm deal details before submission and indicates the deal has already been created without explicit confirmation. — States 'The deal will go live immediately' without explicit user confirmation

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
