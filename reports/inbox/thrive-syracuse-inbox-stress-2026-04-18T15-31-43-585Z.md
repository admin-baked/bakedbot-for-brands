# Thrive Syracuse Inbox Stress Report

- Generated: 2026-04-18T15:31:43.585Z
- Org: org_thrive_syracuse
- Cases run: 3
- Average score: 86.3
- Response-ready cases: 3/3
- Poor or fail: 0
- Failures: 0

## Summary Table
| Case | Kind | Agent | Grade | Score | Ready | Top issue |
| --- | --- | --- | --- | ---: | --- | --- |
| slow-movers-table | data | money_mike | great | 92 | yes | Could have provided more explanation for the chosen discount percentages |
| expiring-inventory-writeoff | data | money_mike | good | 82 | yes | No specific timeline for implementation (when should markdowns be applied?) |
| top-sellers-restock | data | pops | good | 85 | yes | Stockout calculations contain mathematical errors |

## Launch blockers
- None

## Notes
- This runner uses the shared inbox thread-context builder plus inbox persona routing and persona system prompts.
- Briefing-card resilience is covered separately by Jest component tests for partial analytics and check-in payloads.
