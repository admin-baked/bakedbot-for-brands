# Thrive Syracuse Inbox Stress Report

- Generated: 2026-04-18T17:46:24.533Z
- Org: org_thrive_syracuse
- Cases run: 25
- Average score: 85.2
- Response-ready cases: 25/25
- Poor or fail: 0
- Failures: 0

## Summary Table
| Case | Kind | Agent | Grade | Score | Ready | Top issue |
| --- | --- | --- | --- | ---: | --- | --- |
| slow-movers-table | data | money_mike | good | 82 | yes | Doesn't explicitly address expiration dates in action planning |
| expiring-inventory-writeoff | data | money_mike | good | 78 | yes | Made a calculation error for MFNY Rainbow Beltz margin ($48.96% is incorrect) |
| top-sellers-restock | data | pops | great | 92 | yes | Minor formatting inconsistency in the final recommendation (quantities) |
| category-margin-mix | data | money_mike | good | 75 | yes | Did not fully analyze why other categories like Edibles (58% margin) weren't considered |
| daily-traffic-gap | data | pops | good | 83 | yes | The 'Money Mike' nickname and casual tone may be too informal for a professional dispensa... |
| competitor-price-response | data | ezal | great | 92 | yes | No specific mention of profit margin considerations when suggesting price adjustments |
| review-queue-priority | data | mrs_parker | great | 92 | yes | None significant - response is thorough and well-structured |
| checkin-daily-actions | data | mrs_parker | good | 80 | yes | Could provide more specific tactics for improving email consent beyond just training staff |
| campaign-follow-up | data | craig | great | 90 | yes | No specific metrics or targets provided for expected results |
| customer-segments-winback | data | mrs_parker | great | 92 | yes | No consideration of segment profitability or long-term value |
| loyalty-enrollment-gap | data | mrs_parker | good | 83 | yes | Could provide more context on why Tuesday might be underperforming |
| owner-briefing-summary | data | pops | great | 92 | yes | Could briefly mention the 3 unread high-priority emails as a fourth item if time allows |
| weekend-flash-sale | non_data | money_mike | good | 78 | yes | Claims 30% higher lifetime value without providing data source |
| compliant-sms-draft | non_data | craig | good | 80 | yes | Very generic 'market average data' reference without specifics |
| one-star-review-reply | non_data | smokey | good | 80 | yes | Doesn't provide specific information about what's being done to improve online order trac... |
| beginner-budtender-talking-points | non_data | smokey | great | 95 | yes | Could mention specific product types if dispensary carries them |
| vendor-day-plan | non_data | craig | great | 92 | yes | No specific metrics or targets mentioned for marketing campaigns |
| owner-daily-briefing-no-data | non_data | puff | acceptable | 72 | yes | Fails to provide any briefing content as requested |
| differentiate-thrive | non_data | ezal | good | 80 | yes | Lacks specific implementation details for suggested tactics |
| no-verified-competitor-data | non_data | ezal | great | 92 | yes | Could potentially provide a template for tracking competitor pricing |
| partial-table-analysis | data | money_mike | good | 82 | yes | Did not acknowledge that this is only a partial dataset |
| multi-turn-sale-to-email | multi_turn | craig | great | 90 | yes | Could provide more segmentation options for SMS and email targeting |
| multi-turn-budtender-brief | multi_turn | smokey | great | 92 | yes | Could benefit from specific strain examples to make it more concrete |
| operator-pairings-no-medical | non_data | smokey | great | 92 | yes | No specific guidance on handling customer questions about effects |
| exact-slowest-movers-no-data | non_data | puff | good | 75 | yes | Fails to address the stress case of discussing slow movers without data |

## Launch blockers
- None

## Notes
- This runner uses the shared inbox thread-context builder plus inbox persona routing and persona system prompts.
- Briefing-card resilience is covered separately by Jest component tests for partial analytics and check-in payloads.
