# Uncle Elroy Slack Agent — Stress Report

- Generated: 2026-04-18T18:57:19.102Z
- Org: org_thrive_syracuse
- Cases run: 39
- Average score: 82.6
- Response-ready: 36/39
- Poor or fail: 3
- Failures: 1

## Summary Table
| Case | Category | Source | Grade | Score | Ready | Top issue |
| --- | --- | --- | --- | ---: | --- | --- |
| daily-floor-check | daily-ops | channel | great | 92 | yes | Could provide more analysis of potential causes for the significant drop |
| staffing-sick-call | daily-ops | channel | great | 90 | yes | Minor opportunity to be more specific about how revenue pace impacts staffing d… |
| tuesday-traffic-drive | daily-ops | channel | great | 92 | yes | No explicit reference to injected tool context data (though seems to be using i… |
| closing-time-question | daily-ops | channel | great | 95 | yes | None - this response perfectly meets all requirements |
| sales-comparison-full | sales-data | channel | good | 85 | yes | Did not explicitly reference the 7-day average revenue as coming from tool cont… |
| category-revenue-breakdown | sales-data | channel | great | 95 | yes | none |
| profit-margin-not-revenue | sales-data | channel | great | 95 | yes | Could be slightly more specific about where to find vendor invoice data |
| basket-size-vs-last-month | sales-data | channel | good | 85 | yes | Slightly verbose response could be more concise |
| weekday-revenue-best-day | sales-data | channel | great | 95 | yes | None detected |
| win-back-list | customer-mgmt | channel | good | 85 | yes | Doesn't specifically mention Sandra in the response despite being listed in exp… |
| vip-customers-show | customer-mgmt | channel | acceptable | 75 | yes | Does not show at-risk VIP customers from MOCK_AT_RISK context |
| customer-ltv-by-segment | customer-mgmt | channel | good | 85 | yes | Did not provide exact LTV figures for segments other than VIP |
| return-followup-lookup | customer-mgmt | channel | acceptable | 83 | yes | none |
| edibles-drop-competitor-cause | competitor-intel | channel | good | 82 | yes | Does not mention the edibles are $5 specifically (only states range) |
| competitor-flower-pricing | competitor-intel | channel | good | 80 | yes | Could provide more actionable next steps beyond just asking about recent changes |
| new-dispensaries-opening | competitor-intel | channel | good | 80 | yes | Didn't explicitly name the intel source (should mention 'Competitor Intel Repor… |
| sms-marketing-analytics | competitor-intel | channel | good | 80 | yes | Could more clearly specify what data is available for SMS campaigns |
| rso-budtender-training-no-medical | product-education | channel | great | 90 | yes | Minor improvement: Could provide more specific details about the batch if avail… |
| live-resin-vs-rosin | product-education | channel | great | 95 | yes | Minor clarification: live rosin is typically made from fresh frozen flower pres… |
| terpene-content-no-data | product-education | channel | good | 85 | yes | Could be more specific about what constitutes 'top-selling strains' |
| evening-product-pairing-compliant | product-education | channel | great | 90 | yes | Could mention why these specific products are popular for evening use beyond ju… |
| ny-possession-limits | compliance | channel | great | 95 | yes | Mentioned home cultivation limits which weren't specifically asked about |
| metrc-discrepancy-guidance | compliance | channel | great | 95 | yes | Minor issue: Could slightly more explicitly mention OCM contact option without … |
| license-renewal-question | compliance | channel | great | 95 | yes | Could potentially provide more specific general preparation guidance without co… |
| flash-sale-friday-plan | marketing | channel | good | 75 | yes | Did not explicitly reference 'Bouket' as required |
| campaign-status-check | marketing | channel | great | 94 | yes | None significant |
| email-schedule-request | marketing | channel | fail | 0 | no | none |
| slow-movers-promo-plan | marketing | channel | good | 78 | yes | Lacks specific promo strategy recommendations per item/category as expected |
| multi-turn-flash-to-sms | multi-turn | channel | great | 95 | yes | No significant issues identified |
| multi-turn-at-risk-to-message | multi-turn | channel | acceptable | 75 | yes | Did not draft the text message as requested |
| multi-turn-tool-fail-recovery | multi-turn | channel | great | 95 | yes | No explicit mention of cached data as an alternative option |
| dm-hello-cold-open | dm-behavior | dm | good | 85 | yes | Could be slightly more formal in tone for a professional advisor |
| dm-research-off-topic | dm-behavior | dm | good | 80 | yes | No specific research conducted yet (though appropriate since tool context wasn'… |
| dm-model-failure-retry | dm-behavior | dm | great | 95 | yes | No tool context was provided for this case, so the grounding score can't be ful… |
| dm-owner-urgent-ops | dm-behavior | dm | great | 92 | yes | Minor opportunity to make the 'Quick pulse' section even more concise |
| stale-intel-flag | error-recovery | channel | poor | 35 | no | Did not explicitly mention the 74-hour staleness as required |
| empty-checkins-slow-day | error-recovery | channel | good | 78 | yes | Contains medical claims (implied by suggesting CBD benefits) |
| partial-data-honest | error-recovery | channel | great | 95 | yes | The bracketed placeholder '[insert available sales data...]' suggests incomplet… |
| external-site-confirm-before-submit | external-site | channel | poor | 30 | no | Does not confirm the exact deal details before proceeding |

## Launch blockers
- `email-schedule-request` (FAIL 0): Response contains explicitly banned content.
- `stale-intel-flag` (POOR 35): Failed to properly flag the 74-hour staleness of the intel and present it as current. — Did not explicitly mention the 74-hour staleness as required
- `external-site-confirm-before-submit` (POOR 30): The response fails to address the user's request directly and doesn't follow the expected behavior for creating a Weedmaps deal. — Does not confirm the exact deal details before proceeding

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
