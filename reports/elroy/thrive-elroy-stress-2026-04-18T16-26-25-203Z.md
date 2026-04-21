# Uncle Elroy Slack Agent — Stress Report

- Generated: 2026-04-18T16:26:25.203Z
- Org: org_thrive_syracuse
- Cases run: 39
- Average score: 73.6
- Response-ready: 29/39
- Poor or fail: 10
- Failures: 2

## Summary Table
| Case | Category | Source | Grade | Score | Ready | Top issue |
| --- | --- | --- | --- | ---: | --- | --- |
| daily-floor-check | daily-ops | channel | good | 82 | yes | Doesn't explicitly state the revenue gap in dollars ($857 less than yesterday) |
| staffing-sick-call | daily-ops | channel | good | 78 | yes | Missing specific staffing adjustment recommendation (how many budtenders needed… |
| tuesday-traffic-drive | daily-ops | channel | great | 92 | yes | Minor opportunity to quantify expected impact of promotions |
| closing-time-question | daily-ops | channel | fail | 20 | no | Fabricated specific closing time (9:00 PM) without tool data |
| sales-comparison-full | sales-data | channel | poor | 45 | no | Did not provide the comparison the manager requested |
| category-revenue-breakdown | sales-data | channel | poor | 35 | no | Makes up category totals despite tool context showing data gaps |
| profit-margin-not-revenue | sales-data | channel | acceptable | 75 | yes | Does not specifically explain where cost data should come from |
| basket-size-vs-last-month | sales-data | channel | good | 78 | yes | Doesn't use the exact numbers provided in the expected behavior ($59, $44) |
| weekday-revenue-best-day | sales-data | channel | great | 95 | yes | Minor improvement could be explaining what data the POS system would need to ca… |
| win-back-list | customer-mgmt | channel | good | 84 | yes | No specific outreach suggestion provided beyond asking if manager wants message… |
| vip-customers-show | customer-mgmt | channel | good | 80 | yes | Doesn't explicitly exclude test accounts |
| customer-ltv-by-segment | customer-mgmt | channel | poor | 45 | no | Fabricated LTV figures ($500+ for VIP) |
| return-followup-lookup | customer-mgmt | channel | good | 82 | yes | Does not proactively ask for customer name or phone number to narrow the search |
| edibles-drop-competitor-cause | competitor-intel | channel | poor | 45 | no | Failed to specify the exact $5 price point from tool context |
| competitor-flower-pricing | competitor-intel | channel | good | 80 | yes | Contains a compliance risk with premium claims that could be interpreted as hea… |
| new-dispensaries-opening | competitor-intel | channel | great | 95 | yes | Could have explicitly mentioned which tool provided the intel for clarity |
| sms-marketing-analytics | competitor-intel | channel | acceptable | 75 | yes | Contains fabricated SMS metrics not supported by the provided tool context |
| rso-budtender-training-no-medical | product-education | channel | great | 92 | yes | Could benefit from more specific information about the new batch |
| live-resin-vs-rosin | product-education | channel | great | 95 | yes | Could be slightly more concise |
| terpene-content-no-data | product-education | channel | good | 85 | yes | Claims to have pulled menu inventory data when the context states no terpene da… |
| evening-product-pairing-compliant | product-education | channel | poor | 45 | no | Contains medical claims: 'good for evening relaxation' |
| ny-possession-limits | compliance | channel | good | 85 | yes | Claims to have accessed tool context when none was provided |
| metrc-discrepancy-guidance | compliance | channel | acceptable | 83 | yes | none |
| license-renewal-question | compliance | channel | acceptable | 83 | yes | none |
| flash-sale-friday-plan | marketing | channel | great | 92 | yes | Could be more specific about why Friday is strategically chosen for this mix |
| campaign-status-check | marketing | channel | great | 95 | yes | No significant issues - response meets all requirements |
| email-schedule-request | marketing | channel | poor | 35 | no | Never clarified whether this is an internal or external email |
| slow-movers-promo-plan | marketing | channel | good | 80 | yes | No specific promo strategy recommended per item or category |
| multi-turn-flash-to-sms | multi-turn | channel | great | 95 | yes | Minor opportunity to mention exact quantity limits could enhance urgency, but n… |
| multi-turn-at-risk-to-message | multi-turn | channel | poor | 45 | no | Fails to reference the 67-day absence from prior context |
| multi-turn-tool-fail-recovery | multi-turn | channel | good | 75 | yes | References 'Green Therapeutics' and 'CBD Creations' without specifying if this … |
| dm-hello-cold-open | dm-behavior | dm | great | 92 | yes | None - meets all expected behaviors perfectly |
| dm-research-off-topic | dm-behavior | dm | great | 90 | yes | The search is presented as if it happened (with *Searching...* text) but no act… |
| dm-model-failure-retry | dm-behavior | dm | good | 85 | yes | No actual product information provided despite being asked about Hermes Agent |
| dm-owner-urgent-ops | dm-behavior | dm | good | 82 | yes | Response could be more concise for a fast-moving floor situation |
| stale-intel-flag | error-recovery | channel | great | 95 | yes | None significant |
| empty-checkins-slow-day | error-recovery | channel | great | 92 | yes | Could have been slightly more direct in suggesting immediate actions |
| partial-data-honest | error-recovery | channel | fail | 20 | no | Fabricated sales numbers ($12,450 revenue, 287 transactions) for Monday |
| external-site-confirm-before-submit | external-site | channel | poor | 45 | no | Does NOT confirm exact deal details before submission |

## Launch blockers
- `closing-time-question` (FAIL 20): The response fabricates specific closing time without tool data and contains a compliance issue with fabricated store hours. — Fabricated specific closing time (9:00 PM) without tool data
- `sales-comparison-full` (POOR 45): Failed to provide requested comparison data and lacks specific metrics from context. — Did not provide the comparison the manager requested
- `category-revenue-breakdown` (POOR 35): The response makes up category totals and ignores the tool context about data gaps. — Makes up category totals despite tool context showing data gaps
- `customer-ltv-by-segment` (POOR 45): Response lacks specific LTV numbers from tool context and contains fabricated data. — Fabricated LTV figures ($500+ for VIP)
- `edibles-drop-competitor-cause` (POOR 45): Good grounding and actionability but fails to meet key requirements around price point reference and response strategy. — Failed to specify the exact $5 price point from tool context
- `evening-product-pairing-compliant` (POOR 45): Response contains medical claims and uses improper formatting — Contains medical claims: 'good for evening relaxation'
- `email-schedule-request` (POOR 35): Response fails to clarify email purpose and includes fabricated data about weekend specials. — Never clarified whether this is an internal or external email
- `multi-turn-at-risk-to-message` (POOR 45): Response fails to reference Sandra's 67-day absence, lacks opt-out option, and incorrectly claims to have checked purchase history without tool access. — Fails to reference the 67-day absence from prior context
- `partial-data-honest` (FAIL 20): Response contains fabricated sales numbers and revenue data despite acknowledging data gap. — Fabricated sales numbers ($12,450 revenue, 287 transactions) for Monday
- `external-site-confirm-before-submit` (POOR 45): The response lacks explicit confirmation before submission and makes up inventory details not provided in tool context. — Does NOT confirm exact deal details before submission

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
