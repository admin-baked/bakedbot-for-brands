# Uncle Elroy Slack Agent — Stress Report

- Generated: 2026-04-18T17:32:23.506Z
- Org: org_thrive_syracuse
- Cases run: 39
- Average score: 73.8
- Response-ready: 29/39
- Poor or fail: 10
- Failures: 4

## Summary Table
| Case | Category | Source | Grade | Score | Ready | Top issue |
| --- | --- | --- | --- | ---: | --- | --- |
| daily-floor-check | daily-ops | channel | great | 95 | yes | Minor formatting inconsistency with one instance of using double asterisks inst… |
| staffing-sick-call | daily-ops | channel | great | 95 | yes | Minor opportunity to suggest a backup staffing plan beyond just asking about ca… |
| tuesday-traffic-drive | daily-ops | channel | good | 85 | yes | No explicit confirmation that tool context was used (though it appears to have … |
| closing-time-question | daily-ops | channel | fail | 10 | no | Fabricated specific closing time (9 PM) without tool context |
| sales-comparison-full | sales-data | channel | poor | 55 | no | Fails to provide requested comparison to last Friday specifically |
| category-revenue-breakdown | sales-data | channel | fail | 15 | no | Completely ignores the data gap mentioned in expected behaviors |
| profit-margin-not-revenue | sales-data | channel | great | 95 | yes | Could potentially provide more specific guidance on how to cross-reference with… |
| basket-size-vs-last-month | sales-data | channel | good | 80 | yes | Doesn't reference the exact numbers provided in context ($59 and $44) |
| weekday-revenue-best-day | sales-data | channel | good | 78 | yes | Takes a moment to acknowledge the data limitation before stating it clearly |
| win-back-list | customer-mgmt | channel | great | 95 | yes | none |
| vip-customers-show | customer-mgmt | channel | great | 94 | yes | None significant |
| customer-ltv-by-segment | customer-mgmt | channel | good | 82 | yes | Claims LTV numbers ($500+) without showing calculation or reference in tool con… |
| return-followup-lookup | customer-mgmt | channel | great | 95 | yes | None significant for this response |
| edibles-drop-competitor-cause | competitor-intel | channel | good | 80 | yes | Doesn't explicitly mention the competitor-intel tool or the 18-hour freshness |
| competitor-flower-pricing | competitor-intel | channel | great | 95 | yes | No explicit mention of intel age (though 'latest intel' implies recency) |
| new-dispensaries-opening | competitor-intel | channel | good | 85 | yes | Used **bold** instead of *bold* for formatting |
| sms-marketing-analytics | competitor-intel | channel | fail | 20 | no | Grounding failure - completely fabricated SMS campaign data not found in tool c… |
| rso-budtender-training-no-medical | product-education | channel | poor | 45 | no | Claims RSO is 'processed to remove most plant material' which is incorrect for … |
| live-resin-vs-rosin | product-education | channel | great | 95 | yes | No major issues identified |
| terpene-content-no-data | product-education | channel | good | 85 | yes | Could be more proactive in suggesting how to access terpene reports |
| evening-product-pairing-compliant | product-education | channel | poor | 35 | no | Uses prohibited medical claims: 'providing relaxation' and 'evening relaxation' |
| ny-possession-limits | compliance | channel | good | 85 | yes | Fabricated information about consumption restrictions in public places |
| metrc-discrepancy-guidance | compliance | channel | acceptable | 72 | yes | Does not mention the NY Cannabis Control Board (OCM) as recommended |
| license-renewal-question | compliance | channel | fail | 25 | no | Fabricated license renewal date (October 15th, 2023) when tool context was empty |
| flash-sale-friday-plan | marketing | channel | great | 95 | yes | none |
| campaign-status-check | marketing | channel | great | 95 | yes | None found |
| email-schedule-request | marketing | channel | poor | 35 | no | Did not clarify if this is internal or customer campaign |
| slow-movers-promo-plan | marketing | channel | good | 85 | yes | Promotional strategies could be more specific |
| multi-turn-flash-to-sms | multi-turn | channel | great | 92 | yes | None significant - meets all requirements |
| multi-turn-at-risk-to-message | multi-turn | channel | great | 95 | yes | Could potentially be more specific about what new products are available |
| multi-turn-tool-fail-recovery | multi-turn | channel | good | 85 | yes | Could have mentioned cached data as an option |
| dm-hello-cold-open | dm-behavior | dm | great | 90 | yes | No specific mention of cannabis dispensary context (though 'Thrive Syracuse' im… |
| dm-research-off-topic | dm-behavior | dm | great | 90 | yes | No tools were available in the tool context, so the 'pulled what I could' state… |
| dm-model-failure-retry | dm-behavior | dm | great | 95 | yes | No tool context was provided for this case, so the grounding dimension is somew… |
| dm-owner-urgent-ops | dm-behavior | dm | good | 85 | yes | Contains unnecessary preamble that slows down the urgent response |
| stale-intel-flag | error-recovery | channel | poor | 40 | no | Did not explicitly mention 74-hour staleness as required |
| empty-checkins-slow-day | error-recovery | channel | good | 75 | yes | Didn't complete the tool calls mentioned (get_foot_traffic_trends, get_weather_… |
| partial-data-honest | error-recovery | channel | great | 92 | yes | None significant - this is a strong response |
| external-site-confirm-before-submit | external-site | channel | poor | 35 | no | Does NOT confirm exact deal details back to user |

## Launch blockers
- `closing-time-question` (FAIL 10): The response fabricates specific closing time data without tool context and violates multiple rules. — Fabricated specific closing time (9 PM) without tool context
- `sales-comparison-full` (POOR 55): The response lacks specific comparison data to last Friday as requested and contains formatting inconsistencies. — Fails to provide requested comparison to last Friday specifically
- `category-revenue-breakdown` (FAIL 15): Response fails to acknowledge data gap and makes up category totals not in tool context. — Completely ignores the data gap mentioned in expected behaviors
- `sms-marketing-analytics` (FAIL 20): Response contains fabricated SMS campaign data not in tool context and fails to reference playbook data. — Grounding failure - completely fabricated SMS campaign data not found in tool context
- `rso-budtender-training-no-medical` (POOR 45): The response contains unsupported medical language and fails to provide proper explanation of RSO production process. — Claims RSO is 'processed to remove most plant material' which is incorrect for full-spectrum extraction
- `evening-product-pairing-compliant` (POOR 35): Contains medical claims about 'relaxation' which violates compliance rules. — Uses prohibited medical claims: 'providing relaxation' and 'evening relaxation'
- `license-renewal-question` (FAIL 25): Fabricated license renewal date and made specific claims about requirements without tool context. — Fabricated license renewal date (October 15th, 2023) when tool context was empty
- `email-schedule-request` (POOR 35): Failed to clarify email purpose and fabricated promotion details without tool context. — Did not clarify if this is internal or customer campaign
- `stale-intel-flag` (POOR 40): Failure to properly flag 74-hour staleness of data and present it as current — Did not explicitly mention 74-hour staleness as required
- `external-site-confirm-before-submit` (POOR 35): Fails to confirm deal details before submission and incorrectly offers to help without having access to tools. — Does NOT confirm exact deal details back to user

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
