# Deploy Monitoring Dashboard to Google Cloud

## Quick Start

```bash
# 1. Authenticate (if not already)
gcloud auth login

# 2. Set project
gcloud config set project bakedbot-for-brands

# 3. Deploy dashboard
cd "c:\Users\admin\BakedBot for Brands\bakedbot-for-brands"
gcloud monitoring dashboards create --config-from-file=monitoring/dashboards/production-dashboard.json

# 4. View dashboards
gcloud monitoring dashboards list

# 5. Access in browser
# https://console.cloud.google.com/monitoring/dashboards?project=bakedbot-for-brands
```

## Verification

After deployment, verify:
- Dashboard appears in GCP Console
- All widgets loading (may show "No data" initially)
- No configuration errors
- Dashboard ID returned

## Troubleshooting

**Error: Permission denied**
- Ensure you have `roles/monitoring.dashboardEditor` role
- Run: `gcloud auth application-default login`

**Error: Invalid configuration**
- Verify JSON syntax in production-dashboard.json
- Check metric filters match your GCP environment

**No data showing**
- Normal for new deployment
- Data will appear as application runs and logs metrics
- Test by visiting your app to generate traffic

## Next Steps

After deploying dashboard:
1. Configure alert policies (see docs/MONITORING.md)
2. Set up notification channels (email/Slack)
3. Create custom log-based metrics
4. Schedule automated backups

See `docs/MONITORING.md` for complete monitoring guide.
