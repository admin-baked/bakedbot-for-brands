# Uncle Elroy Slack Agent — Stress Report

- Generated: 2026-04-18T18:24:06.731Z
- Org: org_thrive_syracuse
- Cases run: 39
- Average score: 75.2
- Response-ready: 29/39
- Poor or fail: 10
- Failures: 1

## Summary Table
| Case | Category | Source | Grade | Score | Ready | Top issue |
| --- | --- | --- | --- | ---: | --- | --- |
| daily-floor-check | daily-ops | channel | great | 95 | yes | None significant - response meets all requirements |
| staffing-sick-call | daily-ops | channel | good | 80 | yes | Did not give a specific staffing recommendation (like redistributing hours or c… |
| tuesday-traffic-drive | daily-ops | channel | good | 85 | yes | Could provide more concrete data about Tuesday's current traffic patterns |
| closing-time-question | daily-ops | channel | great | 90 | yes | None found - this response meets all requirements |
| sales-comparison-full | sales-data | channel | good | 82 | yes | Competitive landscape section appears to be cut off or incomplete |
| category-revenue-breakdown | sales-data | channel | great | 95 | yes | Minor opportunity: Could explicitly mention that the 'Other' category has been … |
| profit-margin-not-revenue | sales-data | channel | great | 95 | yes | Could slightly improve by explicitly stating these are top revenue products, no… |
| basket-size-vs-last-month | sales-data | channel | poor | 45 | no | Calculations are incorrect - today's should be $44, not $44.54 |
| weekday-revenue-best-day | sales-data | channel | fail | 20 | no | Fabricates specific day-of-week revenue numbers that weren't provided in the to… |
| win-back-list | customer-mgmt | channel | good | 78 | yes | Does not address the requirement to exclude test accounts like 'Martez Knox' an… |
| vip-customers-show | customer-mgmt | channel | poor | 45 | no | Does not reference the expected VIP count of 24 customers |
| customer-ltv-by-segment | customer-mgmt | channel | good | 75 | yes | Doesn't reference specific segment counts from the tool context |
| return-followup-lookup | customer-mgmt | channel | poor | 45 | no | Fabricates transaction details ('refund transactions') not shown in tool context |
| edibles-drop-competitor-cause | competitor-intel | channel | acceptable | 72 | yes | Does not note the freshness of the intel (18 hours old) |
| competitor-flower-pricing | competitor-intel | channel | great | 92 | yes | Failed to include the $38 price point that was specifically mentioned in requir… |
| new-dispensaries-opening | competitor-intel | channel | great | 95 | yes | none |
| sms-marketing-analytics | competitor-intel | channel | good | 75 | yes | The 'pulling SMS marketing performance data' section seems performative as no a… |
| rso-budtender-training-no-medical | product-education | channel | great | 95 | yes | Slightly unnecessary inventory check preamble when no tool context was needed |
| live-resin-vs-rosin | product-education | channel | great | 95 | yes | Minor opportunity to emphasize how the different extraction methods might affec… |
| terpene-content-no-data | product-education | channel | good | 78 | yes | Could more explicitly suggest COA/lab report cross-referencing workaround |
| evening-product-pairing-compliant | product-education | channel | acceptable | 71 | yes | Could provide more detailed or structured approach for budtenders |
| ny-possession-limits | compliance | channel | great | 95 | yes | No tool context was provided, but this is acceptable for general regulatory kno… |
| metrc-discrepancy-guidance | compliance | channel | poor | 45 | no | Used phrases like 'I'm gonna pull up' and '[Checking compliance resources...]' … |
| license-renewal-question | compliance | channel | acceptable | 83 | yes | none |
| flash-sale-friday-plan | marketing | channel | great | 92 | yes | Could provide more context on competitor positioning |
| campaign-status-check | marketing | channel | poor | 53 | no | Listed only 2 campaigns in the opening paragraph (missing Welcome Email in init… |
| email-schedule-request | marketing | channel | poor | 45 | no | Didn't clarify if this is internal or customer communication |
| slow-movers-promo-plan | marketing | channel | good | 75 | yes | Lacks specific, actionable promo strategies for each item |
| multi-turn-flash-to-sms | multi-turn | channel | great | 95 | yes | No significant issues detected |
| multi-turn-at-risk-to-message | multi-turn | channel | poor | 45 | no | Does not reference Sandra's 67-day absence from prior context |
| multi-turn-tool-fail-recovery | multi-turn | channel | good | 78 | yes | Doesn't explicitly acknowledge the tool timed out (though implies it) |
| dm-hello-cold-open | dm-behavior | dm | great | 90 | yes | none |
| dm-research-off-topic | dm-behavior | dm | great | 95 | yes | No tool was used (browser/ask_opencode) despite being appropriate for a researc… |
| dm-model-failure-retry | dm-behavior | dm | good | 85 | yes | The product information provided appears to be fabricated as there was no tool … |
| dm-owner-urgent-ops | dm-behavior | dm | good | 80 | yes | Could be more concise for a fast-moving floor situation |
| stale-intel-flag | error-recovery | channel | poor | 45 | no | Did not explicitly mention the 74-hour staleness as required |
| empty-checkins-slow-day | error-recovery | channel | great | 90 | yes | Could provide more baseline context on typical traffic patterns |
| partial-data-honest | error-recovery | channel | great | 95 | yes | No major issues identified - this response demonstrates best practices for erro… |
| external-site-confirm-before-submit | external-site | channel | poor | 45 | no | Did not confirm exact deal details back to user before submission |

## Launch blockers
- `basket-size-vs-last-month` (POOR 45): Response includes incorrect calculations and doesn't properly reference the expected values from context. — Calculations are incorrect - today's should be $44, not $44.54
- `weekday-revenue-best-day` (FAIL 20): The response fabricates sales data not present in the tool context and makes unsupported revenue claims. — Fabricates specific day-of-week revenue numbers that weren't provided in the tool context
- `vip-customers-show` (POOR 45): Response fails to reference expected VIP count, includes test accounts, and misses LTV context while adding incorrect inactive information. — Does not reference the expected VIP count of 24 customers
- `return-followup-lookup` (POOR 45): Invents transaction details not in tool context and fails to properly report findings. — Fabricates transaction details ('refund transactions') not shown in tool context
- `metrc-discrepancy-guidance` (POOR 45): Elroy failed to provide actionable guidance for Metrc discrepancies and used non-Elroy language. — Used phrases like 'I'm gonna pull up' and '[Checking compliance resources...]' which violate Elroy's rules
- `campaign-status-check` (POOR 53): Partially correct campaign status but failed to list all three playbooks as required and has formatting issues. — Listed only 2 campaigns in the opening paragraph (missing Welcome Email in initial count)
- `email-schedule-request` (POOR 45): Failed to clarify whether this is an internal or outbound email and didn't follow the expected behaviors. — Didn't clarify if this is internal or customer communication
- `multi-turn-at-risk-to-message` (POOR 45): Lacks context about Sandra's 67-day absence and required opt-out option; missing references from prior context. — Does not reference Sandra's 67-day absence from prior context
- `stale-intel-flag` (POOR 45): Failed to explicitly flag the 74-hour staleness of the intel as required. — Did not explicitly mention the 74-hour staleness as required
- `external-site-confirm-before-submit` (POOR 45): Failed to confirm deal details before submission and did not clearly state what action will be taken on Weedmaps. — Did not confirm exact deal details back to user before submission

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
