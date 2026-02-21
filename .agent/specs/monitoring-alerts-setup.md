# Monitoring & Alerts Setup for Critical Revenue Systems

> **Cloud Logging + Alerting Configuration**
> Last updated: 2026-02-20

## Overview

This document covers monitoring and alerting setup for the 6 critical revenue system implementations:
1. Bundle Scheduling Cron
2. Bundle Redemption Tracking
3. Loyalty Points Calculation
4. Tier Advancement Logic
5. Loyalty Redemption Workflow
6. Churn Prediction Model

---

## 1. Cloud Logging Filters

### Bundle Transitions - All Events

```
resource.type="cloud_run_revision"
resource.labels.service_name="bakedbot-prod"
jsonPayload.message=~"^\[BundleScheduler\]"
```

### Bundle Transitions - Errors Only

```
resource.type="cloud_run_revision"
resource.labels.service_name="bakedbot-prod"
jsonPayload.message=~"^\[BundleScheduler\]"
severity>=ERROR
```

### Bundle Redemption - All Events

```
resource.type="cloud_run_revision"
resource.labels.service_name="bakedbot-prod"
jsonPayload.message=~"^\[BundleRedemption\]"
```

### Bundle Redemption - Failed Redemptions

```
resource.type="cloud_run_revision"
resource.labels.service_name="bakedbot-prod"
jsonPayload.message=~"^\[BundleRedemption\]"
jsonPayload.success=false
```

### Loyalty Points - Award Events

```
resource.type="cloud_run_revision"
resource.labels.service_name="bakedbot-prod"
jsonPayload.message=~"^\[LoyaltySync\] Points awarded"
```

### Loyalty Points - Failures

```
resource.type="cloud_run_revision"
resource.labels.service_name="bakedbot-prod"
jsonPayload.message=~"^\[LoyaltySync\] Failed to award points"
severity>=ERROR
```

### Tier Advancement - Promotions

```
resource.type="cloud_run_revision"
resource.labels.service_name="bakedbot-prod"
jsonPayload.message=~"^\[TierAdvancement\] Tier changed"
jsonPayload.promoted=true
```

### Loyalty Redemption - All Redemptions

```
resource.type="cloud_run_revision"
resource.labels.service_name="bakedbot-prod"
jsonPayload.message=~"^\[LoyaltyRedemption\] Points redeemed"
```

### Churn Prediction - High Risk Customers

```
resource.type="cloud_run_revision"
resource.labels.service_name="bakedbot-prod"
jsonPayload.message=~"^\[ChurnPrediction\]"
jsonPayload.riskLevel=~"high|critical"
```

### Churn Prediction - Cron Failures

```
resource.type="cloud_run_revision"
resource.labels.service_name="bakedbot-prod"
jsonPayload.message=~"^\[Cron\] Churn prediction job failed"
severity>=ERROR
```

---

## 2. Alert Policies (Cloud Monitoring)

### 🚨 P1 - Critical Alerts

#### Bundle Transitions Cron Down (5+ consecutive failures)

```yaml
Display Name: Bundle Transitions Cron - Multiple Failures
Condition Type: Log match
Filter: |
  resource.type="cloud_run_revision"
  resource.labels.service_name="bakedbot-prod"
  jsonPayload.message=~"^\[Cron\] Bundle transitions job failed"
  severity>=ERROR
Threshold: Count > 5 in 30 minutes
Notification Channels:
  - Slack: #alerts-revenue-systems
  - Email: devops@bakedbot.ai
Documentation: |
  Bundle scheduling cron has failed 5+ times in 30 minutes.
  Bundles are not auto-activating or expiring.

  Troubleshooting:
  1. Check Firestore connectivity
  2. Verify CRON_SECRET is valid
  3. Check for Firestore index errors
  4. Review logs: gcloud logging read "jsonPayload.message=~'BundleScheduler'" --limit 50
```

#### Churn Prediction Cron Failed

```yaml
Display Name: Churn Prediction Cron - Failure
Condition Type: Log match
Filter: |
  resource.type="cloud_run_revision"
  resource.labels.service_name="bakedbot-prod"
  jsonPayload.message=~"^\[Cron\] Churn prediction job failed"
  severity>=ERROR
Threshold: Count > 0 in 1 hour
Notification Channels:
  - Slack: #alerts-revenue-systems
  - Email: data-team@bakedbot.ai
Documentation: |
  Weekly churn prediction cron failed.
  Customer churn risk scores not updated.

  Troubleshooting:
  1. Check Claude API quota/limits
  2. Verify CLAUDE_API_KEY is valid
  3. Check Firestore connectivity
  4. Review logs for specific org failures
```

