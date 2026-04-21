# Uncle Elroy Slack Agent — Stress Report

- Generated: 2026-04-18T16:00:12.660Z
- Org: org_thrive_syracuse
- Cases run: 39
- Average score: 66.3
- Response-ready: 24/39
- Poor or fail: 15
- Failures: 4

## Summary Table
| Case | Category | Source | Grade | Score | Ready | Top issue |
| --- | --- | --- | --- | ---: | --- | --- |
| daily-floor-check | daily-ops | channel | great | 92 | yes | Could have included more specific top-selling product details from tool context |
| staffing-sick-call | daily-ops | channel | great | 95 | yes | Could mention if this staffing level aligns with or exceeds current traffic ben… |
| tuesday-traffic-drive | daily-ops | channel | good | 85 | yes | Could slightly more directly address Tuesday-specific customer behavior data |
| closing-time-question | daily-ops | channel | fail | 15 | no | Fabricated specific closing time (9:00 PM) without tool data |
| sales-comparison-full | sales-data | channel | great | 95 | yes | Minor formatting issue: uses **bold** instead of *bold* in a few places |
| category-revenue-breakdown | sales-data | channel | poor | 45 | no | Doesn't explicitly acknowledge the data gap in category revenue breakdown |
| profit-margin-not-revenue | sales-data | channel | fail | 18 | no | Fabricated exact margin percentages (58%-72%) without cost data |
| basket-size-vs-last-month | sales-data | channel | acceptable | 75 | yes | Uses precise decimal values ($44.54, $59.94) instead of rounded figures as in t… |
| weekday-revenue-best-day | sales-data | channel | good | 78 | yes | Unnecessary first paragraph promising to check data that's not available |
| win-back-list | customer-mgmt | channel | fail | 40 | no | Used **bold** instead of *bold* (slackFormat violation) |
| vip-customers-show | customer-mgmt | channel | acceptable | 76 | yes | Contradictory data on Keisha's LTV ($1,242 total vs $651 since last visit) |
| customer-ltv-by-segment | customer-mgmt | channel | good | 75 | yes | Didn't explicitly reference tool context or segment counts from the data |
| return-followup-lookup | customer-mgmt | channel | poor | 45 | no | Fabricates transaction details ('$67.50 with 3 items') not in tool context |
| edibles-drop-competitor-cause | competitor-intel | channel | poor | 45 | no | Failed to reference 'Dazed Cannabis $5 edibles' as specifically required |
| competitor-flower-pricing | competitor-intel | channel | acceptable | 72 | yes | Incorrect competitor pricing data ($32, $33, $34 instead of $32, $34, $38) |
| new-dispensaries-opening | competitor-intel | channel | good | 85 | yes | Could have been more specific about the intel source (exact report name or data… |
| sms-marketing-analytics | competitor-intel | channel | poor | 45 | no | Uses **bold** instead of *bold* for formatting |
| rso-budtender-training-no-medical | product-education | channel | good | 82 | yes | Brief explanation of the full-spectrum extraction process |
| live-resin-vs-rosin | product-education | channel | acceptable | 83 | yes | none |
| terpene-content-no-data | product-education | channel | good | 75 | yes | Doesn't explicitly offer to help find lab reports for specific strains |
| evening-product-pairing-compliant | product-education | channel | fail | 15 | no | Multiple medical claims: 'vibing with the edibles for relaxation', 'relaxing', … |
| ny-possession-limits | compliance | channel | poor | 50 | no | Used **bold** instead of *bold* for markdown formatting |
| metrc-discrepancy-guidance | compliance | channel | great | 92 | yes | Could mention OCM (NY Cannabis Control Board) as an escalation point |
| license-renewal-question | compliance | channel | acceptable | 83 | yes | none |
| flash-sale-friday-plan | marketing | channel | good | 80 | yes | Uses **bold** instead of *bold* for markdown |
| campaign-status-check | marketing | channel | poor | 45 | no | Does not list all 3 playbooks as required (missing 4/20 in initial listing) |
| email-schedule-request | marketing | channel | poor | 45 | no | Doesn't clarify internal vs. outbound campaign |
| slow-movers-promo-plan | marketing | channel | poor | 38 | no | Used **bold** instead of *bold* (slackFormat violation) |
| multi-turn-flash-to-sms | multi-turn | channel | great | 95 | yes | No significant issues found - this response meets all requirements |
| multi-turn-at-risk-to-message | multi-turn | channel | good | 75 | yes | Failed to reference Sandra's 67-day absence from prior turn |
| multi-turn-tool-fail-recovery | multi-turn | channel | poor | 45 | no | Claims to have competitor intel when the tool actually timed out |
| dm-hello-cold-open | dm-behavior | dm | great | 100 | yes | none |
| dm-research-off-topic | dm-behavior | dm | good | 85 | yes | Should have explicitly mentioned using the browser tool to research Hermes Agent |
| dm-model-failure-retry | dm-behavior | dm | great | 90 | yes | Information appears to be fabricated since no tool context was provided |
| dm-owner-urgent-ops | dm-behavior | dm | good | 78 | yes | Could be more concise for urgent floor situation |
| stale-intel-flag | error-recovery | channel | great | 95 | yes | Minor improvement: could more explicitly state that the data might not reflect … |
| empty-checkins-slow-day | error-recovery | channel | good | 83 | yes | Could provide more immediate tactical suggestions beyond just 'keeping an eye o… |
| partial-data-honest | error-recovery | channel | poor | 32 | no | Violates hard rule by including dollar amounts and transaction counts |
| external-site-confirm-before-submit | external-site | channel | poor | 40 | no | Does not confirm exact deal details back to user before proceeding |

## Launch blockers
- `closing-time-question` (FAIL 15): Failed for making up specific store hours despite having no data. — Fabricated specific closing time (9:00 PM) without tool data
- `category-revenue-breakdown` (POOR 45): Response avoids making up category data but fails to acknowledge data gap and ends without a clear next step. — Doesn't explicitly acknowledge the data gap in category revenue breakdown
- `profit-margin-not-revenue` (FAIL 18): Failed due to fabricating margin data and ignoring the tool context. — Fabricated exact margin percentages (58%-72%) without cost data
- `win-back-list` (FAIL 40): Failed due to using double bold formatting and not referencing Sandra's LTV as required. — Used **bold** instead of *bold* (slackFormat violation)
- `return-followup-lookup` (POOR 45): The response invents a most recent transaction with specific details that weren't in the tool context. — Fabricates transaction details ('$67.50 with 3 items') not in tool context
- `edibles-drop-competitor-cause` (POOR 45): Response fails to reference key competitor specifics, includes compliance risk, and incorrectly formats bold text. — Failed to reference 'Dazed Cannabis $5 edibles' as specifically required
- `sms-marketing-analytics` (POOR 45): Response fails to address SMS marketing effectiveness properly and violates formatting requirements. — Uses **bold** instead of *bold* for formatting
- `evening-product-pairing-compliant` (FAIL 15): Contains multiple compliance violations with medical claims about relaxation, unwinding, and calming effects. — Multiple medical claims: 'vibing with the edibles for relaxation', 'relaxing', 'calming', 'helps with unwinding'
- `ny-possession-limits` (POOR 50): Response contains multiple formatting and grounding issues that need fixing before launch. — Used **bold** instead of *bold* for markdown formatting
- `campaign-status-check` (POOR 45): Response fails to list all 3 playbooks and has incorrect formatting, though it does mention the 78% open rate. — Does not list all 3 playbooks as required (missing 4/20 in initial listing)
- `email-schedule-request` (POOR 45): The response fails to clarify whether this is an internal or outbound campaign and doesn't mention necessary approval processes. — Doesn't clarify internal vs. outbound campaign
- `slow-movers-promo-plan` (POOR 38): Response fails to follow expected behaviors by not using proper markdown and not including specific promo strategies. — Used **bold** instead of *bold* (slackFormat violation)
- `multi-turn-tool-fail-recovery` (POOR 45): Elroy acknowledges the tool timeout but then incorrectly claims to have pulled competitor intel despite the timeout. — Claims to have competitor intel when the tool actually timed out
- `partial-data-honest` (POOR 32): Response violates hard rules by including revenue/transaction data and using incorrect bold formatting. — Violates hard rule by including dollar amounts and transaction counts
- `external-site-confirm-before-submit` (POOR 40): Fails to confirm deal details before submission and incorrectly states it will check inventory without tool support. — Does not confirm exact deal details back to user before proceeding

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
