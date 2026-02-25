# Agent SLO Definitions

> Service Level Objectives for each BakedBot AI agent.
> Measured via `agent_telemetry` collection. Reviewed weekly.

**Status:** Active | **Owner:** Linus (CTO) | **Date:** 2026-02-25

---

## Executive Agents

### Linus (CTO)
| Metric | SLO | Measurement | Alert |
|--------|-----|-------------|-------|
| Response latency (P95) | < 30s | `totalLatencyMs` P95 over 24h | > 45s for 5 min |
| Error rate | < 2% | `success=false / total` per day | > 5% for 15 min |
| Tool hallucination rate | < 1% | Executor "unknown tool" errors / total tool calls | > 3% for 1h |
| Super power utilization | > 0.15 | `capabilityUtilization` 7-day average | < 0.08 for 3 days |
| Daily token cost | < $50 | `SUM(costEstimateUsd)` per day | > $75 for 1 day |
| Availability (business hours) | 99.5% | Invocations succeed / attempted | < 98% for 4h |

### Leo (COO)
| Metric | SLO | Measurement |
|--------|-----|-------------|
| Delegation accuracy | > 90% | Correct agent selected for task |
| Response latency (P95) | < 20s | `totalLatencyMs` P95 |
| Operational report completeness | > 95% | All requested metrics included |

### Jack (CRO)
| Metric | SLO | Measurement |
|--------|-----|-------------|
| CRM data accuracy | > 95% | Revenue figures match source systems |
| Response latency (P95) | < 15s | `totalLatencyMs` P95 |

---

## Support Agents

### Craig (Marketer)
| Metric | SLO | Measurement | Alert |
|--------|-----|-------------|-------|
| Campaign generation (P95) | < 15s | `totalLatencyMs` P95 | > 25s for 5 min |
| Compliance pass rate | > 99% | Deebo gate pass / total campaigns | < 95% for 1h |
| Content relevance score | > 85% | Eval score from `craig-campaigns.json` | < 80% on eval run |
| Error rate | < 3% | `success=false / total` per day | > 5% for 15 min |

### Smokey (Budtender)
| Metric | SLO | Measurement | Alert |
|--------|-----|-------------|-------|
| Product recommendation (P95) | < 5s | `totalLatencyMs` P95 | > 10s for 5 min |
| Relevance score | > 85% | Eval score from `smokey-qa.json` | < 80% on eval run |
| Compliance score | 100% | No medical claims in responses | < 100% on eval |
| Error rate | < 2% | `success=false / total` per day | > 3% for 15 min |

### Deebo (Enforcer)
| Metric | SLO | Measurement | Alert |
|--------|-----|-------------|-------|
| Compliance detection accuracy | > 95% | From `deebo-compliance.json` eval | < 90% on eval run |
| False positive rate | < 5% | Wrongly flagged clean content | > 8% on eval run |
| Review latency (P95) | < 3s | Time to review a single campaign | > 5s for 5 min |

### Ezal (Lookout)
| Metric | SLO | Measurement |
|--------|-----|-------------|
| Intel freshness | < 24h | Age of most recent competitor data |
| Scraping success rate | > 90% | Successful scrapes / attempted |
| Data accuracy | > 85% | Spot-check pricing vs source |

### Mrs. Parker (Retention)
| Metric | SLO | Measurement |
|--------|-----|-------------|
| Churn prediction accuracy | > 70% | Predicted churners who actually churned |
| Win-back campaign relevance | > 80% | Eval score from future golden set |
| Response latency (P95) | < 10s | `totalLatencyMs` P95 |

---

## Cross-Agent SLOs

| Metric | SLO | Measurement |
|--------|-----|-------------|
| Total daily agent cost | < $200 | `SUM(costEstimateUsd)` across all agents |
| Cross-agent delegation success | > 95% | `delegate_to_agent` calls that succeed |
| Super power utilization (all agents) | > 50% scripts used monthly | At least 6/11 scripts used in any 30-day window |
| Telemetry completeness | > 99% | All agent invocations produce telemetry docs |
| Model routing accuracy | > 90% | Opus used only when task complexity warrants it |

---

## Review Cadence

| Frequency | Review | Owner |
|-----------|--------|-------|
| Daily | Top-line cost + error rate (automated Slack) | Linus |
| Weekly | Per-agent SLO dashboard review | Linus + Leo |
| Monthly | Golden set eval runs + baseline updates | Linus |
| Quarterly | SLO target adjustments based on trends | Executive team |

---

## SLO Violation Protocol

1. **Warning** (SLO within 10% of breach): Log to `#infrastructure`, no human action required
2. **Breach** (SLO violated): Alert to `#linus-incidents`, Linus auto-investigates
3. **Sustained breach** (> 24h): Escalate to human, create QA bug, add to sprint
4. **Critical breach** (P0 agent down): Immediate rollback, postmortem within 24h
