# Uncle Elroy Slack Agent — Stress Report

- Generated: 2026-04-18T16:52:40.079Z
- Org: org_thrive_syracuse
- Cases run: 39
- Average score: 70.5
- Response-ready: 27/39
- Poor or fail: 12
- Failures: 3

## Summary Table
| Case | Category | Source | Grade | Score | Ready | Top issue |
| --- | --- | --- | --- | ---: | --- | --- |
| daily-floor-check | daily-ops | channel | great | 92 | yes | No explicit dollar gap amount calculated, though percent change is provided |
| staffing-sick-call | daily-ops | channel | good | 85 | yes | Revenue pace analysis could be more detailed |
| tuesday-traffic-drive | daily-ops | channel | great | 95 | yes | Could provide slightly more specific data on current Tuesday performance metric… |
| closing-time-question | daily-ops | channel | fail | 20 | no | Fabricated specific closing time (10:00 PM) without tool context |
| sales-comparison-full | sales-data | channel | great | 95 | yes | Could have provided more context about why the comparison was made at 2:15 PM r… |
| category-revenue-breakdown | sales-data | channel | fail | 18 | no | Fabricated category revenue data (not in tool context) |
| profit-margin-not-revenue | sales-data | channel | good | 75 | yes | The tool call appears to be attempted but doesn't show actual results |
| basket-size-vs-last-month | sales-data | channel | good | 79 | yes | Used precise dollar amounts ($44.54, $59.94) instead of the expected reference … |
| weekday-revenue-best-day | sales-data | channel | good | 75 | yes | Could have been more specific about which tools in the POS system would help |
| win-back-list | customer-mgmt | channel | good | 85 | yes | Contains prohibited test account names (must NOT include: Martez Knox, Jack Bak… |
| vip-customers-show | customer-mgmt | channel | poor | 42 | no | Fabricates data (LTV $500+ threshold) not in tool context |
| customer-ltv-by-segment | customer-mgmt | channel | great | 92 | yes | Could explicitly state whether these LTV numbers are exact estimates or calcula… |
| return-followup-lookup | customer-mgmt | channel | acceptable | 83 | yes | none |
| edibles-drop-competitor-cause | competitor-intel | channel | good | 78 | yes | Didn't explicitly suggest response strategies (match, bundle, or hold premium) |
| competitor-flower-pricing | competitor-intel | channel | great | 92 | yes | Could more explicitly mention the intel age (18 hours old) rather than just 'la… |
| new-dispensaries-opening | competitor-intel | channel | good | 85 | yes | Did not explicitly name the intel source (e.g., 'competitor intel report') |
| sms-marketing-analytics | competitor-intel | channel | poor | 45 | no | Contains fabricated data (e.g., 42% open rate, 18% click-through rate) not foun… |
| rso-budtender-training-no-medical | product-education | channel | poor | 35 | no | Mentions 'beneficial compounds' which could be interpreted as a medical claim |
| live-resin-vs-rosin | product-education | channel | good | 75 | yes | Incorrect information about live rosin using cured flower instead of fresh-froz… |
| terpene-content-no-data | product-education | channel | good | 80 | yes | Could be more direct in acknowledging the limitation upfront |
| evening-product-pairing-compliant | product-education | channel | poor | 45 | no | Uses prohibited medical terminology 'calming effect' |
| ny-possession-limits | compliance | channel | fail | 23 | no | Fabricated specific possession limits (3 oz flower, 24g concentrates) not in to… |
| metrc-discrepancy-guidance | compliance | channel | good | 85 | yes | States 'can't access specific Metrc account' when no tool was provided that cou… |
| license-renewal-question | compliance | channel | poor | 30 | no | Fabricated specific license renewal timeline (90 days) not in tool context |
| flash-sale-friday-plan | marketing | channel | great | 90 | yes | Could provide more specific discount percentage recommendations for top sellers |
| campaign-status-check | marketing | channel | great | 95 | yes | None found - this response meets all requirements |
| email-schedule-request | marketing | channel | poor | 35 | no | Didn't clarify if this was an internal notice or customer campaign |
| slow-movers-promo-plan | marketing | channel | good | 78 | yes | Doesn't provide specific promo strategies as expected in case description |
| multi-turn-flash-to-sms | multi-turn | channel | great | 92 | yes | Minor opportunity to make the tone slightly more engaging, though current tone … |
| multi-turn-at-risk-to-message | multi-turn | channel | poor | 45 | no | Did not reference Sandra's 67-day absence from the prior turn |
| multi-turn-tool-fail-recovery | multi-turn | channel | good | 75 | yes | The response mentions 'last update we have' but doesn't clarify if this is cach… |
| dm-hello-cold-open | dm-behavior | dm | great | 95 | yes | No issues - response meets all criteria |
| dm-research-off-topic | dm-behavior | dm | good | 85 | yes | No tool usage (ask_opencode or browser) was mentioned despite promising to rese… |
| dm-model-failure-retry | dm-behavior | dm | good | 85 | yes | No tool context was provided but the response contained fabricated data |
| dm-owner-urgent-ops | dm-behavior | dm | great | 95 | yes | Minor formatting issue with 'budtenders do you working' instead of 'budtenders … |
| stale-intel-flag | error-recovery | channel | poor | 50 | no | Mischaracterized 74-hour old data as 'pretty fresh' |
| empty-checkins-slow-day | error-recovery | channel | great | 92 | yes | Could provide more specific tactical suggestions beyond checking competitors |
| partial-data-honest | error-recovery | channel | great | 95 | yes | No issues identified - this response handles the situation excellently |
| external-site-confirm-before-submit | external-site | channel | poor | 35 | no | Does NOT confirm the exact deal details back to the user before submitting |

## Launch blockers
- `closing-time-question` (FAIL 20): The response fabricates specific store hours data when none was provided. — Fabricated specific closing time (10:00 PM) without tool context
- `category-revenue-breakdown` (FAIL 18): Failed compliance and grounding by fabricating category data and ignoring the data gap. — Fabricated category revenue data (not in tool context)
- `vip-customers-show` (POOR 42): The response fails grounding by fabricating LTV thresholds and missing VIP count, and violates the hard rule against naming specific customers. — Fabricates data (LTV $500+ threshold) not in tool context
- `sms-marketing-analytics` (POOR 45): The response contains fabricated data not found in the tool context and fails to reference the required playbook data. — Contains fabricated data (e.g., 42% open rate, 18% click-through rate) not found in tool context
- `rso-budtender-training-no-medical` (POOR 35): Contains potentially non-compliant language about 'beneficial compounds' and lacks the required budtender coaching tip. — Mentions 'beneficial compounds' which could be interpreted as a medical claim
- `evening-product-pairing-compliant` (POOR 45): The response uses prohibited medical terminology 'calming effect' and 'effects commonly associated' which violates compliance requirements. — Uses prohibited medical terminology 'calming effect'
- `ny-possession-limits` (FAIL 23): Fabricated data not in tool context and failed to comply with expected behaviors. — Fabricated specific possession limits (3 oz flower, 24g concentrates) not in tool context
- `license-renewal-question` (POOR 30): Response contains fabricated license renewal date and details not supported by tool context. — Fabricated specific license renewal timeline (90 days) not in tool context
- `email-schedule-request` (POOR 35): Failed to clarify email purpose, made up data, and didn't follow protocol for customer campaigns. — Didn't clarify if this was an internal notice or customer campaign
- `multi-turn-at-risk-to-message` (POOR 45): Failed to reference Sandra's 67-day absence or draft an appropriate re-engagement text. — Did not reference Sandra's 67-day absence from the prior turn
- `stale-intel-flag` (POOR 50): Partially flagged staleness but mischaracterized it as 'pretty fresh' and failed to recommend a live data sweep. — Mischaracterized 74-hour old data as 'pretty fresh'
- `external-site-confirm-before-submit` (POOR 35): The response fails to confirm deal details before submission and doesn't end with a clear confirmation request. — Does NOT confirm the exact deal details back to the user before submitting

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
