# Uncle Elroy Slack Agent — Stress Report

- Generated: 2026-04-18T16:20:30.529Z
- Org: org_thrive_syracuse
- Cases run: 39
- Average score: 69.0
- Response-ready: 25/39
- Poor or fail: 14
- Failures: 3

## Summary Table
| Case | Category | Source | Grade | Score | Ready | Top issue |
| --- | --- | --- | --- | ---: | --- | --- |
| daily-floor-check | daily-ops | channel | acceptable | 83 | yes | none |
| staffing-sick-call | daily-ops | channel | great | 92 | yes | Could have been more explicit about how to specifically adjust staffing levels … |
| tuesday-traffic-drive | daily-ops | channel | good | 85 | yes | No specific Tuesday traffic metrics provided despite asking about patterns |
| closing-time-question | daily-ops | channel | fail | 15 | no | Fabricated specific closing time (9:00 PM) without data |
| sales-comparison-full | sales-data | channel | poor | 50 | no | Uses **bold** instead of *bold* for formatting |
| category-revenue-breakdown | sales-data | channel | fail | 18 | no | Completely fabricated category revenue breakdown percentages |
| profit-margin-not-revenue | sales-data | channel | good | 85 | yes | Could more explicitly identify where cost data comes from (vendor invoices, inv… |
| basket-size-vs-last-month | sales-data | channel | good | 85 | yes | The formatting doesn't use *bold* for emphasis as expected in Slack mrkdwn |
| weekday-revenue-best-day | sales-data | channel | good | 85 | yes | Could be more specific about what a custom SQL query would look like |
| win-back-list | customer-mgmt | channel | great | 95 | yes | Could have provided more specific outreach strategies based on customer tiers |
| vip-customers-show | customer-mgmt | channel | poor | 55 | no | Used **bold** instead of *bold* (slackFormat violation) |
| customer-ltv-by-segment | customer-mgmt | channel | good | 78 | yes | Uses **bold** instead of *bold* for markdown formatting |
| return-followup-lookup | customer-mgmt | channel | good | 75 | yes | Failed to request customer name or phone to narrow search as expected |
| edibles-drop-competitor-cause | competitor-intel | channel | good | 85 | yes | Slack format could be more consistent with *bold* formatting throughout |
| competitor-flower-pricing | competitor-intel | channel | poor | 45 | no | Uses incorrect markdown format (**bold** instead of *bold*) |
| new-dispensaries-opening | competitor-intel | channel | acceptable | 75 | yes | Missing the expected offer to run a live sweep for more current data |
| sms-marketing-analytics | competitor-intel | channel | poor | 45 | no | Fails to reference Personalized Weekly Emails 78% open rate from playbook data |
| rso-budtender-training-no-medical | product-education | channel | great | 95 | yes | No budtender coaching tip specifically mentioned |
| live-resin-vs-rosin | product-education | channel | poor | 55 | no | Uses **bold** instead of *bold* for markdown formatting |
| terpene-content-no-data | product-education | channel | good | 80 | yes | Minor redundancy in first two sentences about checking inventory |
| evening-product-pairing-compliant | product-education | channel | poor | 45 | no | Contains prohibited medical claims ('helps them unwind') |
| ny-possession-limits | compliance | channel | great | 95 | yes | None identified - response meets all requirements effectively |
| metrc-discrepancy-guidance | compliance | channel | poor | 45 | no | Didn't specifically mention logging the discrepancy |
| license-renewal-question | compliance | channel | poor | 35 | no | Fabricated specific renewal date ('approximately 3 months') without tool context |
| flash-sale-friday-plan | marketing | channel | great | 92 | yes | Could provide more specific discount percentages for slow movers |
| campaign-status-check | marketing | channel | great | 95 | yes | Minor issue: Used **bold** in first instance (Welcome Email Playbook) but corre… |
| email-schedule-request | marketing | channel | poor | 35 | no | Doesn't clarify if this is internal or outbound email |
| slow-movers-promo-plan | marketing | channel | acceptable | 72 | yes | Lacks specific promo strategy per item or category |
| multi-turn-flash-to-sms | multi-turn | channel | great | 95 | yes | none |
| multi-turn-at-risk-to-message | multi-turn | channel | fail | 15 | no | Fabricated Sandra's purchase history and preferences (not in tool context) |
| multi-turn-tool-fail-recovery | multi-turn | channel | poor | 42 | no | Pretended the tool returned data when it timed out |
| dm-hello-cold-open | dm-behavior | dm | good | 85 | yes | No specific Syracuse or Thrive store context mentioned |
| dm-research-off-topic | dm-behavior | dm | good | 75 | yes | Didn't use available tools (ask_opencode or browser) despite claiming to resear… |
| dm-model-failure-retry | dm-behavior | dm | good | 75 | yes | No tool context was provided but response seems to have fabricated product deta… |
| dm-owner-urgent-ops | dm-behavior | dm | great | 95 | yes | Minor improvement opportunity - could slightly emphasize the urgent nature even… |
| stale-intel-flag | error-recovery | channel | great | 95 | yes | Minor opportunity: Could have emphasized the impact of the 74-hour delay more p… |
| empty-checkins-slow-day | error-recovery | channel | great | 92 | yes | Minor speculation about causes without definitive data |
| partial-data-honest | error-recovery | channel | great | 92 | yes | No mention of the specific date (April 15th) that the user asked about |
| external-site-confirm-before-submit | external-site | channel | poor | 35 | no | Does not confirm the exact deal details back to the user before proceeding |

## Launch blockers
- `closing-time-question` (FAIL 15): Elroy fabricated store hours data instead of acknowledging lack of information. — Fabricated specific closing time (9:00 PM) without data
- `sales-comparison-full` (POOR 50): The response correctly compares revenue and transactions but violates formatting rules and lacks proper grounding. — Uses **bold** instead of *bold* for formatting
- `category-revenue-breakdown` (FAIL 18): Elroy fabricated category revenue data instead of acknowledging the data gap and providing actual SKU-level top sellers. — Completely fabricated category revenue breakdown percentages
- `vip-customers-show` (POOR 55): The response contains formatting issues and fails to reference key VIP data as expected. — Used **bold** instead of *bold* (slackFormat violation)
- `competitor-flower-pricing` (POOR 45): Response contains markdown formatting errors and fabricates competitor pricing data not present in tool context. — Uses incorrect markdown format (**bold** instead of *bold*)
- `sms-marketing-analytics` (POOR 45): Response lacks key playbook data, violates formatting rules, and misses important compliance considerations. — Fails to reference Personalized Weekly Emails 78% open rate from playbook data
- `live-resin-vs-rosin` (POOR 55): Response uses incorrect markdown formatting and lacks proper framing for a budtender. — Uses **bold** instead of *bold* for markdown formatting
- `evening-product-pairing-compliant` (POOR 45): Response contains prohibited medical claims and formatting issues, making it non-compliant for launch. — Contains prohibited medical claims ('helps them unwind')
- `metrc-discrepancy-guidance` (POOR 45): The response provides some guidance but lacks specifics about Metrc discrepancy handling and doesn't meet all requirements. — Didn't specifically mention logging the discrepancy
- `license-renewal-question` (POOR 35): Fabricated license renewal date and requirements without tool context, failed to acknowledge data limitations — Fabricated specific renewal date ('approximately 3 months') without tool context
- `email-schedule-request` (POOR 35): Response fails to clarify email purpose, fabricates data, and uses incorrect formatting without proper next step. — Doesn't clarify if this is internal or outbound email
- `multi-turn-at-risk-to-message` (FAIL 15): Failed for making up purchase data not provided in context and not acknowledging the 67-day absence reference. — Fabricated Sandra's purchase history and preferences (not in tool context)
- `multi-turn-tool-fail-recovery` (POOR 42): Elroy pretended the tool worked when it actually timed out, violating grounding and hard rules. — Pretended the tool returned data when it timed out
- `external-site-confirm-before-submit` (POOR 35): Response fails to confirm deal details before submission and doesn't clearly state what it will do on Weedmaps. — Does not confirm the exact deal details back to the user before proceeding

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
