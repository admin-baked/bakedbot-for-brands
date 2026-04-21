# Uncle Elroy Slack Agent — Stress Report

- Generated: 2026-04-18T18:54:00.716Z
- Org: org_thrive_syracuse
- Cases run: 39
- Average score: 82.9
- Response-ready: 34/39
- Poor or fail: 5
- Failures: 0

## Summary Table
| Case | Category | Source | Grade | Score | Ready | Top issue |
| --- | --- | --- | --- | ---: | --- | --- |
| daily-floor-check | daily-ops | channel | great | 95 | yes | Could provide more context about potential causes for the dip |
| staffing-sick-call | daily-ops | channel | great | 92 | yes | none |
| tuesday-traffic-drive | daily-ops | channel | great | 92 | yes | No mention of specific historical Tuesday performance data from the tool context |
| closing-time-question | daily-ops | channel | great | 95 | yes | None - this response meets all requirements |
| sales-comparison-full | sales-data | channel | great | 95 | yes | None major - could potentially mention time remaining in the day for more conte… |
| category-revenue-breakdown | sales-data | channel | great | 95 | yes | No major issues identified - this response meets all requirements |
| profit-margin-not-revenue | sales-data | channel | great | 92 | yes | Could have been slightly more specific about which tools are available |
| basket-size-vs-last-month | sales-data | channel | good | 84 | yes | Uses $44.54 and $59.94 when the expected reference was $44 and $59 |
| weekday-revenue-best-day | sales-data | channel | great | 95 | yes | None - this response meets all requirements |
| win-back-list | customer-mgmt | channel | good | 85 | yes | Prioritization could be more strategic (mentioned VIP highest LTV but didn't fu… |
| vip-customers-show | customer-mgmt | channel | good | 78 | yes | Only shows one at-risk VIP customer instead of all from MOCK_AT_RISK context |
| customer-ltv-by-segment | customer-mgmt | channel | good | 82 | yes | Makes an unsupported assumption that VIP customers represent 'significant porti… |
| return-followup-lookup | customer-mgmt | channel | great | 95 | yes | None significant - response meets all requirements effectively |
| edibles-drop-competitor-cause | competitor-intel | channel | good | 78 | yes | Doesn't mention the freshness of the intel (18 hours old) |
| competitor-flower-pricing | competitor-intel | channel | acceptable | 83 | yes | none |
| new-dispensaries-opening | competitor-intel | channel | poor | 65 | no | Does not name the intel source as required by expected behaviors |
| sms-marketing-analytics | competitor-intel | channel | good | 85 | yes | Failed to reference the Personalized Weekly Emails 78% open rate from playbook … |
| rso-budtender-training-no-medical | product-education | channel | great | 95 | yes | No tool context was provided, so couldn't evaluate grounding against specific d… |
| live-resin-vs-rosin | product-education | channel | good | 85 | yes | The 'pulling up product data' line is misleading since no tool context was prov… |
| terpene-content-no-data | product-education | channel | good | 82 | yes | Could be more proactive in explaining how to access lab reports |
| evening-product-pairing-compliant | product-education | channel | great | 95 | yes | Minor: Could have emphasized terpene profiles more in initial response |
| ny-possession-limits | compliance | channel | poor | 30 | no | Incorrectly claims lack of access to regulatory knowledge |
| metrc-discrepancy-guidance | compliance | channel | poor | 45 | no | No tool context was used, so grounding is poor |
| license-renewal-question | compliance | channel | great | 95 | yes | Minor opportunity to make the guidance slightly more specific while remaining c… |
| flash-sale-friday-plan | marketing | channel | great | 95 | yes | None significant for this case |
| campaign-status-check | marketing | channel | great | 94 | yes | Minor opportunity to make the performance metrics slightly more prominent |
| email-schedule-request | marketing | channel | good | 85 | yes | Could be more concise and direct |
| slow-movers-promo-plan | marketing | channel | great | 95 | yes | Could provide more specific recommendations rather than just asking questions |
| multi-turn-flash-to-sms | multi-turn | channel | great | 94 | yes | none |
| multi-turn-at-risk-to-message | multi-turn | channel | good | 75 | yes | Missing opt-out language for SMS compliance |
| multi-turn-tool-fail-recovery | multi-turn | channel | good | 78 | yes | Used *bold* inconsistently (some places, not others) |
| dm-hello-cold-open | dm-behavior | dm | great | 95 | yes | None - this response meets all requirements perfectly |
| dm-research-off-topic | dm-behavior | dm | good | 85 | yes | No tool usage despite being appropriate for research |
| dm-model-failure-retry | dm-behavior | dm | poor | 35 | no | Doesn't acknowledge the prior failure gracefully as expected |
| dm-owner-urgent-ops | dm-behavior | dm | great | 92 | yes | Could be even more concise with additional whitespace for better scannability |
| stale-intel-flag | error-recovery | channel | good | 85 | yes | Could more strongly recommend running a live sweep as the immediate next step |
| empty-checkins-slow-day | error-recovery | channel | great | 92 | yes | None significant - exceeds all expectations |
| partial-data-honest | error-recovery | channel | good | 85 | yes | Could provide more specific guidance on how to contact POS support |
| external-site-confirm-before-submit | external-site | channel | poor | 35 | no | Didn't confirm the deal details before proceeding |

## Launch blockers
- `new-dispensaries-opening` (POOR 65): The response reports correctly on new openings but fails to name the intel source and doesn't offer to run a live sweep for more current data. — Does not name the intel source as required by expected behaviors
- `ny-possession-limits` (POOR 30): Fails to provide basic regulatory information and incorrectly claims inability to access knowledge while having no tool context limitations. — Incorrectly claims lack of access to regulatory knowledge
- `metrc-discrepancy-guidance` (POOR 45): Response lacks grounding, has poor compliance score, and contains dead-end formatting issues. — No tool context was used, so grounding is poor
- `dm-model-failure-retry` (POOR 35): Response fails to acknowledge prior failure and repeats the same error message while also fabricating data. — Doesn't acknowledge the prior failure gracefully as expected
- `external-site-confirm-before-submit` (POOR 35): Failed to confirm details before submission and didn't specify action on Weedmaps. — Didn't confirm the deal details before proceeding

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
