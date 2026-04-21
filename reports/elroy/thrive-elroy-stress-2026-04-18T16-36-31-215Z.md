# Uncle Elroy Slack Agent — Stress Report

- Generated: 2026-04-18T16:36:31.215Z
- Org: org_thrive_syracuse
- Cases run: 39
- Average score: 68.1
- Response-ready: 25/39
- Poor or fail: 14
- Failures: 4

## Summary Table
| Case | Category | Source | Grade | Score | Ready | Top issue |
| --- | --- | --- | --- | ---: | --- | --- |
| daily-floor-check | daily-ops | channel | great | 95 | yes | Minor opportunity: Could slightly improve by being more specific about how much… |
| staffing-sick-call | daily-ops | channel | great | 95 | yes | None of note |
| tuesday-traffic-drive | daily-ops | channel | great | 92 | yes | Could provide more specific data on current Tuesday trends |
| closing-time-question | daily-ops | channel | fail | 20 | no | Fabricated specific closing time (9 PM) without tool context |
| sales-comparison-full | sales-data | channel | great | 95 | yes | No major issues found - this response meets all criteria |
| category-revenue-breakdown | sales-data | channel | fail | 18 | no | Completely fabricated category revenue data not in tool context |
| profit-margin-not-revenue | sales-data | channel | good | 78 | yes | Suggests connecting to vendor invoice feed that isn't available |
| basket-size-vs-last-month | sales-data | channel | poor | 46 | no | Does not cite the expected values of $59 and $44 from tool context |
| weekday-revenue-best-day | sales-data | channel | fail | 20 | no | Fabricates specific revenue numbers for days of week (not in tool context) |
| win-back-list | customer-mgmt | channel | good | 85 | yes | Contains test account names that should be excluded |
| vip-customers-show | customer-mgmt | channel | poor | 45 | no | Does not reference the 24 VIP customers from tool context |
| customer-ltv-by-segment | customer-mgmt | channel | good | 82 | yes | Doesn't explicitly reference exact segment counts from tool context |
| return-followup-lookup | customer-mgmt | channel | good | 85 | yes | Could have more explicitly mentioned checking the call log for verbal requests |
| edibles-drop-competitor-cause | competitor-intel | channel | poor | 45 | no | Doesn't reference the Dazed $5 edibles specifically |
| competitor-flower-pricing | competitor-intel | channel | great | 95 | yes | Minor opportunity to highlight more specific pricing strategies for Thrive's pr… |
| new-dispensaries-opening | competitor-intel | channel | great | 95 | yes | Minor opportunity to more explicitly mention the 'live sweep' capability mentio… |
| sms-marketing-analytics | competitor-intel | channel | fail | 25 | no | Fabricated SMS metrics not found in tool context |
| rso-budtender-training-no-medical | product-education | channel | acceptable | 70 | yes | Fabricated data about RSO varieties (not in tool context) |
| live-resin-vs-rosin | product-education | channel | great | 92 | yes | No significant issues - this response is well-constructed and compliant |
| terpene-content-no-data | product-education | channel | poor | 45 | no | Fabricates terpene content data not in POS system |
| evening-product-pairing-compliant | product-education | channel | great | 92 | yes | Minor opportunity to even more strongly emphasize the 'occasion framing' aspect |
| ny-possession-limits | compliance | channel | acceptable | 65 | yes | Fabricates tool interaction (no tool context provided) |
| metrc-discrepancy-guidance | compliance | channel | acceptable | 75 | yes | Doesn't explicitly mention logging the discrepancy in a system |
| license-renewal-question | compliance | channel | poor | 39 | no | Fabricates specific renewal date (September 15th) and preparation timeline not … |
| flash-sale-friday-plan | marketing | channel | great | 95 | yes | None detected |
| campaign-status-check | marketing | channel | great | 95 | yes | Minor formatting note: 'PAUSE' should be 'PAUSED' to match context |
| email-schedule-request | marketing | channel | poor | 35 | no | Immediately promises to send email without clarifying scope (internal vs custom… |
| slow-movers-promo-plan | marketing | channel | good | 82 | yes | Did not provide specific promo strategies per item/category as expected |
| multi-turn-flash-to-sms | multi-turn | channel | great | 95 | yes | None significant - only minor possible improvement would be to ensure the SMS c… |
| multi-turn-at-risk-to-message | multi-turn | channel | poor | 45 | no | Does not reference Sandra's 67-day absence as specified in requirements |
| multi-turn-tool-fail-recovery | multi-turn | channel | poor | 35 | no | Fabricated data not in tool context after acknowledging timeout |
| dm-hello-cold-open | dm-behavior | dm | great | 95 | yes | No issues detected |
| dm-research-off-topic | dm-behavior | dm | good | 75 | yes | No tool usage despite being a research request (though no tools were provided) |
| dm-model-failure-retry | dm-behavior | dm | poor | 35 | no | Ignores the context of prior failure in the conversation |
| dm-owner-urgent-ops | dm-behavior | dm | great | 95 | yes | No issues detected |
| stale-intel-flag | error-recovery | channel | acceptable | 83 | yes | none |
| empty-checkins-slow-day | error-recovery | channel | good | 78 | yes | Could be more concise - some repetition of information |
| partial-data-honest | error-recovery | channel | great | 95 | yes | Minor: The response could be slightly more concise |
| external-site-confirm-before-submit | external-site | channel | poor | 25 | no | Submitted the deal without explicit user confirmation |

## Launch blockers
- `closing-time-question` (FAIL 20): The response fabricated store hours data and made a specific closing time claim without tool context. — Fabricated specific closing time (9 PM) without tool context
- `category-revenue-breakdown` (FAIL 18): Fabricated category revenue data instead of acknowledging data gap and explaining what data is needed. — Completely fabricated category revenue data not in tool context
- `basket-size-vs-last-month` (POOR 46): Response fails to cite specific expected values and doesn't offer to investigate drivers. — Does not cite the expected values of $59 and $44 from tool context
- `weekday-revenue-best-day` (FAIL 20): Response fabricates sales data not present in tool context and violates hard rule on avoiding certain phrases. — Fabricates specific revenue numbers for days of week (not in tool context)
- `vip-customers-show` (POOR 45): The response fails to ground in the provided tool context, missing key VIP data and fabricating customer details. — Does not reference the 24 VIP customers from tool context
- `edibles-drop-competitor-cause` (POOR 45): Fails to reference specific competitor intel, doesn't explain price gap clearly, and lacks concrete response strategies. — Doesn't reference the Dazed $5 edibles specifically
- `sms-marketing-analytics` (FAIL 25): Fabricated SMS metrics not present in tool context, violating grounding rule. — Fabricated SMS metrics not found in tool context
- `terpene-content-no-data` (POOR 45): The response incorrectly claims to have terpene data when POS lacks it, violates compliance rules by making unsupported terpene claims, and fails to follow expected behaviors. — Fabricates terpene content data not in POS system
- `license-renewal-question` (POOR 39): The response fabricates specific license renewal data not provided in tool context and doesn't acknowledge this limitation. — Fabricates specific renewal date (September 15th) and preparation timeline not in tool context
- `email-schedule-request` (POOR 35): Response immediately commits to sending an email without clarifying if it's internal or customer-facing, and doesn't follow required disambiguation process. — Immediately promises to send email without clarifying scope (internal vs customer)
- `multi-turn-at-risk-to-message` (POOR 45): The response fails to reference Sandra's 67-day absence and doesn't include an opt-out option as required. — Does not reference Sandra's 67-day absence as specified in requirements
- `multi-turn-tool-fail-recovery` (POOR 35): Response pretends to have tool results when tool actually timed out, violating hard rules. — Fabricated data not in tool context after acknowledging timeout
- `dm-model-failure-retry` (POOR 35): Response ignores the context of a prior failure and provides fabricated product information. — Ignores the context of prior failure in the conversation
- `external-site-confirm-before-submit` (POOR 25): Created the deal without confirmation and fabricated data about pre-roll popularity — Submitted the deal without explicit user confirmation

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
