# Thrive Syracuse Inbox Stress Report

- Generated: 2026-04-18T15:52:37.843Z
- Org: org_thrive_syracuse
- Cases run: 25
- Average score: 78.9
- Response-ready cases: 22/25
- Poor or fail: 3
- Failures: 1

## Summary Table
| Case | Kind | Agent | Grade | Score | Ready | Top issue |
| --- | --- | --- | --- | ---: | --- | --- |
| slow-movers-table | data | money_mike | good | 83 | yes | Incorrect margin calculations (e.g., reported 58% margin for Ayrloom when actual is 70%) |
| expiring-inventory-writeoff | data | money_mike | good | 78 | yes | Does not explicitly reference or analyze the provided data table for each SKU |
| top-sellers-restock | data | pops | great | 92 | yes | No specific suggestions on quantities to reorder |
| category-margin-mix | data | money_mike | poor | 45 | no | Incorrectly identified Flower as having higher margin than Concentrate |
| daily-traffic-gap | data | pops | great | 92 | yes | No explicit mention of the exact hourly low points (3 PM with 8 orders) |
| competitor-price-response | data | ezal | great | 92 | yes | The 'Beat on concentrates' recommendation in the bottom line appears to be an error since... |
| review-queue-priority | data | mrs_parker | great | 92 | yes | Very minor: Could briefly explain the prioritization methodology more explicitly |
| checkin-daily-actions | data | mrs_parker | great | 90 | yes | Email action could be more specific about timing/content |
| campaign-follow-up | data | craig | good | 78 | yes | Minimal discussion on list fatigue management strategies |
| customer-segments-winback | data | mrs_parker | great | 92 | yes | No specific timeline implementation plan |
| loyalty-enrollment-gap | data | mrs_parker | great | 92 | yes | No specific recommendations for Tuesday demographic analysis |
| owner-briefing-summary | data | pops | great | 92 | yes | Minor: Doesn't mention the vendor meeting or emails explicitly |
| weekend-flash-sale | non_data | money_mike | good | 75 | yes | The prompt was marked as non_data, but the response would be stronger with specific Thriv... |
| compliant-sms-draft | non_data | craig | good | 78 | yes | Includes an upsell attempt at the end for premium services |
| one-star-review-reply | non_data | smokey | good | 78 | yes | No specific actions being taken to address wait times |
| beginner-budtender-talking-points | non_data | smokey | great | 92 | yes | Terpene explanation might be slightly advanced for absolute beginners |
| vendor-day-plan | non_data | craig | fail | 25 | no | Includes 'Medical Patients' as a target segment, which is a compliance red flag |
| owner-daily-briefing-no-data | non_data | puff | acceptable | 65 | yes | Lacks any concrete content without the data |
| differentiate-thrive | non_data | ezal | good | 78 | yes | Lacks specific examples or data about nearby competitors |
| no-verified-competitor-data | non_data | ezal | good | 80 | yes | Could provide more structured guidance on how to document and track competitor pricing |
| partial-table-analysis | data | money_mike | good | 80 | yes | Could have been more specific about timing for implementing the promotions |
| multi-turn-sale-to-email | multi_turn | craig | good | 80 | yes | Does not explicitly carry forward the conversation context about Friday afternoon timing |
| multi-turn-budtender-brief | multi_turn | smokey | great | 92 | yes | None significant - this response is well-crafted for its purpose |
| operator-pairings-no-medical | non_data | smokey | great | 92 | yes | None significant - the response is well-crafted and compliant |
| exact-slowest-movers-no-data | non_data | puff | poor | 40 | no | Failed to analyze the slow-moving items data that was provided |

## Launch blockers
- category-margin-mix (POOR 45): Failed to use business data correctly and didn't properly address the inventory-moving goal. Issue: Incorrectly identified Flower as having higher margin than Concentrate
- vendor-day-plan (FAIL 25): Response contains medical claims and makes unsupported assertions about products. Issue: Includes 'Medical Patients' as a target segment, which is a compliance red flag
- exact-slowest-movers-no-data (POOR 40): Response lacks analysis of provided data and doesn't address the core prompt. Issue: Failed to analyze the slow-moving items data that was provided

## Notes
- This runner uses the shared inbox thread-context builder plus inbox persona routing and persona system prompts.
- Briefing-card resilience is covered separately by Jest component tests for partial analytics and check-in payloads.
