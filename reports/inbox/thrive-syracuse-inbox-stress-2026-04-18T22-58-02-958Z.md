# Thrive Syracuse Inbox Stress Report

- Generated: 2026-04-18T22:58:02.958Z
- Org: org_thrive_syracuse
- Cases run: 5
- Average score: 79.8
- Response-ready cases: 4/5
- Poor or fail: 1
- Failures: 0

## Summary Table
| Case | Kind | Agent | Grade | Score | Ready | Top issue |
| --- | --- | --- | --- | ---: | --- | --- |
| slow-movers-table | data | money_mike | great | 88 | yes | No specific margin calculations or impact analysis |
| expiring-inventory-writeoff | data | money_mike | good | 82 | yes | Minor inconsistency in recommendation for Generic House Tincture (listed in both bundle a... |
| top-sellers-restock | data | pops | great | 92 | yes | Minor calculation discrepancy for Matter. Blue Dream (days of cover should be ~4.4, not 4... |
| category-margin-mix | data | money_mike | poor | 45 | no | Fails to use the concentrate data correctly - concentrates are actually the highest price... |
| daily-traffic-gap | data | pops | great | 92 | yes | Could provide more specific staff reallocation details (how many staff members, specific ... |

## Launch blockers
- category-margin-mix (POOR 45): The response fails to use the provided data correctly and misidentifies the optimal anchor category for moving concentrate inventory. Issue: Fails to use the concentrate data correctly - concentrates are actually the highest price per unit ($56.81 AOV), not lowest

## Notes
- This runner uses the shared inbox thread-context builder plus inbox persona routing and persona system prompts.
- Briefing-card resilience is covered separately by Jest component tests for partial analytics and check-in payloads.
