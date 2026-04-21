# Thrive Syracuse Inbox Stress Report

- Generated: 2026-04-18T21:59:18.808Z
- Org: org_thrive_syracuse
- Cases run: 8
- Average score: 85.4
- Response-ready cases: 8/8
- Poor or fail: 0
- Failures: 0

## Summary Table
| Case | Kind | Agent | Grade | Score | Ready | Top issue |
| --- | --- | --- | --- | ---: | --- | --- |
| slow-movers-table | data | money_mike | good | 82 | yes | Expiration dates were not factored into the ranking |
| expiring-inventory-writeoff | data | money_mike | good | 75 | yes | Didn't explicitly mention the expiration dates in the analysis |
| top-sellers-restock | data | pops | great | 92 | yes | The 1-2 day buffer calculations for medium-risk items could be slightly more precise |
| category-margin-mix | data | money_mike | good | 75 | yes | Incorrectly states Pre-Rolls are second-highest volume category (Edibles has 421 units vs... |
| daily-traffic-gap | data | pops | great | 92 | yes | No additional context about why this traffic pattern exists |
| competitor-price-response | data | ezal | great | 92 | yes | Could be more structured with a clear executive summary upfront |
| review-queue-priority | data | mrs_parker | great | 92 | yes | No specific timeline suggested for when to respond to each priority |
| checkin-daily-actions | data | mrs_parker | good | 83 | yes | Could provide more specific examples of high-margin products to suggest |

## Launch blockers
- None

## Notes
- This runner uses the shared inbox thread-context builder plus inbox persona routing and persona system prompts.
- Briefing-card resilience is covered separately by Jest component tests for partial analytics and check-in payloads.
