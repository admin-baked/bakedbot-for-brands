# Thrive Syracuse Inbox Stress Report

- Generated: 2026-04-18T15:04:45.591Z
- Org: org_thrive_syracuse
- Cases run: 1
- Average score: 10.0
- Response-ready cases: 0/1
- Poor or fail: 1
- Failures: 1

## Summary Table
| Case | Kind | Agent | Grade | Score | Ready | Top issue |
| --- | --- | --- | --- | ---: | --- | --- |
| slow-movers-table | data | money_mike | fail | 10 | no | [GoogleGenerativeAI Error]: Error fetching from https://generativelanguage.googleapis.com... |

## Launch blockers
- slow-movers-table (FAIL 10): The case failed before a usable inbox response was generated. Issue: [GoogleGenerativeAI Error]: Error fetching from https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent: [429 Too Many Requests] Resource exhausted. Please try again later. Please refer to https://cloud.google.com/vertex-ai/generative-ai/docs/error-code-429 for more details.

## Notes
- This runner uses the shared inbox thread-context builder plus inbox persona routing and persona system prompts.
- Briefing-card resilience is covered separately by Jest component tests for partial analytics and check-in payloads.
