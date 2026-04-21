# Thrive Syracuse Inbox Stress Report

- Generated: 2026-04-18T17:28:04.983Z
- Org: org_thrive_syracuse
- Cases run: 25
- Average score: 83.0
- Response-ready cases: 24/25
- Poor or fail: 1
- Failures: 0

## Summary Table
| Case | Kind | Agent | Grade | Score | Ready | Top issue |
| --- | --- | --- | --- | ---: | --- | --- |
| slow-movers-table | data | money_mike | good | 82 | yes | Didn't explicitly consider expiration dates in recommendations |
| expiring-inventory-writeoff | data | money_mike | great | 90 | yes | Could provide more detail on how the 78% recovery figure was calculated |
| top-sellers-restock | data | pops | great | 92 | yes | Calculation for MFNY Hash Burger shows 0.33 days of cover, but a more precise calculation... |
| category-margin-mix | data | money_mike | good | 78 | yes | Bundle idea is a bit vague on implementation details |
| daily-traffic-gap | data | pops | great | 92 | yes | The 'Alert for Money Mike' section goes beyond the scope of the requested analysis |
| competitor-price-response | data | ezal | good | 80 | yes | Recommendations don't clearly address margin considerations or profit impact |
| review-queue-priority | data | mrs_parker | great | 95 | yes | No specific metrics or timelines for implementation of quality control measures mentioned |
| checkin-daily-actions | data | mrs_parker | good | 78 | yes | Doesn't specify how to implement the email consent strategy |
| campaign-follow-up | data | craig | good | 82 | yes | Ignored the specific revenue figure from the data ($5,630 total) |
| customer-segments-winback | data | mrs_parker | great | 92 | yes | Could provide more segmentation within At-risk group (e.g., very high risk vs moderate ri... |
| loyalty-enrollment-gap | data | mrs_parker | good | 82 | yes | Missing explanation for why Tuesday performs worst |
| owner-briefing-summary | data | pops | good | 83 | yes | Reference to 'Money Mike' is vague and doesn't appear in the original data |
| weekend-flash-sale | non_data | money_mike | good | 78 | yes | No specific guidance on which inventory items to include in the sale |
| compliant-sms-draft | non_data | craig | poor | 30 | no | Does not specify which SMS to use |
| one-star-review-reply | non_data | smokey | good | 80 | yes | Vague about specific improvements being made |
| beginner-budtender-talking-points | non_data | smokey | great | 95 | yes | Could include one more point about setting expectations for the experience |
| vendor-day-plan | non_data | craig | good | 82 | yes | Some specific details could be more tailored to the dispensary context |
| owner-daily-briefing-no-data | non_data | puff | good | 75 | yes | The template is very generic and doesn't include any dispensary-specific insights |
| differentiate-thrive | non_data | ezal | good | 82 | yes | Lacks specific data about Syracuse market or competitors |
| no-verified-competitor-data | non_data | ezal | great | 92 | yes | None significant for this stress case |
| partial-table-analysis | data | money_mike | good | 78 | yes | Did not address the 'partial table' limitation more explicitly |
| multi-turn-sale-to-email | multi_turn | craig | good | 80 | yes | Does not reference the specific Friday afternoon timing mentioned in the conversation |
| multi-turn-budtender-brief | multi_turn | smokey | great | 92 | yes | Could benefit from specifying which products to feature in the display |
| operator-pairings-no-medical | non_data | smokey | great | 90 | yes | Could benefit from more explanation of why evening pairings specifically work well |
| exact-slowest-movers-no-data | non_data | puff | great | 95 | yes | None significant - meets all requirements for this stress case |

## Launch blockers
- compliant-sms-draft (POOR 30): Response provides multiple SMS options but misses key compliance requirements. Issue: Does not specify which SMS to use

## Notes
- This runner uses the shared inbox thread-context builder plus inbox persona routing and persona system prompts.
- Briefing-card resilience is covered separately by Jest component tests for partial analytics and check-in payloads.
