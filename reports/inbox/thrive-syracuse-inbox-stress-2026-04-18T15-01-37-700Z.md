# Thrive Syracuse Inbox Stress Report

- Generated: 2026-04-18T15:01:37.700Z
- Org: org_thrive_syracuse
- Cases run: 1
- Average score: 10.0
- Response-ready cases: 0/1
- Poor or fail: 1
- Failures: 1

## Summary Table
| Case | Kind | Agent | Grade | Score | Ready | Top issue |
| --- | --- | --- | --- | ---: | --- | --- |
| slow-movers-table | data | money_mike | fail | 10 | no | Cannot find package '@/ai' imported from C:\Users\admin\BakedBot for Brands\bakedbot-for-... |

## Launch blockers
- slow-movers-table (FAIL 10): The case failed before a usable inbox response was generated. Issue: Cannot find package '@/ai' imported from C:\Users\admin\BakedBot for Brands\bakedbot-for-brands\src\ai\glm.ts

## Notes
- This runner uses the shared inbox thread-context builder plus inbox persona routing and persona system prompts.
- Briefing-card resilience is covered separately by Jest component tests for partial analytics and check-in payloads.
