# Uncle Elroy Slack Agent — Stress Report

- Generated: 2026-04-18T17:41:29.373Z
- Org: org_thrive_syracuse
- Cases run: 39
- Average score: 74.1
- Response-ready: 29/39
- Poor or fail: 10
- Failures: 3

## Summary Table
| Case | Category | Source | Grade | Score | Ready | Top issue |
| --- | --- | --- | --- | ---: | --- | --- |
| daily-floor-check | daily-ops | channel | great | 95 | yes | Could have mentioned the transaction gap (47 yesterday vs 28 today) more promin… |
| staffing-sick-call | daily-ops | channel | great | 95 | yes | Minor opportunity to more directly connect staffing recommendations to current … |
| tuesday-traffic-drive | daily-ops | channel | great | 95 | yes | Minor: Could have more explicitly connected the promotions to Tuesday traffic p… |
| closing-time-question | daily-ops | channel | fail | 20 | no | Fabricates specific closing time (10 PM) when no tool context was provided |
| sales-comparison-full | sales-data | channel | great | 92 | yes | No major issues detected |
| category-revenue-breakdown | sales-data | channel | poor | 40 | no | Ignores provided tool context and makes up category revenue numbers |
| profit-margin-not-revenue | sales-data | channel | fail | 25 | no | Fabricated margin percentages without actual cost data |
| basket-size-vs-last-month | sales-data | channel | great | 95 | yes | Minor discrepancy with exact numbers from prompt (should reference $59 and $44 … |
| weekday-revenue-best-day | sales-data | channel | good | 85 | yes | Could be more proactive in offering to help set up the custom report |
| win-back-list | customer-mgmt | channel | good | 82 | yes | Contains a minor compliance issue with the phrase 'Keisha's definitely your top… |
| vip-customers-show | customer-mgmt | channel | good | 85 | yes | Missing the expected offer to pull a specific win-back list |
| customer-ltv-by-segment | customer-mgmt | channel | good | 82 | yes | LTV figures appear to be estimates rather than exact numbers from tool context |
| return-followup-lookup | customer-mgmt | channel | good | 78 | yes | Could proactively ask for customer name/phone to narrow search |
| edibles-drop-competitor-cause | competitor-intel | channel | good | 82 | yes | Should have specifically mentioned Dazed Cannabis' $5 edibles (said $5-$8 inste… |
| competitor-flower-pricing | competitor-intel | channel | great | 95 | yes | Could be more explicit about the 18-hour freshness reference |
| new-dispensaries-opening | competitor-intel | channel | good | 83 | yes | Doesn't offer to run a live sweep for more current data as expected in case des… |
| sms-marketing-analytics | competitor-intel | channel | acceptable | 72 | yes | Contains fabricated data not in tool context (SMS metrics) |
| rso-budtender-training-no-medical | product-education | channel | poor | 55 | no | Fabricates tool context mentions (checking inventory, pulling up training mater… |
| live-resin-vs-rosin | product-education | channel | great | 95 | yes | None significant |
| terpene-content-no-data | product-education | channel | great | 100 | yes | none |
| evening-product-pairing-compliant | product-education | channel | poor | 45 | no | Contains medical framing with 'evening chill effect' |
| ny-possession-limits | compliance | channel | great | 95 | yes | Fabricates the 'Pulling latest NY cannabis regulations...' action since no tool… |
| metrc-discrepancy-guidance | compliance | channel | good | 78 | yes | Doesn't specifically mention New York's Metrc requirements or the OCM |
| license-renewal-question | compliance | channel | fail | 18 | no | Fabricated the October 15th renewal date without tool context |
| flash-sale-friday-plan | marketing | channel | poor | 45 | no | Ignores the provided tool context about Bouket and Friday |
| campaign-status-check | marketing | channel | great | 95 | yes | None significant - response is high quality and meets all requirements |
| email-schedule-request | marketing | channel | poor | 30 | no | Did not clarify whether this is internal team communication or outbound custome… |
| slow-movers-promo-plan | marketing | channel | good | 78 | yes | No specific promo strategies recommended per item/category |
| multi-turn-flash-to-sms | multi-turn | channel | great | 92 | yes | None - response meets all requirements |
| multi-turn-at-risk-to-message | multi-turn | channel | good | 85 | yes | Doesn't explicitly mention the 67-day absence from prior context |
| multi-turn-tool-fail-recovery | multi-turn | channel | poor | 40 | no | Conducted unauthorized web search instead of offering alternatives (cached data… |
| dm-hello-cold-open | dm-behavior | dm | great | 100 | yes | none |
| dm-research-off-topic | dm-behavior | dm | good | 85 | yes | No tool usage (ask_opcode or browser) despite claiming to 'pull up intel' |
| dm-model-failure-retry | dm-behavior | dm | good | 75 | yes | Fabricates data about Hermes Agent (it's actually an AI agent, not a strain) |
| dm-owner-urgent-ops | dm-behavior | dm | great | 95 | yes | None - response meets all criteria perfectly |
| stale-intel-flag | error-recovery | channel | good | 82 | yes | Staleness warning could be more prominent at the beginning |
| empty-checkins-slow-day | error-recovery | channel | good | 75 | yes | Doesn't suggest specific tactical responses (promo, reaching out to at-risk cus… |
| partial-data-honest | error-recovery | channel | good | 85 | yes | Could provide more specific guidance on accessing POS data directly |
| external-site-confirm-before-submit | external-site | channel | poor | 40 | no | Does not confirm the exact deal details as required |

## Launch blockers
- `closing-time-question` (FAIL 20): The response fabricates closing time data despite having no tool context available. — Fabricates specific closing time (10 PM) when no tool context was provided
- `category-revenue-breakdown` (POOR 40): Response ignores tool context completely, makes up category totals not in the data, and fails to acknowledge data limitations. — Ignores provided tool context and makes up category revenue numbers
- `profit-margin-not-revenue` (FAIL 25): Failed compliance by fabricating profit margin data without cost basis and violating explicit instructions about not using 25% margin assumption. — Fabricated margin percentages without actual cost data
- `rso-budtender-training-no-medical` (POOR 55): Response contains major compliance issues and lacks proper grounding, though it follows Slack format. — Fabricates tool context mentions (checking inventory, pulling up training materials) when none was provided
- `evening-product-pairing-compliant` (POOR 45): The response contains several compliance issues and fails to properly frame products for evening use without medical claims. — Contains medical framing with 'evening chill effect'
- `license-renewal-question` (FAIL 18): Failed due to fabricating license renewal date and providing detailed guidance without tool context. — Fabricated the October 15th renewal date without tool context
- `flash-sale-friday-plan` (POOR 45): Poor grounding as it ignores provided tool context and invents new data points. — Ignores the provided tool context about Bouket and Friday
- `email-schedule-request` (POOR 30): Failed to clarify email purpose or follow required workflow, missing critical next steps. — Did not clarify whether this is internal team communication or outbound customer campaign
- `multi-turn-tool-fail-recovery` (POOR 40): Acknowledge tool timeout but failed to adhere to expected behaviors by conducting unauthorized web search. — Conducted unauthorized web search instead of offering alternatives (cached data, try again, or live sweep)
- `external-site-confirm-before-submit` (POOR 40): Response fails to confirm deal details before submission and doesn't clearly state next steps. — Does not confirm the exact deal details as required

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
