# GCP Dashboard Deployment - Known Issues

## Issue: XyChart Threshold Not Supported

**Problem:** GCP Monitoring dashboards do NOT support `thresholds` in `xyChart` widgets.

**Error Message:**
```
ERROR: (gcloud.monitoring.dashboards.create) Invalid value at 'dashboard.mosaic_layout.tiles[x].widget.xy_chart.thresholds': 
Threshold cannot be specified within a XyChart
```

**Solution:** Remove all `thresholds` arrays from xy Chart widgets. Thresholds are ONLY supported in:
- `scorecard` widgets
- `gauge` widgets  

**Fixed:** Dashboard JSON has been updated to remove thresholds from all XyChart widgets.

## Files to Deploy

After removing thresholds:
```bash
gcloud monitoring dashboards create \
  --config-from-file=monitoring/dashboards/production-dashboard-simple.json
```

## Alternative: Use Scorecard for Thresholds

If you need visual thresholds, convert metrics to scorecard widgets instead of line charts.

Example:
```json
{
  "widget": {
    "scorecard": {
      "time SeriesQuery": {...},
      "thresholds": [
        {"value": 1000, "color": "YELLOW", "direction": "ABOVE"}
      ]
    }
  }
}
```
