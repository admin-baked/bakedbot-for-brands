# Thrive Syracuse Inbox Stress Report

- Generated: 2026-04-18T17:42:49.078Z
- Org: org_thrive_syracuse
- Cases run: 25
- Average score: 84.3
- Response-ready cases: 24/25
- Poor or fail: 1
- Failures: 0

## Summary Table
| Case | Kind | Agent | Grade | Score | Ready | Top issue |
| --- | --- | --- | --- | ---: | --- | --- |
| slow-movers-table | data | money_mike | good | 82 | yes | Missing specific discount percentages or promotional strategies |
| expiring-inventory-writeoff | data | money_mike | great | 92 | yes | Could add more rationale for specific discount percentages |
| top-sellers-restock | data | pops | great | 92 | yes | Minor formatting inconsistency with item names (e.g., 'Matter. Blue Dream' vs 'Ayrloom Bl... |
| category-margin-mix | data | money_mike | good | 78 | yes | Did not analyze if other anchor categories might work better |
| daily-traffic-gap | data | pops | great | 92 | yes | The 'Money Mike Alert' feels slightly informal for a business analysis |
| competitor-price-response | data | ezal | good | 86 | yes | none |
| review-queue-priority | data | mrs_parker | great | 92 | yes | No specific timeline for when responses should be completed |
| checkin-daily-actions | data | mrs_parker | good | 85 | yes | Could provide more specific examples of what messages to send |
| campaign-follow-up | data | craig | good | 80 | yes | Did not calculate potential revenue impact or optimization opportunities based on exact n... |
| customer-segments-winback | data | mrs_parker | great | 92 | yes | Could quantify potential ROI of targeting At-risk segment |
| loyalty-enrollment-gap | data | mrs_parker | great | 92 | yes | Could benefit from more specific timeline for implementation |
| owner-briefing-summary | data | pops | great | 92 | yes | Minor opportunity to explicitly mention the 3 unread high-priority emails |
| weekend-flash-sale | non_data | money_mike | good | 78 | yes | Doesn't specifically address inventory movement or margin optimization as requested |
| compliant-sms-draft | non_data | craig | great | 92 | yes | None significant - could potentially add one more variation focusing on loyalty customers |
| one-star-review-reply | non_data | smokey | good | 75 | yes | Doesn't provide immediate operational fixes the customer can expect |
| beginner-budtender-talking-points | non_data | smokey | great | 95 | yes | None significant - this response hits all the requirements perfectly |
| vendor-day-plan | non_data | craig | great | 92 | yes | Some sections could benefit from more specific examples (e.g., sample talking points) |
| owner-daily-briefing-no-data | non_data | puff | good | 75 | yes | Too generic for an actual daily briefing without data |
| differentiate-thrive | non_data | ezal | great | 92 | yes | Some suggestions (like consumption lounges) may not be feasible in all jurisdictions |
| no-verified-competitor-data | non_data | ezal | good | 85 | yes | Could be more specific about what constitutes 'responsible' competitor analysis |
| partial-table-analysis | data | money_mike | poor | 45 | no | Includes promotional bundling suggestions that are inappropriate in this context |
| multi-turn-sale-to-email | multi_turn | craig | good | 75 | yes | Used cannabis-specific slang 'Stay lifted' which may violate compliance policies |
| multi-turn-budtender-brief | multi_turn | smokey | great | 92 | yes | Could provide slightly more specific strain examples |
| operator-pairings-no-medical | non_data | smokey | good | 82 | yes | No consideration of specific gummy strain or potency information |
| exact-slowest-movers-no-data | non_data | puff | good | 75 | yes | Did not mention what specific data would be most valuable (inventory counts, sales histor... |

## Launch blockers
- partial-table-analysis (POOR 45): Response includes problematic promotional suggestions and fails to focus on visible data only. Issue: Includes promotional bundling suggestions that are inappropriate in this context

## Notes
- This runner uses the shared inbox thread-context builder plus inbox persona routing and persona system prompts.
- Briefing-card resilience is covered separately by Jest component tests for partial analytics and check-in payloads.
