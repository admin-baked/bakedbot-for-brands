# Uncle Elroy Slack Agent — Stress Report

- Generated: 2026-04-18T18:31:26.395Z
- Org: org_thrive_syracuse
- Cases run: 39
- Average score: 74.4
- Response-ready: 28/39
- Poor or fail: 11
- Failures: 2

## Summary Table
| Case | Category | Source | Grade | Score | Ready | Top issue |
| --- | --- | --- | --- | ---: | --- | --- |
| daily-floor-check | daily-ops | channel | great | 92 | yes | Could provide more context about what might be causing the slowdown |
| staffing-sick-call | daily-ops | channel | great | 90 | yes | Could potentially add more specific timeframe references for the revenue/transa… |
| tuesday-traffic-drive | daily-ops | channel | great | 95 | yes | none |
| closing-time-question | daily-ops | channel | great | 95 | yes | none |
| sales-comparison-full | sales-data | channel | good | 85 | yes | Uses $ symbol without proper markdown formatting (should be *$2,847*) |
| category-revenue-breakdown | sales-data | channel | great | 95 | yes | No specific issues noted in this response |
| profit-margin-not-revenue | sales-data | channel | great | 92 | yes | The tool call seems to have failed (cost data not retrieved) |
| basket-size-vs-last-month | sales-data | channel | poor | 35 | no | Used fabricated numbers ($59.94, $63.12) instead of required references ($59, $… |
| weekday-revenue-best-day | sales-data | channel | fail | 20 | no | Fabricated complete revenue numbers for days of week |
| win-back-list | customer-mgmt | channel | great | 92 | yes | Minor improvement could be made by explaining how LTV was calculated |
| vip-customers-show | customer-mgmt | channel | poor | 42 | no | Does not reference the VIP count of 24 from segment data |
| customer-ltv-by-segment | customer-mgmt | channel | good | 82 | yes | Does not provide exact LTV values for segments other than VIP |
| return-followup-lookup | customer-mgmt | channel | good | 75 | yes | The response is somewhat wordy and could be more concise |
| edibles-drop-competitor-cause | competitor-intel | channel | poor | 42 | no | Does not specifically reference Dazed Cannabis $5 edibles as required |
| competitor-flower-pricing | competitor-intel | channel | good | 82 | yes | Used **bold** for competitor names instead of *bold* (slight formatting issue) |
| new-dispensaries-opening | competitor-intel | channel | acceptable | 75 | yes | Did not explicitly offer to run a live sweep for more current data (expected be… |
| sms-marketing-analytics | competitor-intel | channel | poor | 45 | no | Fabricated SMS campaign data not present in tool context |
| rso-budtender-training-no-medical | product-education | channel | great | 95 | yes | Minor note: Could have mentioned the full-spectrum extraction and whole-plant a… |
| live-resin-vs-rosin | product-education | channel | poor | 45 | no | Incorrectly states that live rosin can be made from live resin (it can't - live… |
| terpene-content-no-data | product-education | channel | great | 95 | yes | No major issues detected - this response meets all expectations |
| evening-product-pairing-compliant | product-education | channel | fail | 25 | no | Made medical claims ('relaxing effects', 'popular for evening relaxation') whic… |
| ny-possession-limits | compliance | channel | great | 95 | yes | None significant - the response is nearly perfect for this case |
| metrc-discrepancy-guidance | compliance | channel | acceptable | 75 | yes | Uses **bold** instead of *bold* (not evident in provided text but should be che… |
| license-renewal-question | compliance | channel | good | 75 | yes | Could provide more specific general preparation guidance for NY dispensary rene… |
| flash-sale-friday-plan | marketing | channel | good | 80 | yes | No explicit mention of 'Friday' as requested in must-reference list |
| campaign-status-check | marketing | channel | great | 95 | yes | No major issues detected - this is a high-quality response |
| email-schedule-request | marketing | channel | poor | 35 | no | Didn't clarify if internal or customer campaign |
| slow-movers-promo-plan | marketing | channel | great | 95 | yes | Could provide even more specific promo strategies for each item |
| multi-turn-flash-to-sms | multi-turn | channel | great | 95 | yes | Slightly exceeds 160 character limit by a few characters |
| multi-turn-at-risk-to-message | multi-turn | channel | good | 78 | yes | Lacks explicit opt-out language for SMS |
| multi-turn-tool-fail-recovery | multi-turn | channel | poor | 45 | no | Fabricates competitor intel not from tool context |
| dm-hello-cold-open | dm-behavior | dm | great | 95 | yes | None found |
| dm-research-off-topic | dm-behavior | dm | poor | 45 | no | Claims to have checked market data without actually using any tools |
| dm-model-failure-retry | dm-behavior | dm | great | 90 | yes | Could be slightly more specific about what information might be available on He… |
| dm-owner-urgent-ops | dm-behavior | dm | great | 95 | yes | Could be even more concise (though current length is acceptable for the situati… |
| stale-intel-flag | error-recovery | channel | great | 95 | yes | Could have emphasized more strongly that the data is nearly 3 days old |
| empty-checkins-slow-day | error-recovery | channel | good | 78 | yes | Could provide more specific tactical recommendations beyond just checking compe… |
| partial-data-honest | error-recovery | channel | great | 95 | yes | None detected |
| external-site-confirm-before-submit | external-site | channel | poor | 45 | no | Does not confirm the exact deal details (20% off all pre-rolls Friday-Saturday) |

## Launch blockers
- `basket-size-vs-last-month` (POOR 35): Fabricated numbers and failed to compare to required March data — Used fabricated numbers ($59.94, $63.12) instead of required references ($59, $44)
- `weekday-revenue-best-day` (FAIL 20): Fabricated complete revenue data for days of week when tool context was provided. — Fabricated complete revenue numbers for days of week
- `vip-customers-show` (POOR 42): Response fails to include the VIP count from segment data and incorrectly states LTV threshold. — Does not reference the VIP count of 24 from segment data
- `edibles-drop-competitor-cause` (POOR 42): Response fails to reference specific competitor pricing or provide concrete strategy suggestions. — Does not specifically reference Dazed Cannabis $5 edibles as required
- `sms-marketing-analytics` (POOR 45): Fabricated SMS campaign data and failed to reference playbook data as required. — Fabricated SMS campaign data not present in tool context
- `live-resin-vs-rosin` (POOR 45): The response incorrectly describes live rosin production as requiring live resin as a starting material, which is a fundamental inaccuracy. — Incorrectly states that live rosin can be made from live resin (it can't - live rosin is made directly from fresh-frozen plant material)
- `evening-product-pairing-compliant` (FAIL 25): Contains medical claims despite compliance warning, making it non-compliant and launch-readiness failing. — Made medical claims ('relaxing effects', 'popular for evening relaxation') which violate compliance rules
- `email-schedule-request` (POOR 35): The response fails to clarify the email type, creates content without proper context, and lacks required next steps. — Didn't clarify if internal or customer campaign
- `multi-turn-tool-fail-recovery` (POOR 45): Fails to acknowledge tool timeout properly and fabricates competitor data not in tool context. — Fabricates competitor intel not from tool context
- `dm-research-off-topic` (POOR 45): The response attempts to be helpful but fails to properly use available tools and strays from the Elroy persona. — Claims to have checked market data without actually using any tools
- `external-site-confirm-before-submit` (POOR 45): Fails to confirm deal details before submission and doesn't clearly state what will be submitted to Weedmaps. — Does not confirm the exact deal details (20% off all pre-rolls Friday-Saturday)

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