### ⚠️ P2 - High Priority Alerts

#### Bundle Redemption Failures (10+ in 1 hour)

```yaml
Display Name: Bundle Redemptions - High Failure Rate
Condition Type: Log match
Filter: |
  resource.type="cloud_run_revision"
  resource.labels.service_name="bakedbot-prod"
  jsonPayload.message=~"^\[BundleRedemption\]"
  jsonPayload.success=false
Threshold: Count > 10 in 1 hour
Notification Channels:
  - Slack: #alerts-revenue-systems
Documentation: |
  High rate of bundle redemption failures.
  Customers may be unable to use bundle discounts.

  Common causes:
  - Bundle limit reached but not expired
  - Per-customer limit enforcement issues
  - Firestore transaction failures
```

#### Loyalty Points Award Failures (5+ in 1 hour)

```yaml
Display Name: Loyalty Points - Award Failures
Condition Type: Log match
Filter: |
  resource.type="cloud_run_revision"
  resource.labels.service_name="bakedbot-prod"
  jsonPayload.message=~"^\[LoyaltySync\] Failed to award points"
  severity>=ERROR
Threshold: Count > 5 in 1 hour
Notification Channels:
  - Slack: #alerts-revenue-systems
Documentation: |
  Multiple loyalty points award failures.
  Customers not earning points for orders.

  Troubleshooting:
  1. Check customer_activities collection write permissions
  2. Verify Firestore transaction limits not exceeded
  3. Check for missing customer profiles
```

### 📊 P3 - Medium Priority Alerts

#### High Churn Risk Customer Spike

```yaml
Display Name: Churn Prediction - High Risk Spike
Condition Type: Log match
Filter: |
  resource.type="cloud_run_revision"
  resource.labels.service_name="bakedbot-prod"
  jsonPayload.message=~"^\[ChurnPrediction\]"
  jsonPayload.riskLevel="critical"
Threshold: Count > 20 in 1 week
Notification Channels:
  - Slack: #retention-strategy
Documentation: |
  Significant increase in critical churn risk customers.
  Marketing team should review and initiate win-back campaigns.

  Actions:
  1. Query customers collection for churnRiskLevel=critical
  2. Create targeted retention campaign
  3. Review recent product/pricing changes
```

#### Tier Promotions Spike (Potential Data Issue)

```yaml
Display Name: Tier Advancement - Unusual Promotion Rate
Condition Type: Log match
Filter: |
  resource.type="cloud_run_revision"
  resource.labels.service_name="bakedbot-prod"
  jsonPayload.message=~"^\[TierAdvancement\] Tier changed"
  jsonPayload.promoted=true
Threshold: Count > 50 in 1 hour
Notification Channels:
  - Slack: #alerts-revenue-systems
Documentation: |
  Unusually high tier promotion rate.
  May indicate data import or bulk order processing.

  Expected: 5-10 promotions per hour during normal operations.
  If unexpected, review recent data imports or bulk operations.
```

---

## 3. Custom Dashboards (Cloud Monitoring)

### Revenue Systems Health Dashboard

Create a custom dashboard with these widgets:

#### Row 1: Cron Job Health
- **Bundle Transitions Success Rate** (line chart, 24h)
  - Metric: log-based metric counting successful runs
  - Alert threshold: < 95%

- **Churn Prediction Last Run** (scorecard)
  - Metric: timestamp of last successful run
  - Alert threshold: > 8 days ago

#### Row 2: Bundle Deals Metrics
- **Active Bundles by Status** (stacked bar chart)
  - Query: Count bundles by status (scheduled, active, expired)

- **Bundle Redemptions (24h)** (line chart)
  - Metric: Count of successful bundle redemptions
  - Breakdown by bundleId

- **Bundle Redemption Failures (24h)** (line chart)
  - Metric: Count of failed bundle redemptions
  - Color: Red

#### Row 3: Loyalty Program Metrics
- **Points Awarded (24h)** (line chart)
  - Metric: Sum of pointsAwarded from logs
  - Breakdown by isEquityBonus

- **Tier Distribution** (pie chart)
  - Query: Count customers by tier

- **Points Redemptions (7d)** (line chart)
  - Metric: Count of points redemption events
  - Show dollarValue trend

#### Row 4: Churn Prediction Metrics
- **Churn Risk Distribution** (stacked area chart)
  - Breakdown by riskLevel (low/medium/high/critical)

