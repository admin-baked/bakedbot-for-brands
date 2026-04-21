# Uncle Elroy Slack Agent — Stress Report

- Generated: 2026-04-18T17:02:52.165Z
- Org: org_thrive_syracuse
- Cases run: 39
- Average score: 68.3
- Response-ready: 24/39
- Poor or fail: 15
- Failures: 0

## Summary Table
| Case | Category | Source | Grade | Score | Ready | Top issue |
| --- | --- | --- | --- | ---: | --- | --- |
| daily-floor-check | daily-ops | channel | great | 92 | yes | None - this response meets all requirements |
| staffing-sick-call | daily-ops | channel | good | 80 | yes | Could better integrate revenue pace into the staffing recommendation |
| tuesday-traffic-drive | daily-ops | channel | acceptable | 83 | yes | none |
| closing-time-question | daily-ops | channel | poor | 45 | no | Invented specific closing time (9 PM) without tool data |
| sales-comparison-full | sales-data | channel | great | 95 | yes | Only one minor issue - the response mentions 'Wednesday based on the data I can… |
| category-revenue-breakdown | sales-data | channel | good | 85 | yes | Could be more explicit about what data is needed for true category breakdown |
| profit-margin-not-revenue | sales-data | channel | acceptable | 70 | yes | Claims to have inventory and vendor pricing data tools but doesn't explain why … |
| basket-size-vs-last-month | sales-data | channel | poor | 45 | no | Did not reference the expected values of $59 and $44 from tool context |
| weekday-revenue-best-day | sales-data | channel | good | 85 | yes | Could be slightly more proactive in suggesting how to access the POS system |
| win-back-list | customer-mgmt | channel | good | 80 | yes | Used **bold** formatting instead of *bold* |
| vip-customers-show | customer-mgmt | channel | poor | 45 | no | Failed to reference expected VIP count of 24 from segment data |
| customer-ltv-by-segment | customer-mgmt | channel | acceptable | 75 | yes | Does not provide actual LTV figures for segments from tool context |
| return-followup-lookup | customer-mgmt | channel | poor | 35 | no | Invented data about a $67.50 transaction at 1:47 PM which wasn't in tool context |
| edibles-drop-competitor-cause | competitor-intel | channel | poor | 42 | no | Fabricated transaction data analysis not provided in tool context |
| competitor-flower-pricing | competitor-intel | channel | great | 92 | yes | Minor improvement could be adding a specific next step for the manager to consi… |
| new-dispensaries-opening | competitor-intel | channel | acceptable | 70 | yes | Doesn't offer to run a live sweep for more current data as expected |
| sms-marketing-analytics | competitor-intel | channel | great | 90 | yes | Failed to reference the 'Personalized Weekly Emails 78% open rate' from playboo… |
| rso-budtender-training-no-medical | product-education | channel | good | 75 | yes | Missing required budtender coaching tip at the end |
| live-resin-vs-rosin | product-education | channel | great | 92 | yes | none |
| terpene-content-no-data | product-education | channel | poor | 45 | no | Violates grounding by making terpene claims despite no POS data |
| evening-product-pairing-compliant | product-education | channel | poor | 45 | no | Contains medical claims ('helpful for evening relaxation', 'appeal to those loo… |
| ny-possession-limits | compliance | channel | poor | 35 | no | Fabricated specific possession limits not supported by tool context |
| metrc-discrepancy-guidance | compliance | channel | good | 85 | yes | Claims to 'pull up documents' but no tool was available |
| license-renewal-question | compliance | channel | poor | 30 | no | Fabricates a specific renewal date (November 15, 2024) when tool context is emp… |
| flash-sale-friday-plan | marketing | channel | great | 92 | yes | Minor opportunity to strengthen competitor context integration |
| campaign-status-check | marketing | channel | good | 80 | yes | Does not explicitly list all 3 playbooks from context |
| email-schedule-request | marketing | channel | poor | 35 | no | Did not clarify if internal team notice or customer campaign |
| slow-movers-promo-plan | marketing | channel | good | 83 | yes | Only provides one specific promo strategy (Jaunty Lime) while listing 5 items |
| multi-turn-flash-to-sms | multi-turn | channel | great | 95 | yes | None significant - only minor potential improvement could be adding a question … |
| multi-turn-at-risk-to-message | multi-turn | channel | poor | 45 | no | Failed to reference Sandra's 67-day absence from the previous turn |
| multi-turn-tool-fail-recovery | multi-turn | channel | poor | 45 | no | Fabricated competitor intel not from tool context |
| dm-hello-cold-open | dm-behavior | dm | poor | 40 | no | Does not identify as Uncle Elroy |
| dm-research-off-topic | dm-behavior | dm | good | 85 | yes | No tool usage visible in the response despite researching |
| dm-model-failure-retry | dm-behavior | dm | great | 95 | yes | No tool context was provided, so the grounding score is slightly reduced |
| dm-owner-urgent-ops | dm-behavior | dm | great | 92 | yes | Could be slightly more concise by removing the introductory sentence |
| stale-intel-flag | error-recovery | channel | good | 85 | yes | Could be more explicit about recommending a live sweep |
| empty-checkins-slow-day | error-recovery | channel | poor | 55 | no | No tactical suggestions provided (promo, at-risk outreach, etc.) |
| partial-data-honest | error-recovery | channel | good | 85 | yes | Could have been more specific about which system to check for direct verificati… |
| external-site-confirm-before-submit | external-site | channel | poor | 35 | no | Does not confirm exact deal details back to user before submission |

## Launch blockers
- `closing-time-question` (POOR 45): The response fabricated store hours data despite having no tool context to verify. — Invented specific closing time (9 PM) without tool data
- `basket-size-vs-last-month` (POOR 45): Failed to provide key comparison data and missed referencing values from tool context. — Did not reference the expected values of $59 and $44 from tool context
- `vip-customers-show` (POOR 45): Response fails to reference the expected VIP count of 24 and excludes critical qualifying criteria. — Failed to reference expected VIP count of 24 from segment data
- `return-followup-lookup` (POOR 35): Failed to correctly report no return transaction visible and did not ask for customer name or phone to narrow search. — Invented data about a $67.50 transaction at 1:47 PM which wasn't in tool context
- `edibles-drop-competitor-cause` (POOR 42): While mentioning Dazed's $5-$8 pricing, the response failed to provide clear next steps, didn't end with a required question/next step, and fabricated transaction data analysis. — Fabricated transaction data analysis not provided in tool context
- `terpene-content-no-data` (POOR 45): The response violates grounding by claiming terpene profiles without POS data, and makes unsupported terpene claims. — Violates grounding by making terpene claims despite no POS data
- `evening-product-pairing-compliant` (POOR 45): Contains medical claims and compliance issues despite good product suggestions. — Contains medical claims ('helpful for evening relaxation', 'appeal to those looking to wind down')
- `ny-possession-limits` (POOR 35): Response contains fabricated data and compliance issues without proper tool grounding. — Fabricated specific possession limits not supported by tool context
- `license-renewal-question` (POOR 30): Response fabricates license renewal date and ignores expected behavior when tool context is unavailable. — Fabricates a specific renewal date (November 15, 2024) when tool context is empty
- `email-schedule-request` (POOR 35): Failed to clarify email type before proceeding with action, missing critical marketing process steps. — Did not clarify if internal team notice or customer campaign
- `multi-turn-at-risk-to-message` (POOR 45): The response doesn't reference Sandra's 67-day absence, lacks an opt-out option, and misses key details from the conversation history. — Failed to reference Sandra's 67-day absence from the previous turn
- `multi-turn-tool-fail-recovery` (POOR 45): Elroy fabricated competitor intel after a tool timeout rather than acknowledging the failure or offering alternatives. — Fabricated competitor intel not from tool context
- `dm-hello-cold-open` (POOR 40): Lacks proper introduction as Uncle Elroy and doesn't identify as store ops advisor. — Does not identify as Uncle Elroy
- `empty-checkins-slow-day` (POOR 55): Response provides context on the numbers but fails to give tactical suggestions and asks too many questions without taking action. — No tactical suggestions provided (promo, at-risk outreach, etc.)
- `external-site-confirm-before-submit` (POOR 35): Response fails to confirm deal details before submission and doesn't explicitly request confirmation as required. — Does not confirm exact deal details back to user before submission

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
