# Thrive Syracuse Inbox Stress Report

- Generated: 2026-04-18T16:06:45.078Z
- Org: org_thrive_syracuse
- Cases run: 25
- Average score: 78.6
- Response-ready cases: 22/25
- Poor or fail: 3
- Failures: 0

## Summary Table
| Case | Kind | Agent | Grade | Score | Ready | Top issue |
| --- | --- | --- | --- | ---: | --- | --- |
| slow-movers-table | data | money_mike | great | 92 | yes | The MFNY Hash Burger has the highest days on hand (285) but is ranked first mainly due to... |
| expiring-inventory-writeoff | data | money_mike | poor | 40 | no | Made up margin percentages without showing calculations |
| top-sellers-restock | data | pops | great | 92 | yes | The reference to 'Money Mike' seems unnecessary and unprofessional |
| category-margin-mix | data | money_mike | good | 78 | yes | Could more explicitly justify why Flower is chosen over Vape despite lower margin |
| daily-traffic-gap | data | pops | great | 92 | yes | Could benefit from slightly more specificity on how to implement the staff optimization |
| competitor-price-response | data | ezal | great | 90 | yes | Could provide more specific implementation timeline or tactics |
| review-queue-priority | data | mrs_parker | great | 92 | yes | No specific timeline provided for when responses should be completed |
| checkin-daily-actions | data | mrs_parker | good | 78 | yes | Lacks specific tactics for executing these actions |
| campaign-follow-up | data | craig | good | 78 | yes | Projections seem overly optimistic without justification |
| customer-segments-winback | data | mrs_parker | great | 92 | yes | Could provide more specific guidance on timing the campaign |
| loyalty-enrollment-gap | data | mrs_parker | good | 82 | yes | Could provide more specific details on the Tuesday incentive program |
| owner-briefing-summary | data | pops | great | 92 | yes | Could be slightly more specific about how to address the flower/gummy category shift |
| weekend-flash-sale | non_data | money_mike | good | 75 | yes | The prompt was marked as 'non_data' but the agent asks for specific cost structure data |
| compliant-sms-draft | non_data | craig | good | 82 | yes | Missing any specific branding or dispensary name |
| one-star-review-reply | non_data | smokey | good | 80 | yes | Lacks operational specifics about wait time improvements |
| beginner-budtender-talking-points | non_data | smokey | great | 92 | yes | Could add more specificity about how to explain terpenes to beginners |
| vendor-day-plan | non_data | craig | poor | 35 | no | Contains multiple compliance red flags with medical claims and promotional hype language |
| owner-daily-briefing-no-data | non_data | puff | good | 75 | yes | Could provide more context on why certain metrics matter for a dispensary owner |
| differentiate-thrive | non_data | ezal | good | 85 | yes | Could benefit from more specific examples relevant to the Syracuse market |
| no-verified-competitor-data | non_data | ezal | great | 92 | yes | Could be more specific about what constitutes 'verified data' for future reference |
| partial-table-analysis | data | money_mike | poor | 45 | no | Incorrectly calculated gross margins (showed 58% for Heady Tree Gelato when it's actually... |
| multi-turn-sale-to-email | multi_turn | craig | good | 78 | yes | No specific customer segmentation beyond vague previous purchases |
| multi-turn-budtender-brief | multi_turn | smokey | good | 75 | yes | Missing specific strain examples from the menu |
| operator-pairings-no-medical | non_data | smokey | good | 78 | yes | Could provide more specific budtender training language for implementation |
| exact-slowest-movers-no-data | non_data | puff | good | 75 | yes | Doesn't address the fact that no data was provided in the prompt |

## Launch blockers
- expiring-inventory-writeoff (POOR 40): Response includes unsupported claims and ignores key inventory data. Issue: Made up margin percentages without showing calculations
- vendor-day-plan (POOR 35): Response contains compliance issues and promotional hype language that would not be acceptable for a dispensary. Issue: Contains multiple compliance red flags with medical claims and promotional hype language
- partial-table-analysis (POOR 45): Failed to use the limited data properly and made incorrect margin calculations. Issue: Incorrectly calculated gross margins (showed 58% for Heady Tree Gelato when it's actually 58% on retail price)

## Notes
- This runner uses the shared inbox thread-context builder plus inbox persona routing and persona system prompts.
- Briefing-card resilience is covered separately by Jest component tests for partial analytics and check-in payloads.
