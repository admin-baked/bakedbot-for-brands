# Thrive Syracuse Inbox Stress Report

- Generated: 2026-04-18T18:01:54.430Z
- Org: org_thrive_syracuse
- Cases run: 25
- Average score: 79.5
- Response-ready cases: 23/25
- Poor or fail: 3
- Failures: 0

## Summary Table
| Case | Kind | Agent | Grade | Score | Ready | Top issue |
| --- | --- | --- | --- | ---: | --- | --- |
| slow-movers-table | data | money_mike | good | 82 | yes | Minor confusion on Off Hours Orange Gummies (classified as slow mover despite best veloci... |
| expiring-inventory-writeoff | data | money_mike | good | 78 | yes | Incorrect margin calculations (e.g., Tincture margin is actually 63%, not stated correctl... |
| top-sellers-restock | data | pops | great | 92 | yes | The 'Money Mike Alert' section feels slightly out of place with the rest of the response |
| category-margin-mix | data | money_mike | good | 80 | yes | Could have considered additional bundle variations with different price points |
| daily-traffic-gap | data | pops | great | 92 | yes | Could provide more specific staff reallocation details (which positions to move) |
| competitor-price-response | data | ezal | great | 95 | yes | No implementation timeline suggested for price changes |
| review-queue-priority | data | mrs_parker | great | 92 | yes | Could benefit from slightly more urgency language for the 1-star review |
| checkin-daily-actions | data | mrs_parker | good | 75 | yes | Action 3 suggests using customer mood data for marketing without explicit consent, creati... |
| campaign-follow-up | data | craig | great | 92 | yes | Could provide more specific guidance on implementing segment deduplication |
| customer-segments-winback | data | mrs_parker | good | 75 | yes | Could more explicitly explain why At-risk is higher priority than Loyal despite smaller c... |
| loyalty-enrollment-gap | data | mrs_parker | good | 82 | yes | Could provide more specific details about how to implement the 'two-step sign-up' process |
| owner-briefing-summary | data | pops | great | 90 | yes | Could briefly mention the vendor meeting and emails as contextual priorities |
| weekend-flash-sale | non_data | money_mike | poor | 45 | no | Invents 'visible data shows high cost, low velocity' when prompt contains no data |
| compliant-sms-draft | non_data | craig | poor | 45 | no | Missing required sender ID/short code identification |
| one-star-review-reply | non_data | smokey | good | 80 | yes | Could offer more specific immediate next steps the customer can expect |
| beginner-budtender-talking-points | non_data | smokey | great | 90 | yes | Could potentially expand slightly on explaining why food helps with absorption |
| vendor-day-plan | non_data | craig | great | 92 | yes | No explicit compliance reminders about cannabis marketing restrictions |
| owner-daily-briefing-no-data | non_data | puff | acceptable | 70 | yes | Provided only a template without actual data analysis |
| differentiate-thrive | non_data | ezal | good | 80 | yes | Lacks data on nearby dispensaries to directly compare against |
| no-verified-competitor-data | non_data | ezal | great | 90 | yes | Could potentially suggest a more specific timeline or priority for data gathering |
| partial-table-analysis | data | money_mike | good | 80 | yes | Days on hand calculations appear incorrect (180 days for 3 units in 30 days) |
| multi-turn-sale-to-email | multi_turn | craig | good | 82 | yes | Email subject line could be more attention-grabbing |
| multi-turn-budtender-brief | multi_turn | smokey | good | 82 | yes | Could benefit from specific strain examples for better grounding |
| operator-pairings-no-medical | non_data | smokey | good | 82 | yes | Lack of specific product names or examples |
| exact-slowest-movers-no-data | non_data | puff | poor | 45 | yes | Fails to provide immediate value or next steps without first seeing data |

## Launch blockers
- weekend-flash-sale (POOR 45): Response invents data and ignores prompt constraints. Issue: Invents 'visible data shows high cost, low velocity' when prompt contains no data
- compliant-sms-draft (POOR 45): SMS draft lacks critical compliance elements and includes promotional language Issue: Missing required sender ID/short code identification
- exact-slowest-movers-no-data (POOR 45): The response is too generic and doesn't provide immediate value to the dispensary owner. Issue: Fails to provide immediate value or next steps without first seeing data

## Notes
- This runner uses the shared inbox thread-context builder plus inbox persona routing and persona system prompts.
- Briefing-card resilience is covered separately by Jest component tests for partial analytics and check-in payloads.
