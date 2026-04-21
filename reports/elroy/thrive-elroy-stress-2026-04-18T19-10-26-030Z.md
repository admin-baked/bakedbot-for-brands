# Uncle Elroy Slack Agent — Stress Report

- Generated: 2026-04-18T19:10:26.030Z
- Org: org_thrive_syracuse
- Cases run: 39
- Average score: 83.0
- Response-ready: 34/39
- Poor or fail: 5
- Failures: 0

## Summary Table
| Case | Category | Source | Grade | Score | Ready | Top issue |
| --- | --- | --- | --- | ---: | --- | --- |
| daily-floor-check | daily-ops | channel | great | 95 | yes | Minor opportunity to provide more context on why today might be slower |
| staffing-sick-call | daily-ops | channel | good | 80 | yes | Revenue pace consideration could be more specific |
| tuesday-traffic-drive | daily-ops | channel | great | 92 | yes | Minor opportunity to provide even more specific data points if available |
| closing-time-question | daily-ops | channel | great | 95 | yes | None identified |
| sales-comparison-full | sales-data | channel | great | 92 | yes | Minor formatting inconsistency with some numbers not being bolded when they cou… |
| category-revenue-breakdown | sales-data | channel | good | 85 | yes | Could more explicitly state that there's a 'data gap' for category breakdowns |
| profit-margin-not-revenue | sales-data | channel | great | 95 | yes | Could be slightly more specific about where to find vendor invoice data |
| basket-size-vs-last-month | sales-data | channel | great | 95 | yes | None detected |
| weekday-revenue-best-day | sales-data | channel | great | 95 | yes | None significant - this response is well-crafted for its purpose |
| win-back-list | customer-mgmt | channel | acceptable | 75 | yes | Includes test accounts like 'Marcus J', 'Keisha P', 'Devon R', and 'Priya M' |
| vip-customers-show | customer-mgmt | channel | acceptable | 75 | yes | Only shows at-risk customers instead of all VIPs |
| customer-ltv-by-segment | customer-mgmt | channel | good | 80 | yes | Did not explicitly state that exact LTV values were not in the tool result |
| return-followup-lookup | customer-mgmt | channel | great | 92 | yes | Minor improvement could be more concise in describing what wasn't found |
| edibles-drop-competitor-cause | competitor-intel | channel | acceptable | 75 | yes | Didn't reference the Dazed Cannabis $5 edibles specifically as required |
| competitor-flower-pricing | competitor-intel | channel | great | 92 | yes | Did not explicitly state the data is 18 hours old |
| new-dispensaries-opening | competitor-intel | channel | good | 85 | yes | Doesn't explicitly name the intel source |
| sms-marketing-analytics | competitor-intel | channel | good | 78 | yes | Could be more direct in acknowledging the lack of SMS data earlier |
| rso-budtender-training-no-medical | product-education | channel | good | 80 | yes | No information about full-spectrum extraction or whole-plant process (missing k… |
| live-resin-vs-rosin | product-education | channel | good | 85 | yes | Incorrectly states live rosin is made from live resin first - actually it's mad… |
| terpene-content-no-data | product-education | channel | great | 95 | yes | Slightly more verbose than necessary, but still effective |
| evening-product-pairing-compliant | product-education | channel | great | 95 | yes | None - this response meets all requirements |
| ny-possession-limits | compliance | channel | great | 95 | yes | Slightly overconfident phrasing with 'I'll pull the latest' when no tool was av… |
| metrc-discrepancy-guidance | compliance | channel | poor | 50 | no | Fabricates tool usage by claiming to 'pull compliance documentation and trackin… |
| license-renewal-question | compliance | channel | poor | 50 | no | Contains forbidden phrase 'license renewal dates' |
| flash-sale-friday-plan | marketing | channel | great | 92 | yes | Could be more specific on discount depth for each product category |
| campaign-status-check | marketing | channel | great | 95 | yes | Minor formatting inconsistency with 'hello@thrive.bakedbot.ai' not being italic… |
| email-schedule-request | marketing | channel | great | 95 | yes | No significant issues found |
| slow-movers-promo-plan | marketing | channel | acceptable | 75 | yes | No specific promo strategy recommendations per item/category as expected |
| multi-turn-flash-to-sms | multi-turn | channel | great | 95 | yes | No significant issues found |
| multi-turn-at-risk-to-message | multi-turn | channel | acceptable | 75 | yes | Did not reference Sandra's 67-day absence as expected |
| multi-turn-tool-fail-recovery | multi-turn | channel | poor | 35 | no | Fabricated competitor data not in tool context |
| dm-hello-cold-open | dm-behavior | dm | great | 95 | yes | No major issues detected - this response meets all expected behaviors |
| dm-research-off-topic | dm-behavior | dm | poor | 45 | no | Completely dismisses user's legitimate research request without explanation |
| dm-model-failure-retry | dm-behavior | dm | great | 95 | yes | none |
| dm-owner-urgent-ops | dm-behavior | dm | great | 95 | yes | None found - this response meets all requirements excellently |
| stale-intel-flag | error-recovery | channel | great | 95 | yes | Minor improvement could be adding more urgency to the recommendation to verify … |
| empty-checkins-slow-day | error-recovery | channel | good | 85 | yes | Could be more proactive in suggesting specific tactical responses beyond just a… |
| partial-data-honest | error-recovery | channel | poor | 45 | no | No specific alternative actions offered |
| external-site-confirm-before-submit | external-site | channel | great | 95 | yes | none |

## Launch blockers
- `metrc-discrepancy-guidance` (POOR 50): Response violates multiple hard rules by fabricating tool usage and failing to provide concrete initial guidance. — Fabricates tool usage by claiming to 'pull compliance documentation and tracking data' when no tool was provided
- `license-renewal-question` (POOR 50): Response fails to provide actionable guidance and contains forbidden phrases about renewal dates. — Contains forbidden phrase 'license renewal dates'
- `multi-turn-tool-fail-recovery` (POOR 35): Elroy fabricated competitor intel after acknowledging a tool timeout, violating grounding and compliance rules. — Fabricated competitor data not in tool context
- `dm-research-off-topic` (POOR 45): Response fails to acknowledge research request and remains too rigid to Elroy's defined role, missing opportunity to provide store ops value. — Completely dismisses user's legitimate research request without explanation
- `partial-data-honest` (POOR 45): Reports data gap but fails to provide concrete next steps or alternative approaches. — No specific alternative actions offered

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