- **High Risk Customers Trend (30d)** (line chart)
  - Metric: Count of customers with churnRiskLevel=high or critical

---

## 4. Slack Notification Setup

### Channel Configuration

Create dedicated Slack channels:
- `#alerts-revenue-systems` - All P1/P2 alerts
- `#retention-strategy` - Churn prediction insights

### Alert Message Format

```javascript
{
  "text": "🚨 Bundle Transitions Cron - Multiple Failures",
  "blocks": [
    {
      "type": "header",
      "text": {
        "type": "plain_text",
        "text": "🚨 Bundle Transitions Cron - Multiple Failures"
      }
    },
    {
      "type": "section",
      "fields": [
        {
          "type": "mrkdwn",
          "text": "*Severity:* P1 - Critical"
        },
        {
          "type": "mrkdwn",
          "text": "*Time:* 2026-02-20 14:30 UTC"
        },
        {
          "type": "mrkdwn",
          "text": "*Failures:* 5 in last 30 minutes"
        },
        {
          "type": "mrkdwn",
          "text": "*Impact:* Bundles not auto-activating"
        }
      ]
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Troubleshooting:*\n1. Check Firestore connectivity\n2. Verify CRON_SECRET\n3. Review logs"
      }
    },
    {
      "type": "actions",
      "elements": [
        {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "View Logs"
          },
          "url": "https://console.cloud.google.com/logs/query?project=studio-567050101-bc6e8"
        },
        {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "Acknowledge"
          },
          "style": "primary"
        }
      ]
    }
  ]
}
```

---

## 5. Log-Based Metrics (for Dashboards)

### Create Custom Metrics

#### Bundle Redemption Success Rate

```yaml
Name: bundle_redemption_success_rate
Type: Counter
Filter: |
  resource.type="cloud_run_revision"
  resource.labels.service_name="bakedbot-prod"
  jsonPayload.message=~"^\[BundleRedemption\]"
Labels:
  - success (from jsonPayload.success)
  - bundleId (from jsonPayload.bundleId)
```

#### Loyalty Points Awarded

```yaml
Name: loyalty_points_awarded_total
Type: Distribution
Filter: |
  resource.type="cloud_run_revision"
  resource.labels.service_name="bakedbot-prod"
  jsonPayload.message=~"^\[LoyaltySync\] Points awarded"
Value Field: jsonPayload.pointsAwarded
Labels:
  - isEquityBonus (from jsonPayload.isEquityCustomer)
```

#### Churn Risk Distribution

```yaml
Name: churn_risk_customers
Type: Counter
Filter: |
  resource.type="cloud_run_revision"
  resource.labels.service_name="bakedbot-prod"
  jsonPayload.message=~"^\[ChurnPrediction\] Customer predicted"
Labels:
  - riskLevel (from jsonPayload.riskLevel)
  - orgId (from jsonPayload.orgId)
```

---

## 6. Health Check Endpoints

### Bundle Systems Health

```bash
# Check bundle transitions cron
curl -X GET "https://bakedbot-prod.web.app/api/cron/bundle-transitions?secret=${CRON_SECRET}"

# Expected: 200 OK with transitions summary
```

### Churn Prediction Health

```bash
# Check churn prediction for specific org
curl -X GET "https://bakedbot-prod.web.app/api/cron/churn-prediction?secret=${CRON_SECRET}&orgId=org_thrive_syracuse"

# Expected: 200 OK with prediction results
```

---

## 7. Weekly Health Report (Automated)

Create a Cloud Function that runs weekly to generate a health report:

```javascript
// Weekly Revenue Systems Health Report
// Runs: Monday 9 AM
// Sends to: #revenue-systems-health

const report = {
  week: getCurrentWeekRange(),
  bundleDeals: {
    activeBundles: await countActiveBundles(),
    redemptions: await countRedemptions(7),
    failureRate: await calculateFailureRate('bundle_redemption', 7)
  },
  loyalty: {
    pointsAwarded: await sumPointsAwarded(7),
    redemptions: await countPointsRedemptions(7),
    tierPromotions: await countTierPromotions(7)
  },
  churn: {
    lastRun: await getLastChurnPredictionRun(),
    highRiskCustomers: await countHighRiskCustomers(),
    criticalRiskCustomers: await countCriticalRiskCustomers()
  }
};

await sendSlackReport('#revenue-systems-health', report);
```

---

**Last updated:** 2026-02-20
**Status:** Ready for production deployment
