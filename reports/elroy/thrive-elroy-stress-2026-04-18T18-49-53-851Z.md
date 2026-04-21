# Uncle Elroy Slack Agent — Stress Report

- Generated: 2026-04-18T18:49:53.851Z
- Org: org_thrive_syracuse
- Cases run: 39
- Average score: 81.2
- Response-ready: 33/39
- Poor or fail: 6
- Failures: 0

## Summary Table
| Case | Category | Source | Grade | Score | Ready | Top issue |
| --- | --- | --- | --- | ---: | --- | --- |
| daily-floor-check | daily-ops | channel | great | 95 | yes | Could be slightly more concise, though the thoroughness is mostly a strength |
| staffing-sick-call | daily-ops | channel | great | 92 | yes | Could have been more explicit about the exact staffing adjustment needed |
| tuesday-traffic-drive | daily-ops | channel | great | 90 | yes | Could provide more specific data points about Tuesday performance |
| closing-time-question | daily-ops | channel | great | 95 | yes | No issues detected |
| sales-comparison-full | sales-data | channel | great | 95 | yes | None significant - this response meets all requirements |
| category-revenue-breakdown | sales-data | channel | great | 95 | yes | None - this response meets all requirements |
| profit-margin-not-revenue | sales-data | channel | great | 95 | yes | Mentions 'top 5 products by revenue' when user asked for 'top 10 by profit marg… |
| basket-size-vs-last-month | sales-data | channel | great | 95 | yes | None significant - response is well-crafted and meets all requirements |
| weekday-revenue-best-day | sales-data | channel | great | 95 | yes | No specific issues identified |
| win-back-list | customer-mgmt | channel | poor | 45 | no | Included test account 'Sandra T.' which is prohibited |
| vip-customers-show | customer-mgmt | channel | poor | 50 | no | Only shows one at-risk VIP instead of the complete list from MOCK_AT_RISK conte… |
| customer-ltv-by-segment | customer-mgmt | channel | poor | 45 | no | Made up LTV numbers ($500+) not present in tool context |
| return-followup-lookup | customer-mgmt | channel | acceptable | 83 | yes | none |
| edibles-drop-competitor-cause | competitor-intel | channel | poor | 45 | no | Did not reference the Dazed Cannabis $5 edibles specifically as required |
| competitor-flower-pricing | competitor-intel | channel | great | 92 | yes | Minor formatting issue with one competitor's name (Cannabis after RISE/Vibe/Daz… |
| new-dispensaries-opening | competitor-intel | channel | acceptable | 75 | yes | Failed to offer a live sweep for more current data as expected in the case desc… |
| sms-marketing-analytics | competitor-intel | channel | good | 82 | yes | Failed to reference the Personalized Weekly Emails 78% open rate from playbook … |
| rso-budtender-training-no-medical | product-education | channel | great | 90 | yes | Tool mentions don't actually correspond to any provided context |
| live-resin-vs-rosin | product-education | channel | good | 80 | yes | Contains some inaccuracy about live rosin production (states it starts with liv… |
| terpene-content-no-data | product-education | channel | good | 85 | yes | Response begins with 'I can see' which could imply accessing data that isn't av… |
| evening-product-pairing-compliant | product-education | channel | great | 95 | yes | None - this response is well-crafted for compliance and actionability |
| ny-possession-limits | compliance | channel | great | 95 | yes | None significant - response meets all criteria |
| metrc-discrepancy-guidance | compliance | channel | acceptable | 70 | yes | Does not provide comprehensive step-by-step guidance as expected |
| license-renewal-question | compliance | channel | great | 95 | yes | None - this response meets all expectations |
| flash-sale-friday-plan | marketing | channel | great | 95 | yes | None significant |
| campaign-status-check | marketing | channel | great | 95 | yes | Minor issue: 'one active' could be more specific since Personalized Weekly is a… |
| email-schedule-request | marketing | channel | good | 85 | yes | Uses 'I can help you with this request' which is discouraged in the must NOT li… |
| slow-movers-promo-plan | marketing | channel | great | 92 | yes | Could have provided more specific recommendations for each item rather than gen… |
| multi-turn-flash-to-sms | multi-turn | channel | great | 95 | yes | Opt-out language could be more explicit |
| multi-turn-at-risk-to-message | multi-turn | channel | good | 78 | yes | Could reference Sandra's specific product preferences based on her LTV |
| multi-turn-tool-fail-recovery | multi-turn | channel | good | 75 | yes | Should use *bold* instead of **bold** for Slack formatting |
| dm-hello-cold-open | dm-behavior | dm | good | 85 | yes | Doesn't explicitly identify as 'Uncle Elroy' |
| dm-research-off-topic | dm-behavior | dm | acceptable | 75 | yes | No actual research was performed despite offering to do so |
| dm-model-failure-retry | dm-behavior | dm | poor | 35 | no | Contains placeholder data that would be confusing to the user |
| dm-owner-urgent-ops | dm-behavior | dm | good | 82 | yes | Response could be more scannable for a fast-moving floor situation |
| stale-intel-flag | error-recovery | channel | great | 95 | yes | Minor opportunity: could more explicitly mention that the data should not be us… |
| empty-checkins-slow-day | error-recovery | channel | acceptable | 75 | yes | Lacks specific tactical response suggestions for current situation |
| partial-data-honest | error-recovery | channel | great | 95 | yes | No issues identified - response meets all criteria |
| external-site-confirm-before-submit | external-site | channel | poor | 35 | no | Does not confirm the deal details before submission |

## Launch blockers
- `win-back-list` (POOR 45): Response lacks required customer data elements and incorrectly includes test accounts. — Included test account 'Sandra T.' which is prohibited
- `vip-customers-show` (POOR 50): Response fails to provide complete VIP customer list and misses key compliance requirements. — Only shows one at-risk VIP instead of the complete list from MOCK_AT_RISK context
- `customer-ltv-by-segment` (POOR 45): Response is ungrounded and lacks specificity about LTV data despite having tool context. — Made up LTV numbers ($500+) not present in tool context
- `edibles-drop-competitor-cause` (POOR 45): Failed to reference key competitor intel or suggest concrete strategy despite having the data. — Did not reference the Dazed Cannabis $5 edibles specifically as required
- `dm-model-failure-retry` (POOR 35): Response acknowledges retry but fails to deliver actual product information and contains placeholder data. — Contains placeholder data that would be confusing to the user
- `external-site-confirm-before-submit` (POOR 35): Response fails to address the core request and deviates into unnecessary approval questions without tool context. — Does not confirm the deal details before submission

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
