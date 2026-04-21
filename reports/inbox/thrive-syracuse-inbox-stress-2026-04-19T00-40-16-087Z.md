# Thrive Syracuse Inbox Stress Report

- Generated: 2026-04-19T00:40:16.087Z
- Org: org_thrive_syracuse
- Cases run: 8
- Average score: 81.1
- Response-ready cases: 7/8
- Poor or fail: 1
- Failures: 0

## Summary Table
| Case | Kind | Agent | Grade | Score | Ready | Top issue |
| --- | --- | --- | --- | ---: | --- | --- |
| expiring-inventory-writeoff | data | money_mike | great | 92 | yes | No mention of regulatory compliance considerations for bundling different product categor... |
| category-margin-mix | data | money_mike | good | 75 | yes | Doesn't address the concentrate margin concern (39% is lowest) |
| competitor-price-match-decision | data | money_mike | good | 82 | yes | Could provide more specific guidance on when to consider each option |
| overstock-discontinue-plan | data | money_mike | great | 90 | yes | No explicit mention of compliance considerations for promotional activities |
| bundle-price-calc | data | money_mike | great | 95 | yes | Could provide additional context on competitive analysis or customer perception |
| clearance-timing-math | data | money_mike | great | 92 | yes | No mention of potential impact on profit margins when suggesting discounts |
| multi-turn-inventory-decision | data | money_mike | good | 78 | yes | Inventory turnover calculation is incorrect (20x/year is not accurate with 18 days on han... |
| vendor-renegotiation-leverage | non_data | money_mike | poor | 45 | no | Fails to leverage the key fact that the owner is the biggest buyer in Syracuse |

## Launch blockers
- vendor-renegotiation-leverage (POOR 45): The response provides generic negotiation advice without leveraging the specific volume position mentioned in the prompt. Issue: Fails to leverage the key fact that the owner is the biggest buyer in Syracuse

## Notes
- This runner uses the shared inbox thread-context builder plus inbox persona routing and persona system prompts.
- Briefing-card resilience is covered separately by Jest component tests for partial analytics and check-in payloads.
