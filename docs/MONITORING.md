# Advanced Monitoring & Dashboards

## Overview

Comprehensive monitoring setup for BakedBot using Google Cloud Platform Monitoring (formerly Stackdriver).

## Quick Start

### View Dashboards

1. Navigate to [Google Cloud Console - Monitoring](https://console.cloud.google.com/monitoring/dashboards)
2. Select project: `bakedbot-for-brands`
3. View pre-configured dashboards

### Deploy Dashboard

```bash
# Deploy production dashboard
gcloud monitoring dashboards create --config-from-file=monitoring/dashboards/production-dashboard.json

# List existing dashboards
gcloud monitoring dashboards list

# Update existing dashboard
gcloud monitoring dashboards update DASHBOARD_ID --config-from-file=monitoring/dashboards/production-dashboard.json
```

## Dashboard Components

### 1. Application Performance

**Metrics Tracked:**
- **Error Rate**: HTTP error responses (4xx, 5xx)
- **Response Time (P95)**: 95th percentile latency
- **Request Volume**: Requests per second
- **Success Rate**: Percentage of successful requests

**Thresholds:**
- 🟡 Warning: P95 > 1000ms
- 🔴 Critical: P95 > 3000ms

### 2. Infrastructure Health

**Metrics Tracked:**
- **Memory Usage**: Container memory utilization
- **CPU Usage**: Container CPU utilization
- **Active Instances**: Cloud Run instance count
- **Firestore Operations**: Read/write operations per second

**Thresholds:**
- 🟡 Warning: Memory > 80%, CPU > 70%
- 🔴 Critical: Memory > 90%, CPU > 90%

### 3. Error Tracking

**Metrics Tracked:**
- **Sentry Errors**: Error count from Sentry integration
- **Log-based Errors**: Errors from Cloud Logging
- **Failed API Calls**: Third-party API failures

**Thresholds:**
- 🟡 Warning: > 10 errors/min
- 🔴 Critical: > 50 errors/min

### 4. Business Metrics

**Metrics Tracked:**
- **Orders Created**: Orders per hour
- **Active Users**: Unique users per hour
- **Payment Success Rate**: Successful payment percentage
- **Revenue**: Total revenue (hourly/daily)

**Thresholds:**
- 🟡 Warning: Payment success < 95%
- 🔴 Critical: Payment success < 90%

## Custom Metrics

### Creating Custom Metrics

Custom metrics are logged via the structured logger and automatically appear in GCP Monitoring.

**Example: Log Custom Metric**
```typescript
import { logger } from '@/lib/logger';

// Log order creation
logger.info('Order created', {
  orderId: 'order_123',
  amount: 49.99,
  customMetric: {
    name: 'orders_created',
    value: 1,
    labels: {
      status: 'completed',
      paymentMethod: 'cannpay'
    }
  }
});

// Log user activity
logger.info('User active', {
  userId: 'user_456',
  customMetric: {
    name: 'active_users',
    value: 1
  }
});
```

### Available Custom Metrics

1. **orders_created** - Count of orders
2. **active_users** - Unique active users
3. **payment_success_rate** - Payment success percentage
4. **sentry_errors** - Error count from Sentry
5. **firestore_operations** - Database operation count

## Alerts

### Creating Alerts

Alerts notify you when metrics exceed thresholds.

**Example: High Error Rate Alert**
```bash
# Create alert policy for high error rate
gcloud alpha monitoring policies create \
    --notification-channels=CHANNEL_ID \
    --display-name="High Error Rate" \
    --condition-display-name="Error rate > 5%" \
    --condition-threshold-value=0.05 \
    --condition-threshold-duration=5m \
    --aggregation-alignment-period=60s \
    --if-value=ABOVE
```

### Recommended Alerts

1. **High Error Rate** (> 5% for 5 minutes)
2. **High P95 Latency** (> 3000ms for 5 minutes)
3. **Low Payment Success** (< 90% for 15 minutes)
4. **High Memory Usage** (> 90% for 10 minutes)
5. **Instance Scaling** (> 50 instances)
6. **Firestore Quota** (> 50K operations/minute)

### Notification Channels

Set up notification channels for alerts:

**Email:**
```bash
gcloud alpha monitoring channels create \
    --display-name="DevOps Email" \
    --type=email \
    --channel-labels=email_address=devops@bakedbot.ai
```

**Slack:**
```bash
gcloud alpha monitoring channels create \
    --display-name="DevOps Slack" \
    --type=slack \
    --channel-labels=url=SLACK_WEBHOOK_URL
```

**PagerDuty:**
```bash
gcloud alpha monitoring channels create \
    --display-name="On-Call PagerDuty" \
    --type=pagerduty \
    --channel-labels=service_key=PAGERDUTY_KEY
```

## Log-Based Metrics

### Creating Log-Based Metrics

Log-based metrics extract data from Cloud Logging.

**Example: Track Failed Payments**
```bash
# Create metric for failed payments
gcloud logging metrics create failed_payments \
    --description="Count of failed payment attempts" \
    --log-filter='
        resource.type="cloud_run_revision"
        AND jsonPayload.message="Payment failed"
        AND severity="ERROR"
    ' \
    --value-extractor='EXTRACT(jsonPayload.amount)'
```

### Useful Log Filters

**All Errors:**
```
resource.type="cloud_run_revision"
AND severity>=ERROR
```

**Slow Requests (> 3s):**
```
resource.type="cloud_run_revision"
AND jsonPayload.duration>3000
```

**Payment Events:**
```
resource.type="cloud_run_revision"
AND (
    jsonPayload.message=~"Payment.*"
    OR jsonPayload.event="payment"
)
```

## SLIs and SLOs

### Service Level Indicators (SLIs)

**Availability SLI:**
- **Target:** 99.9% uptime
- **Measurement:** (successful requests) / (total requests)

**Latency SLI:**
- **Target:** 95% of requests < 1000ms
- **Measurement:** P95 response time

**Error Rate SLI:**
- **Target:** < 1% error rate
- **Measurement:** (failed requests) / (total requests)

### Service Level Objectives (SLOs)

Create SLOs in GCP Monitoring:

1. Navigate to **Monitoring > Services**
2. Create new service: "BakedBot Production"
3. Define SLIs (availability, latency, error rate)
4. Set SLO targets (99.9%, 95% < 1s, < 1% errors)
5. Configure error budget alerts

## Cost Optimization

### Monitoring Costs

**Typical Monthly Costs:**
- Metrics ingestion: ~$0.50/MB
- Log ingestion: ~$0.50/GB (first 50GB free)
- Dashboards: Free
- Alerts: Free

**Optimization Tips:**
1. Use sampling for high-volume logs
2. Set log retention policies (30-90 days)
3. Filter unnecessary logs
4. Use log exclusions for verbose logs

**Example: Exclude Debug Logs in Production**
```bash
gcloud logging exclusions create exclude-debug-logs \
    --log-filter='severity=DEBUG' \
    --description="Exclude debug logs in production"
```

## Maintenance

### Regular Tasks

**Weekly:**
- Review error dashboard
- Check SLO compliance
- Verify alert firing correctly

**Monthly:**
- Review and optimize log retention
- Update dashboard thresholds
- Add new business metrics
- Review monitoring costs

**Quarterly:**
- Audit alert policies
- Review SLOs and adjust targets
- Update dashboard layouts
- Clean up unused metrics

## Troubleshooting

### Dashboard Not Showing Data

**Solutions:**
1. Verify metrics are being logged
2. Check metric names match dashboard configuration
3. Ensure time range is set correctly
4. Verify project permissions

### Alerts Not Firing

**Solutions:**
1. Check notification channel is configured
2. Verify alert condition threshold
3. Check metric data is being collected
4. Review alert policy syntax

### High Monitoring Costs

**Solutions:**
1. Enable log sampling
2. Set log exclusions for verbose logs
3. Reduce metric resolution
4. Set shorter log retention

## Integration with Existing Tools

### Sentry Integration

Errors from Sentry are automatically logged and appear in dashboards via the structured logger integration.

### Lighthouse Integration

Performance audit results can be logged as custom metrics:

```typescript
// Log Lighthouse score
logger.info('Lighthouse audit', {
  customMetric: {
    name: 'lighthouse_performance',
    value: performanceScore,
    labels: {
      page: 'homepage'
    }
  }
});
```

### Cloud Scheduler

Monitor backup job execution:

```bash
# Create metric for backup failures
gcloud logging metrics create backup_failures \
    --log-filter='
        resource.type="cloud_scheduler_job"
        AND jsonPayload.jobName="backup-firestore-daily"
        AND severity="ERROR"
    '
```

## Additional Resources

- [GCP Monitoring Documentation](https://cloud.google.com/monitoring/docs)
- [Creating Dashboards](https://cloud.google.com/monitoring/dashboards)
- [Alert Policies](https://cloud.google.com/monitoring/alerts)
- [Log-Based Metrics](https://cloud.google.com/logging/docs/logs-based-metrics)
- [SLOs and Error Budgets](https://cloud.google.com/stackdriver/docs/solutions/slo-monitoring)

## Dashboard Screenshots

Once deployed, dashboards will be available at:
```
https://console.cloud.google.com/monitoring/dashboards?project=bakedbot-for-brands
```

Key dashboards:
1. **Production Overview** - Main application dashboard
2. **Infrastructure** - Resource utilization
3. **Business Metrics** - Orders, revenue, users
4. **Error Tracking** - Errors and failures
